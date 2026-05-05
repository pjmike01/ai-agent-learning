# c04 · QueryEngine

<span class="chapter-badge">c04</span> **QueryEngine** — 主循环的配置层与编排层，`QueryEngine.ts` 是连接 UI 层与底层 `query()` 的桥梁。

<div class="source-path">📁 QueryEngine.ts</div>

## 职责划分

```
main.tsx (UI 层)
    │  调用 submitMessage()
    ▼
QueryEngine          ← 本章重点
    │  配置工具、权限、模型参数
    │  管理会话状态和消息历史
    ▼
query.ts (循环层)   ← 上一章
    │  执行实际的 API 调用和工具编排
    ▼
services/api/claude.ts
```

QueryEngine 本身不执行 AI 推理，它负责：
- 持有并管理 `mutableMessages`（消息历史）
- 组装传给 `query()` 的完整配置
- 向外暴露 `submitMessage()` 生成器接口

## 配置接口

```typescript
// QueryEngine.ts
export type QueryEngineConfig = {
  cwd: string                    // 工作目录
  tools: Tools                   // 可用工具列表
  commands: Command[]            // 斜杠命令
  mcpClients: MCPServerConnection[]  // MCP 服务器连接
  agents: AgentDefinition[]      // 子 Agent 定义
  canUseTool: CanUseToolFn       // 权限决策函数
  getAppState: () => AppState
  setAppState: (f: Updater) => void
  initialMessages?: Message[]    // 会话恢复时的历史消息
  readFileCache: FileStateCache  // 文件读取缓存
  
  // 可选覆盖
  customSystemPrompt?: string    // 完全替换系统 Prompt
  appendSystemPrompt?: string    // 在末尾追加
  userSpecifiedModel?: string    // 用户指定的模型
  fallbackModel?: string         // 备用模型
  thinkingConfig?: ThinkingConfig  // 扩展推理配置
  maxTurns?: number              // 最大循环轮次
  maxBudgetUsd?: number          // 费用上限
  jsonSchema?: Record<string, unknown>  // 结构化输出 schema
  snipReplay?: SnipReplayFn      // 历史截断回放
}
```

## 核心方法：submitMessage()

```typescript
class QueryEngine {
  private mutableMessages: Message[] = []
  private totalUsage: NonNullableUsage = EMPTY_USAGE

  async *submitMessage(
    prompt: string,
    options: SubmitOptions
  ): AsyncGenerator<SDKMessage> {
    // 1. 解析斜杠命令 (processUserInput)
    const processed = processUserInput(prompt, this.commands)
    
    // 2. 将用户消息追加到历史
    this.mutableMessages.push(makeUserMessage(processed))
    
    // 3. 调用底层 query()
    for await (const event of query(processed, {
      ...this.config,
      messages: this.mutableMessages,
    })) {
      // 4. 收集助手消息到历史
      if (event.type === 'assistant') {
        this.mutableMessages.push(event.message)
      }
      yield event  // 向 UI 层透传事件
    }
    
    // 5. 更新用量统计
    this.totalUsage = mergeUsage(this.totalUsage, latestUsage)
  }
}
```

**关键点：** `mutableMessages` 在整个会话期间累积，这正是 Agent 能"记住"对话历史的原因。

## 会话隔离

每个 `QueryEngine` 实例持有独立的消息历史，这意味着：

- **主 REPL 会话** — 一个 QueryEngine 实例，贯穿整个对话
- **子 Agent（AgentTool）** — 创建新的 QueryEngine 实例，消息历史隔离
- **投机执行（Speculative Fork）** — 复制当前状态创建分支实例，用于预计算

```typescript
// 子 Agent 创建新的隔离引擎
const subEngine = new QueryEngine({
  ...parentConfig,
  initialMessages: [],  // 空历史
  maxTurns: subAgentMaxTurns,
})
```

## 会话恢复

通过 `initialMessages` 参数，可以从持久化的消息历史恢复会话：

```typescript
const engine = new QueryEngine({
  ...config,
  initialMessages: await loadSessionMessages(sessionId),
})
```

`bootstrap/state.ts` 的 `restoreCostStateForSession()` 配合恢复费用统计。

## ThinkingConfig（扩展推理）

```typescript
type ThinkingConfig = {
  type: 'enabled'
  budgetTokens: number  // 思考 token 预算（1024~100000）
}
```

启用后，模型在正式回复前会有一段"内心独白"（thinking block），不显示给用户但影响输出质量。

## 结构化输出

当传入 `jsonSchema` 时，QueryEngine 会：

1. 在系统 Prompt 中注入 schema 描述
2. 设置 `stop_sequence` 确保输出符合格式
3. 返回可直接 `JSON.parse()` 的输出

这是 Agent SDK 模式下的常用功能。

## 下一章

QueryEngine 管理的核心数据结构是消息历史。下一章深入 7 种消息类型及其在循环中的流转方式。

→ [c05 · 消息系统](/claude-code/core/message-system)
