# Multi-Agent 架构

## 为什么需要多 Agent

单个 Agent 的局限：

- **上下文有限** — 一个 Agent 的工作记忆无法容纳大规模任务
- **能力单一** — 通用 Agent 在专业领域不够深入
- **速度瓶颈** — 串行执行复杂任务效率低

Multi-Agent 通过**分工协作**解决这些问题。

## 四种协作模式

### 模式一：Supervisor（监督者）

一个 coordinator 分配任务给多个 worker：

```
             ┌──────────────┐
             │  Supervisor   │  分解任务、分配、汇总
             └──────┬───────┘
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌────────┐  ┌────────┐  ┌────────┐
   │Worker 1│  │Worker 2│  │Worker 3│
   │ 研究   │  │ 实现   │  │ 测试   │
   └────────┘  └────────┘  └────────┘
```

**适用场景：** 任务可以明确拆分，worker 之间相对独立。

**Claude Code 的 coordinator 模式就是 Supervisor 模式：**
1. Research 阶段 — 多个 worker 并行研究
2. Synthesis 阶段 — coordinator 汇总
3. Implementation 阶段 — 多个 worker 并行实现
4. Verification 阶段 — coordinator 验证

### 模式二：Pipeline（流水线）

Agent 按顺序处理，每个 Agent 处理一个阶段：

```
输入 → [Planner] → [Coder] → [Reviewer] → [Tester] → 输出
           │           │          │            │
        制定方案    编写代码    审查修改     运行测试
```

**适用场景：** 有明确的阶段性流程，后序依赖前序的输出。

### 模式三：Debate（辩论）

多个 Agent 对同一问题提出不同方案，通过辩论达成共识：

```
     ┌──────────┐    ┌──────────┐
     │  Agent A  │◄──►│  Agent B  │
     │  方案 1   │    │  方案 2   │
     └─────┬────┘    └────┬─────┘
           │              │
           ▼              ▼
         ┌──────────────────┐
         │     Judge         │
         │  评估并选择最优    │
         └──────────────────┘
```

**适用场景：** 需要多角度审视的决策问题。

### 模式四：Swarm（蜂群）

去中心化的 Agent 群体，通过共享环境间接协作：

```
     ┌────┐  ┌────┐  ┌────┐
     │ A1 │  │ A2 │  │ A3 │
     └──┬─┘  └──┬─┘  └──┬─┘
        │       │       │
   ─────┴───────┴───────┴─────
        共享工作区（文件系统）
   ────────────────────────────
```

**适用场景：** 大量同类但独立的任务。

## Agent 间通信

### 消息传递

最常见的方式——Agent 之间通过结构化消息通信：

```typescript
type AgentMessage = {
  from: string       // 发送者 Agent ID
  to: string         // 接收者 Agent ID
  type: 'task' | 'result' | 'question' | 'status'
  content: string
}

// Claude Code 使用 XML 标记：
// <task-notification>
//   <worker-id>worker-2</worker-id>
//   <status>completed</status>
//   <result>...</result>
// </task-notification>
```

### 共享状态

通过共享存储（文件、数据库）间接通信：

```typescript
// Worker 1 写入发现
await scratchpad.write('worker-1', 'api_analysis', '发现 REST API 使用 JWT 认证...')

// Worker 2 读取所有已知信息
const allFindings = await scratchpad.readAll()
```

## 关键设计决策

### 任务分解粒度

```
太粗 → Worker 无法独立完成，需要频繁通信
太细 → 通信开销超过并行收益

经验法则：每个 Worker 的子任务应该能在 5-15 分钟内独立完成
```

### 是否共享上下文

| 方式 | 优点 | 缺点 |
|------|------|------|
| 完全隔离 | 简单、无干扰 | 重复工作 |
| 共享只读 | 减少重复 | 信息过载 |
| 共享读写 | 实时协作 | 冲突风险 |

### 错误处理

```
Worker 失败时：
1. 重试（同一个 Worker 重新执行）
2. 转移（交给另一个 Worker）
3. 降级（Supervisor 接管处理）
4. 跳过（标记为失败，继续其他任务）
```

## 实践建议

1. **先用单 Agent，不够用再加** — Multi-Agent 增加复杂度
2. **Supervisor 模式是最佳起点** — 结构清晰，调试方便
3. **限制通信频率** — 每条消息都有 token 成本
4. **设置超时和预算** — 防止失控的 Agent 无限循环

## 下一章

Multi-Agent 系统更需要评估和可观测性。下一章讲解如何评估 Agent 的表现。

→ [评估与可观测性](/ai-agent/evaluation)
