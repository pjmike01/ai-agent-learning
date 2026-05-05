# 评估与可观测性

## 为什么 Agent 难以评估

传统软件测试是**确定性**的：相同输入 → 相同输出。Agent 是**非确定性**的：相同任务可能走不同路径、调用不同工具、产生不同结果——但都可能是正确的。

```
传统测试：  assertEqual(add(2, 3), 5)  ← 唯一正确答案

Agent 测试：  task = "优化这段代码的性能"
              正确答案 A：改用哈希表  ✅
              正确答案 B：加缓存层   ✅
              正确答案 C：并行化     ✅
              如何评分？
```

## Agent 评估的三个维度

### 维度一：任务完成度

最终结果是否满足需求？

```typescript
type TaskEvaluation = {
  completed: boolean        // 任务是否完成
  correctness: number       // 结果正确性（0-1）
  completeness: number      // 完成完整度（0-1）
}
```

**评估方法：**
- 自动化测试（单元测试通过率）
- LLM-as-Judge（用另一个 LLM 评分）
- 人工审查

### 维度二：过程效率

完成任务的代价是否合理？

```typescript
type EfficiencyMetrics = {
  totalTurns: number        // 总循环轮次
  totalTokens: number       // 总 token 消耗
  totalCostUSD: number      // 总费用
  wallClockTime: number     // 总耗时
  toolCallCount: number     // 工具调用次数
  errorRetryCount: number   // 错误重试次数
}
```

**关键比率：**
- `有效工具调用 / 总工具调用` — 低比率说明 Agent 在"乱试"
- `成本 / 任务复杂度` — 衡量性价比
- `错误恢复成功率` — 衡量鲁棒性

### 维度三：安全性

Agent 是否执行了不当操作？

```typescript
type SafetyMetrics = {
  unauthorizedActions: number  // 未授权操作次数
  sensitiveDataExposure: boolean
  destructiveOperations: string[]  // 破坏性操作列表
  permissionEscalations: number    // 权限提升尝试
}
```

## 主流基准测试

| 基准 | 评估内容 | 指标 |
|------|---------|------|
| **SWE-bench** | 真实 GitHub issue 修复 | 通过率（%） |
| **HumanEval** | 代码生成正确性 | pass@k |
| **GAIA** | 通用 Agent 能力 | 准确率 |
| **WebArena** | Web 交互任务 | 任务成功率 |
| **AgentBench** | 多环境 Agent | 综合评分 |

### SWE-bench 详解

目前最有影响力的编程 Agent 基准：

```
输入：  一个真实的 GitHub issue + 代码仓库
要求：  Agent 自主定位问题 → 修改代码 → 生成 patch
评估：  运行仓库的测试套件，检查修复是否正确

当前 SOTA：
  Claude Code   → ~72%（SWE-bench Verified）
  Devin         → ~53%
  GPT-4 + tools → ~33%
```

## 可观测性设计

生产环境中的 Agent 需要完善的可观测性。

### Trace（链路追踪）

记录每一步的决策和执行：

```typescript
type AgentTrace = {
  traceId: string
  spans: TraceSpan[]
}

type TraceSpan = {
  name: string              // 'llm_call' | 'tool_execution' | 'permission_check'
  startTime: number
  endTime: number
  input: unknown
  output: unknown
  metadata: {
    model?: string
    tokenUsage?: Usage
    toolName?: string
    error?: string
  }
}
```

### Metrics（指标监控）

```typescript
// Claude Code 使用 OpenTelemetry
const meter = metrics.getMeter('agent')

// 关键指标
meter.createCounter('agent_tool_calls_total')
meter.createCounter('agent_cost_usd')
meter.createHistogram('agent_turn_duration_ms')
meter.createGauge('agent_context_utilization')  // 上下文使用率
```

### Logging（日志分级）

```
DEBUG: Tool call input: { command: "ls -la" }
INFO:  Turn 3 completed, 2 tools executed
WARN:  Context at 85% capacity, compact soon
ERROR: Tool execution failed: Permission denied
FATAL: Token budget exhausted, session terminated
```

## 评估框架设计

一个实用的 Agent 评估框架：

```typescript
interface AgentEvaluator {
  // 定义测试用例
  testCases: TestCase[]

  // 运行评估
  evaluate(agent: Agent): Promise<EvaluationReport>

  // 生成报告
  report(results: EvaluationResult[]): Report
}

type TestCase = {
  id: string
  task: string                   // 任务描述
  expectedOutcome: string        // 预期结果（用于 LLM 评分）
  maxTurns: number               // 最大轮次限制
  maxCostUSD: number             // 最大成本限制
  validation: (result) => boolean // 自动化验证函数
}
```

## 持续评估实践

```
代码变更
   ↓
CI 触发 Agent 评估套件
   ↓
运行 N 个标准测试用例
   ↓
收集指标：完成率、成本、耗时
   ↓
对比 baseline → 是否有回归？
   ↓
生成报告 + 告警
```

## 小结

评估是 Agent 工程化的基石。没有评估，就无法迭代改进。关键是建立**多维度、可量化、可持续**的评估体系，同时用可观测性工具保障生产环境的可控性。

---

恭喜完成 AI Agent 架构模块的全部 6 章。你现在可以：

- 前往 [Claude Code 源码分析](/claude-code/) 看这些模式如何在真实产品中落地
- 查看 [学习资料](/resources/) 获取更多深度资源
