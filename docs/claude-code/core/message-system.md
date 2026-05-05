# c05 · 消息系统

<span class="chapter-badge">c05</span> **消息系统** — 消息是 Agent 循环的"血液"，理解 7 种消息类型和它们的流转方式。

<div class="source-path">📁 types/message.ts</div>

## 消息是什么

Claude API 采用多轮对话格式——每次 API 调用都传入完整的消息历史。Claude Code 在此基础上扩展了更丰富的消息类型，以支持工具执行、进度跟踪、记忆注入等功能。

## 7 种消息类型

```typescript
type Message =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | AttachmentMessage
  | ProgressMessage
  | TombstoneMessage
  | ToolUseSummaryMessage
```

### 1. UserMessage

用户输入，可包含附件：

```typescript
type UserMessage = {
  type: 'user'
  message: {
    role: 'user'
    content: string | ContentBlock[]
  }
  uuid: string
  // content 可以是：
  // - 纯文本
  // - 工具执行结果（tool_result blocks）
  // - 图片附件
}
```

**工具结果也是 UserMessage** — 这是 Claude API 的约定。工具执行完毕后，结果以 `tool_result` 块的形式附在 UserMessage 里发给模型。

### 2. AssistantMessage

模型的回复，包含文本和/或工具调用请求：

```typescript
type AssistantMessage = {
  type: 'assistant'
  message: {
    role: 'assistant'
    content: (TextBlock | ToolUseBlock | ThinkingBlock)[]
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence'
    usage: Usage  // 本轮 token 用量
  }
  uuid: string
}

type ToolUseBlock = {
  type: 'tool_use'
  id: string          // 工具调用 ID（与 tool_result 配对）
  name: string        // 工具名称
  input: unknown      // Zod 校验前的原始输入
}
```

### 3. SystemMessage

系统级消息，不发送给模型，用于 UI 展示：

```typescript
type SystemMessage = {
  type: 'system'
  subtype:
    | 'compact_boundary'   // 压缩边界标记
    | 'api_error'          // API 错误
    | 'local_command'      // 斜杠命令执行结果
    | 'interrupt'          // 用户中断
  content: string
  uuid: string
}
```

### 4. AttachmentMessage

结构化附件，用于注入非对话内容：

```typescript
type AttachmentMessage = {
  type: 'attachment'
  subtype:
    | 'structured_output'  // 结构化 JSON 输出
    | 'max_turns'          // 轮次限制通知
    | 'queued_command'     // 排队等待的命令
  content: unknown
  uuid: string
}
```

### 5. ProgressMessage

工具执行进度，实时流给 UI：

```typescript
type ProgressMessage = {
  type: 'progress'
  toolUseID: string    // 对应哪个工具调用
  content: {
    type: 'text'
    text: string       // 进度描述文本
  }
  uuid: string
}
```

ProgressMessage **不进入消息历史**，只用于渲染实时进度。

### 6. TombstoneMessage

长消息的占位符，用于 UI 折叠：

```typescript
type TombstoneMessage = {
  type: 'tombstone'
  uuid: string   // 指向被折叠消息的 uuid
}
```

当某个消息（如超长的工具输出）被折叠时，原消息不删除，用 TombstoneMessage 替代显示。

### 7. ToolUseSummaryMessage

压缩后的工具调用摘要：

```typescript
type ToolUseSummaryMessage = {
  type: 'tool_use_summary'
  toolUses: {
    name: string
    inputSummary: string
    resultSummary: string
  }[]
  uuid: string
}
```

上下文压缩后，多个工具调用被聚合成一条摘要消息。

## 消息流转状态机

```
用户输入
   │
   ▼ UserMessage（role: user, content: text）
   │
   │  [发送给 API]
   ▼
AssistantMessage（role: assistant, content: [text, tool_use, ...]）
   │
   ├── stop_reason: end_turn
   │       └─► 循环结束，返回给用户
   │
   └── stop_reason: tool_use
           │
           ▼  [执行工具，同时 yield ProgressMessage]
           │
           ▼ UserMessage（role: user, content: [tool_result, ...]）
           │
           │  [再次发送给 API，循环继续]
           ▼
       AssistantMessage（...）
```

## ToolResult 的结构

工具结果是 Claude API 约定的格式：

```typescript
type ToolResultBlock = {
  type: 'tool_result'
  tool_use_id: string  // 与请求的 ToolUseBlock.id 配对
  content: string | ContentBlock[]
  is_error?: boolean
}
```

**ID 配对机制** 确保即使多个工具并发执行，结果也能正确匹配到对应的请求。

## 大输出的处理

工具输出可能非常大（如 `cat` 一个大文件）。Claude Code 通过 `toolResultStorage` 存储超长输出，消息中只保留摘要：

```
实际工具输出（可能 100KB）
        │
        ▼ toolResultStorage.store(id, fullContent)
        │
消息历史中只存：
  "Output too large, stored with id: xxx. First 2000 chars: ..."
```

这防止了消息历史因单次工具输出而膨胀到超过 Token 限制。

## 下一章

消息系统是工具执行的"管道"。下一章进入工具系统，看 Claude Code 如何定义和注册 40+ 个工具。

→ [c06 · Tool 类型系统](/claude-code/tools/tool-system)
