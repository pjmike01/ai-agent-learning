# c03 · Agent 主循环

<span class="chapter-badge">c03</span> **Agent 主循环** — `query.ts` 是 Claude Code 的心脏，理解这个异步生成器就理解了 Agent 的本质。

<div class="source-path">📁 query.ts</div>

## 核心思想

> 没有循环，就没有 Agent。

语言模型本身只能"生成文本"——它不能自己执行工具，也不能观察执行结果。Agent 主循环做的事情只有一件：

```
用户输入
   ↓
模型生成（含工具调用请求）
   ↓
执行工具，获得真实结果
   ↓
把结果塞回消息历史
   ↓
再次调用模型
   ↓
... 直到模型不再调用工具
   ↓
返回最终响应
```

## 函数签名

```typescript
// query.ts
async function* query(
  prompt: string,
  options: QueryOptions
): AsyncGenerator<StreamEvent | Message> {
  yield* queryLoop(prompt, options)
}
```

`query()` 是一个**异步生成器**（AsyncGenerator）。它不返回一个最终值，而是边执行边 `yield` 事件：工具执行进度、模型输出片段、错误消息……调用方可以实时渲染这些事件，而不必等待整个循环结束。

## 5步执行周期

每一次循环迭代（一个 "turn"）经历以下步骤：

```
┌─────────────────────────────────────────────────────────┐
│                      一次 Turn                           │
│                                                          │
│  Step 1: Pre-query Hooks                                 │
│    └─ 技能预取 (skillPrefetch)                           │
│    └─ 记忆附加 (startRelevantMemoryPrefetch)             │
│                                                          │
│  Step 2: 系统 Prompt 组装                                │
│    └─ 静态部分（可缓存）                                  │
│    └─ 动态部分（CLAUDE.md、git status）                  │
│                                                          │
│  Step 3: API 调用（流式）                                 │
│    └─ yield StreamEvent（逐 token 输出）                  │
│    └─ 检测工具调用块                                      │
│                                                          │
│  Step 4: 工具编排执行                                     │
│    └─ runTools() → 并发/串行批次                         │
│    └─ 每个工具 yield 进度事件                            │
│                                                          │
│  Step 5: 上下文检查                                      │
│    └─ 自动压缩（auto compact）                           │
│    └─ Token 预算检查                                     │
│    └─ 决定：继续循环 or 终止                             │
└─────────────────────────────────────────────────────────┘
```

## 终止条件

循环在以下情况下终止：

| 条件 | 说明 |
|------|------|
| `stop_reason: end_turn` | 模型正常完成输出 |
| `stop_reason: stop_sequence` | 遇到停止序列 |
| `stop_reason: max_tokens` | 输出达到最大 token 限制 |
| 超过最大轮次 | `maxTurns` 配置项控制 |
| Token 预算耗尽 | `maxBudgetUsd` 限制 |
| 工具执行失败 | 不可恢复的错误 |
| 用户中断 | `AbortController` 信号 |

## 关键状态机

循环内部维护以下可变状态：

```typescript
// query.ts 内部（简化）
let messages: Message[] = initialMessages
let turnCount = 0
let totalUsage: Usage = EMPTY_USAGE
let autoCompactTracking: AutoCompactTracking = initial
let recoveryAttempts = 0  // max_tokens 恢复计数

while (true) {
  // Step 1: 前置 hooks
  await runPreQueryHooks(messages)

  // Step 2: 构建 API 请求
  const { systemPrompt } = await fetchSystemPromptParts(options)
  
  // Step 3: 流式 API 调用
  for await (const event of callAPI(messages, systemPrompt, tools)) {
    yield event  // 实时流给调用方
    if (event.type === 'tool_use') {
      pendingToolCalls.push(event)
    }
  }

  // Step 4: 工具执行
  if (pendingToolCalls.length > 0) {
    const results = await runTools(pendingToolCalls, context)
    messages = [...messages, assistantMsg, ...toolResults]
    yield* results  // 工具进度事件
  } else {
    break  // 没有工具调用 → 终止
  }

  // Step 5: 压缩检查
  if (shouldCompact(totalUsage)) {
    await compact(messages)
  }

  turnCount++
  if (turnCount >= maxTurns) break
}
```

## 流式事件类型

`query()` 产出的事件分为以下几类：

```typescript
type StreamEvent =
  | { type: 'system_init'; ... }          // 会话初始化信息
  | { type: 'assistant'; message: ... }   // 模型输出（含工具调用块）
  | { type: 'user'; message: ... }        // 工具结果消息
  | { type: 'progress'; ... }             // 工具执行进度
  | { type: 'attachment'; ... }           // 记忆/结构化附件
  | { type: 'result'; ... }               // 最终结果摘要
```

## 为什么用异步生成器？

传统做法是等循环结束后返回完整响应。异步生成器的优势：

1. **实时渲染** — UI 可以在工具还在执行时就开始显示已完成的部分
2. **背压控制** — 消费方处理不过来时，生产方自动暂停
3. **中断友好** — `AbortController` 信号可以在任意 `yield` 点停止循环
4. **内存友好** — 不需要在内存中积累所有事件后再处理

## 上下文压缩（Auto Compact）

当消息历史超过 Token 限制时，循环会触发压缩：

```
压缩策略（优先级递减）：
1. auto      — 保留最近 N 轮，摘要旧内容
2. reactive  — 检测到接近限制时触发（REACTIVE_COMPACT 特性开关）
3. snip      — 在标记边界截断历史
```

压缩发生后，循环继续——对模型而言像是一次新对话，但 Claude Code 注入了上下文摘要。

## 下一章

了解了循环的结构，下一章看 QueryEngine——它是循环的**配置层和编排层**。

→ [c04 · QueryEngine](/claude-code/core/query-engine)
