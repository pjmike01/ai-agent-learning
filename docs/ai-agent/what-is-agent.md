# 什么是 AI Agent

## 从 Chatbot 到 Agent

大语言模型（LLM）本质上是一个**文本补全函数**：给定上文，生成下文。Chatbot 在此基础上加了多轮对话，但仍然只能"说"，不能"做"。

**Agent 的本质区别在于行动能力**：

```
Chatbot：用户提问 → 模型回答 → 结束

Agent：  用户提问 → 模型思考 → 执行工具 → 观察结果
                         ↑                      │
                         └──────────────────────┘
                           持续循环，直到任务完成
```

## Agent 的定义

一个 AI Agent 需要具备三个核心能力：

```
          ┌─────────────┐
          │   感知       │  接收用户指令、观察环境、读取工具结果
          │ Perception   │
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │   推理       │  理解意图、制定计划、决策下一步行动
          │ Reasoning    │
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │   行动       │  调用工具、修改文件、执行命令、与 API 交互
          │  Action      │
          └─────────────┘
```

**缺少任何一个都不是完整的 Agent：**
- 没有感知 → 无法理解任务和结果
- 没有推理 → 只能执行预设流程（传统自动化）
- 没有行动 → 只能说不能做（Chatbot）

## Agent vs 传统自动化

| 维度 | 传统自动化 | AI Agent |
|------|-----------|----------|
| 决策方式 | 预设规则（if-else） | LLM 推理 |
| 适应性 | 固定流程 | 动态调整 |
| 错误处理 | 预定义的异常分支 | 自主诊断和重试 |
| 扩展性 | 需要代码修改 | 添加工具即可 |
| 不确定性 | 不容忍 | 可以处理模糊指令 |

## Agent 的核心循环

几乎所有 Agent 框架都遵循同一个核心模式：

```typescript
async function agentLoop(task: string): Promise<string> {
  const messages = [{ role: 'user', content: task }]

  while (true) {
    // 1. 调用 LLM
    const response = await llm.chat(messages, { tools })

    // 2. 检查是否需要执行工具
    if (response.toolCalls.length === 0) {
      return response.text  // 没有工具调用 → 任务完成
    }

    // 3. 执行工具
    for (const call of response.toolCalls) {
      const result = await executeTool(call.name, call.args)
      messages.push({ role: 'tool', content: result })
    }

    // 4. 将工具结果反馈给 LLM，继续循环
    messages.push({ role: 'assistant', content: response })
  }
}
```

这个循环看似简单，但**所有复杂性都在细节中**：
- 如何定义工具？→ [Tool Use 设计](/ai-agent/tool-use)
- 何时停止循环？→ 终止条件设计
- 历史太长怎么办？→ [记忆与上下文管理](/ai-agent/memory-context)
- 一个 Agent 不够用？→ [Multi-Agent 架构](/ai-agent/multi-agent)

## Agent 的能力边界

Agent 不是万能的。理解边界才能设计好系统：

**适合 Agent 的任务：**
- 多步骤、需要中间观察和调整的任务
- 需要与外部系统交互（API、文件、数据库）
- 指令模糊但目标明确（如"优化这段代码的性能"）

**不适合 Agent 的任务：**
- 一步即可完成的简单查询
- 对延迟极度敏感的实时系统
- 需要 100% 确定性的关键操作（金融交易等）

## 当前主流 Agent 框架

| 框架 | 特点 | 适用场景 |
|------|------|---------|
| Claude Code | 全功能编程 Agent，CLI 原生 | 代码开发 |
| LangGraph | 图结构工作流，状态机模式 | 复杂流程编排 |
| CrewAI | 角色扮演式多 Agent | 多角色协作任务 |
| AutoGen | 对话式多 Agent | 研究与实验 |
| Semantic Kernel | .NET/Python，企业级 | 企业应用集成 |

## 下一章

理解了 Agent 的定义后，下一章深入最重要的设计模式——ReAct，它是当前 Agent 的主流实现范式。

→ [ReAct 模式](/ai-agent/react-pattern)
