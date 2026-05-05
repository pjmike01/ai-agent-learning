# c14 · 成本追踪

<span class="chapter-badge">c14</span> **成本追踪** — Claude Code 如何精确追踪每次 API 调用的 Token 用量和美元成本。

<div class="source-path">📁 cost-tracker.ts · bootstrap/state.ts</div>

## ModelUsage 结构

每个模型维护独立的用量统计：

```typescript
// cost-tracker.ts
type ModelUsage = {
  inputTokens: number             // 输入 Token 数
  outputTokens: number            // 输出 Token 数
  cacheReadInputTokens: number    // 从缓存读取的 Token（约 1/10 价格）
  cacheCreationInputTokens: number // 创建缓存的 Token（约 1.25x 价格）
  webSearchRequests: number       // 网页搜索请求次数
  costUSD: number                 // 本模型的总费用（美元）
  contextWindow: number           // 最大上下文窗口大小
  maxOutputTokens: number         // 最大输出 Token 数
}
```

**缓存 Token 的特殊处理** — 缓存读取和缓存创建的定价不同，因此分别统计：

```
正常输入 Token：$3 / 1M tokens（Sonnet 为例）
缓存创建 Token：$3.75 / 1M tokens（贵 25%，一次性成本）
缓存读取 Token：$0.30 / 1M tokens（便宜 90%！）
```

## 成本计算

```typescript
// utils/modelCost.ts
function calculateCost(usage: BetaUsage, model: string): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0

  return (
    (usage.input_tokens * pricing.inputPerToken) +
    (usage.output_tokens * pricing.outputPerToken) +
    ((usage.cache_read_input_tokens ?? 0) * pricing.cacheReadPerToken) +
    ((usage.cache_creation_input_tokens ?? 0) * pricing.cacheWritePerToken)
  )
}
```

所有价格与 Anthropic 官网公开价格完全一致。

## 全局累积

```typescript
// cost-tracker.ts
let totalCostUSD = 0
let modelUsage: { [model: string]: ModelUsage } = {}
let totalAPIDuration = 0
let totalToolDuration = 0

function addToTotalSessionCost(
  cost: number,
  usage: BetaUsage,
  model: string,
): number {
  totalCostUSD += cost

  // 分模型统计
  if (!modelUsage[model]) {
    modelUsage[model] = emptyModelUsage()
  }
  modelUsage[model].costUSD += cost
  modelUsage[model].inputTokens += usage.input_tokens
  modelUsage[model].outputTokens += usage.output_tokens
  // ... 其他字段

  // OpenTelemetry 指标上报
  costCounter?.add(cost, { model })
  tokenCounter?.add(usage.input_tokens, { type: 'input', model })
  tokenCounter?.add(usage.output_tokens, { type: 'output', model })

  return totalCostUSD
}
```

## 会话结束时展示

```typescript
function formatTotalCost(): string {
  const lines = [
    `总费用：$${totalCostUSD.toFixed(4)}`,
    `API 时间：${formatDuration(totalAPIDuration)}`,
    `工具时间：${formatDuration(totalToolDuration)}`,
    `代码变更：+${totalLinesAdded} -${totalLinesRemoved}`,
  ]

  // 多模型时展示分模型明细
  if (Object.keys(modelUsage).length > 1) {
    for (const [model, usage] of Object.entries(modelUsage)) {
      lines.push(`  ${model}: $${usage.costUSD.toFixed(4)}`)
    }
  }

  return lines.join('\n')
}
```

## 持久化与恢复

成本状态在会话结束时保存到项目配置，下次恢复会话时可以继续累计：

```typescript
function saveCurrentSessionCosts(): void {
  saveToProjectConfig({
    lastCost: totalCostUSD,
    lastAPIDuration: totalAPIDuration,
    lastToolDuration: totalToolDuration,
    lastLinesAdded: totalLinesAdded,
    lastLinesRemoved: totalLinesRemoved,
    lastModelUsage: modelUsage,
    lastSessionId: currentSessionId,  // 用于匹配恢复
  })
}

function restoreCostStateForSession(sessionId: string): boolean {
  const saved = loadFromProjectConfig()
  // 只有 sessionId 匹配才恢复（避免跨会话污染）
  if (saved?.lastSessionId !== sessionId) return false
  
  totalCostUSD = saved.lastCost
  modelUsage = saved.lastModelUsage
  // ...
  return true
}
```

## OpenTelemetry 集成

Claude Code 内置 OpenTelemetry 支持，可以将成本数据上报到可观测性平台：

```typescript
// bootstrap/state.ts
const meter = metrics.getMeter('claude-code')

// 成本计数器（可接入 Prometheus/Grafana）
const costCounter = meter.createCounter('claude_code_cost_usd', {
  description: 'Total API cost in USD',
})

// Token 计数器
const tokenCounter = meter.createCounter('claude_code_tokens', {
  description: 'Token usage by type',
})

// 会话计数器
const sessionCounter = meter.createCounter('claude_code_sessions', {
  description: 'Session events',
})
```

这使得企业用户可以在现有监控系统中追踪 AI 使用成本。

## 代码变更统计

除了 Token 成本，Claude Code 还追踪代码变更：

```typescript
// 每次文件写入/编辑后更新
function trackFileChange(before: string, after: string): void {
  const diff = computeDiff(before, after)
  totalLinesAdded += diff.additions
  totalLinesRemoved += diff.deletions
}
```

会话结束时显示 `+245 -128` 这样的 git 风格统计，让用户了解本次会话的代码产出。

## 下一章

基础模块全部介绍完毕。下一模块进入高级特性——多 Agent 协调，这是 Claude Code 处理复杂任务的秘密武器。

→ [c15 · 多 Agent 协调](/claude-code/advanced/multi-agent)
