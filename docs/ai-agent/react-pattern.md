# ReAct 模式

## 什么是 ReAct

ReAct（Reasoning + Acting）是 2022 年提出的 Agent 设计范式，核心思想是**让 LLM 交替进行推理和行动**，而不是把所有思考做完再一次性执行。

```
传统方式：  思考 → 思考 → 思考 → 行动 → 行动 → 行动

ReAct：    思考 → 行动 → 观察 → 思考 → 行动 → 观察 → ...
```

## 三步循环：Thought → Action → Observation

```
┌────────────────────────────────────────────┐
│  Thought（推理）                            │
│  "用户要我修复这个 bug，先看看错误日志"      │
└─────────────────┬──────────────────────────┘
                  │
┌─────────────────▼──────────────────────────┐
│  Action（行动）                             │
│  调用 Bash 工具：cat /var/log/app.log       │
└─────────────────┬──────────────────────────┘
                  │
┌─────────────────▼──────────────────────────┐
│  Observation（观察）                        │
│  "Error: Cannot read property 'id' of null" │
└─────────────────┬──────────────────────────┘
                  │
┌─────────────────▼──────────────────────────┐
│  Thought（推理）                            │
│  "是空指针错误，需要找到访问 .id 的代码"     │
└─────────────────┬──────────────────────────┘
                  │
                  ▼ ... 继续循环
```

## 为什么 ReAct 有效

### 1. 减少幻觉

纯推理模式下，LLM 容易在没有事实依据的情况下编造答案。ReAct 的 Observation 步骤**提供了真实的外部反馈**，校正模型的推理方向。

### 2. 分步决策

不需要一次性规划所有步骤。每一步都基于**最新的观察结果**决定下一步，天然适应不确定环境。

### 3. 可解释性

Thought 步骤暴露了模型的推理过程，便于调试和审查。

## 最小实现

```typescript
type Message = { role: string; content: string }

async function react(task: string, tools: Tool[]): Promise<string> {
  const messages: Message[] = [
    {
      role: 'system',
      content: `你是一个 AI 助手。面对任务时，按以下模式工作：
        1. Thought: 分析当前情况，决定下一步
        2. Action: 调用合适的工具
        3. Observation: 观察工具返回的结果
        重复以上步骤直到任务完成。`
    },
    { role: 'user', content: task }
  ]

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Thought + Action（模型同时产出推理和工具调用）
    const response = await llm.chat(messages, { tools })

    if (response.stopReason === 'end_turn') {
      return response.text  // 任务完成
    }

    // 执行 Action，获取 Observation
    for (const toolCall of response.toolCalls) {
      const observation = await executeTool(toolCall)
      messages.push({
        role: 'tool',
        content: observation,
        toolCallId: toolCall.id
      })
    }
  }

  return '达到最大轮次限制'
}
```

## ReAct 在 Claude Code 中的实现

Claude Code 的 `query.ts` 就是一个工程级的 ReAct 实现：

| ReAct 概念 | Claude Code 实现 |
|-----------|-----------------|
| Thought | Claude 的文本输出 + thinking block |
| Action | ToolUseBlock（Bash/Read/Edit 等） |
| Observation | ToolResult（工具执行结果） |
| 循环控制 | `stop_reason` + `maxTurns` + token 预算 |

详见 [c03 · Agent 主循环](/claude-code/core/agent-loop)

## ReAct 的局限性

### 顺序执行瓶颈

ReAct 是严格顺序的——必须等前一个 Action 完成才能决定下一步。如果多个 Action 相互独立，无法并行。

**解决方案：** 批量工具调用（Claude Code 的 toolOrchestration 策略）

### 长任务的上下文膨胀

每个 Observation 都进入消息历史，长任务会超出上下文窗口。

**解决方案：** 上下文压缩（Claude Code 的 auto compact）、摘要替换

### 规划能力有限

ReAct 是**反应式**的——看到什么反应什么。对于需要全局规划的任务，效果不佳。

**解决方案：** Plan-then-Execute 模式（先规划再执行）

## ReAct 的变体

| 变体 | 特点 |
|------|------|
| **Plan-and-Solve** | 先生成完整计划，再逐步执行 |
| **Reflexion** | 失败后进行自我反思，调整策略 |
| **LATS** | 结合树搜索，探索多条执行路径 |
| **Tool-augmented ReAct** | 动态发现和加载工具 |

## 下一章

ReAct 的 Action 依赖工具。下一章深入 Tool Use 的设计原则——如何让 LLM 正确、高效地使用工具。

→ [Tool Use 设计](/ai-agent/tool-use)
