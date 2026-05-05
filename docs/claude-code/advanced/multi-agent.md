# c15 · 多 Agent 协调

<span class="chapter-badge">c15</span> **多 Agent 协调** — coordinator 模式将复杂任务拆解给多个并行 Agent，大幅提升处理效率。

<div class="source-path">📁 coordinator/ · Task.ts · tools/AgentTool/</div>

## 两种多 Agent 模式

Claude Code 有两种多 Agent 机制：

| 模式 | 机制 | 适用场景 |
|------|------|---------|
| **AgentTool** | 内联子代理（同进程） | 子任务执行，有限并行 |
| **coordinator 模式** | 完整多代理编排系统 | 大规模并行研究/实现任务 |

## coordinator 四阶段流程

```
Phase 1: Research（研究）
  ┌─ Worker 1 ─────────────────────────────┐
  │ 负责研究 API 设计                       │
  └────────────────────────────────────────┘
  ┌─ Worker 2 ─────────────────────────────┐
  │ 负责分析现有实现                        │
  └────────────────────────────────────────┘
  ┌─ Worker 3 ─────────────────────────────┐
  │ 负责梳理测试用例                        │
  └────────────────────────────────────────┘
         ↓（所有 Worker 并发执行）

Phase 2: Synthesis（综合）
  ┌─ Coordinator ──────────────────────────┐
  │ 汇总所有 Worker 的研究结果              │
  │ 制定整体实现方案                        │
  └────────────────────────────────────────┘

Phase 3: Implementation（实现）
  ┌─ Worker 1 ─────────────────────────────┐
  │ 实现模块 A                             │
  └────────────────────────────────────────┘
  ┌─ Worker 2 ─────────────────────────────┐
  │ 实现模块 B                             │
  └────────────────────────────────────────┘
         ↓（并发实现，coordinator 监控进度）

Phase 4: Verification（验证）
  ┌─ Coordinator ──────────────────────────┐
  │ 集成测试                               │
  │ 回归验证                               │
  └────────────────────────────────────────┘
```

## Worker 通信协议

Worker 之间通过 XML 标记消息传递状态：

```xml
<!-- Worker 向 Coordinator 报告进度 -->
<task-notification>
  <worker-id>worker-2</worker-id>
  <status>completed</status>
  <result>已完成 UserService 模块实现，新增 3 个测试用例</result>
</task-notification>

<!-- Coordinator 向 Worker 分配任务 -->
<task-assignment>
  <worker-id>worker-1</worker-id>
  <task>分析 auth 模块的现有 API，重点关注 JWT 处理逻辑</task>
</task-assignment>
```

## 共享便笺本

当 `tengu_scratch` 特性开关启用时，Worker 可以访问共享目录进行知识共享：

```typescript
// coordinator/scratchpad.ts
class SharedScratchpad {
  private dir: string  // .claude/coordinator-scratch/

  async write(workerId: string, key: string, value: string): Promise<void> {
    await fs.writeFile(
      path.join(this.dir, `${workerId}_${key}.md`),
      value
    )
  }

  async readAll(): Promise<Map<string, string>> {
    // 返回所有 Worker 写入的知识片段
  }
}
```

这允许 Worker 1 发现的信息立即对 Worker 2 可见，避免重复工作。

## Task.ts：后台子代理

`Task` 是比 `AgentTool` 更轻量的子代理：

```typescript
// Task.ts
class Task {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  error?: string
  
  private engine: QueryEngine  // 隔离的 QueryEngine 实例

  async run(prompt: string): Promise<void> {
    this.status = 'running'
    try {
      for await (const event of this.engine.submitMessage(prompt)) {
        if (event.type === 'result') {
          this.result = event.result
        }
      }
      this.status = 'completed'
    } catch (e) {
      this.status = 'failed'
      this.error = e.message
    }
  }
}
```

**Task vs AgentTool 的区别：**
- AgentTool：同步等待子任务完成，结果直接作为工具返回值
- Task：异步后台运行，主会话可以继续做其他事，稍后查询结果

## Agent 颜色分配

在多 Agent 模式下，每个 Worker 有独立颜色，便于在终端中区分：

```typescript
// coordinator/colors.ts
const AGENT_COLORS = [
  'cyan', 'magenta', 'yellow', 'blue', 'green', 'red',
]

function assignColor(agentIndex: number): string {
  return AGENT_COLORS[agentIndex % AGENT_COLORS.length]
}
```

终端输出中，每个 Agent 的输出用不同颜色前缀显示，一目了然。

## 投机执行（Speculative Execution）

coordinator 模式的一个高级特性是**投机执行**：在 Coordinator 还没做出最终决策时，提前启动可能需要的 Worker：

```typescript
// 创建投机分支（Fork）
const speculativeFork = forkAppState(currentState)
const speculativeEngine = new QueryEngine({
  ...config,
  initialMessages: speculativeFork.messages,
  // 隔离的状态，不影响主会话
})
```

如果预测正确，Worker 的结果可以直接复用；如果预测错误，丢弃分支即可。

## 下一章

多 Agent 系统需要统一的状态管理。下一章看 AppStateStore 如何支撑这一切。

→ [c16 · 状态管理](/claude-code/advanced/state-management)
