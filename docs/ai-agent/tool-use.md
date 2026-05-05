# Tool Use 设计

## 工具是 Agent 的手脚

LLM 能推理但不能行动。工具（Tool）是 Agent 与外部世界交互的桥梁——没有工具，Agent 就是一个只会说的 Chatbot。

## 工具定义的三要素

每个工具需要回答三个问题：

```
1. 我是谁？   → name + description
2. 我需要什么？ → input schema（参数定义）
3. 我做什么？   → execute function（执行逻辑）
```

```typescript
type Tool = {
  name: string                    // 工具名（全局唯一）
  description: string             // 功能描述（LLM 据此决定何时调用）
  inputSchema: JSONSchema         // 参数定义（LLM 据此生成参数）
  execute: (input) => Promise<string>  // 执行逻辑
}
```

## Schema 设计原则

好的 Schema 决定 LLM 能否正确调用工具。

### 原则一：参数名自解释

```typescript
// ❌ 差：LLM 不知道 q 是什么
{ q: string, n: number }

// ✅ 好：参数名即文档
{ query: string, maxResults: number }
```

### 原则二：用 description 消除歧义

```typescript
{
  command: {
    type: 'string',
    description: '要执行的 bash 命令。避免交互式命令（如 vim）。'
  },
  timeout: {
    type: 'number',
    description: '超时时间（毫秒），默认 120000。最大 600000。'
  }
}
```

### 原则三：约束可选参数

```typescript
// ❌ 差：过多可选参数让 LLM 困惑
{ file: string, offset?: number, limit?: number, 
  encoding?: string, binary?: boolean, ... }

// ✅ 好：只暴露高频使用的参数
{ file_path: string, offset?: number, limit?: number }
```

### 原则四：用 enum 限制取值

```typescript
{
  action: {
    type: 'string',
    enum: ['read', 'write', 'delete'],
    description: '要执行的操作类型'
  }
}
```

## 工具分类策略

按**副作用**和**风险等级**对工具分类，是权限和并发设计的基础：

| 类别 | 特征 | 示例 | 并发安全 |
|------|------|------|---------|
| 只读工具 | 不改变系统状态 | 文件读取、搜索、ls | ✅ |
| 写入工具 | 改变文件/系统 | 文件编辑、写入 | ❌ |
| 执行工具 | 运行外部命令 | Shell、API 调用 | 取决于命令 |
| 通信工具 | 与外部服务交互 | 发邮件、Slack 消息 | ✅ 但需确认 |

## 错误处理策略

工具执行必然会遇到错误。设计良好的错误返回能让 LLM 自主恢复：

```typescript
// ❌ 差：通用错误信息
return { error: 'Operation failed' }

// ✅ 好：具体原因 + 修复建议
return {
  error: '文件 /src/app.ts 不存在。',
  suggestion: '当前目录下的 TypeScript 文件有：index.ts, main.ts, utils.ts'
}
```

**关键原则：** 错误信息应该足够让 LLM 自主决定下一步——是重试、换参数，还是放弃。

## 工具数量管理

工具太多会导致 LLM 选择困难：

| 工具数量 | 影响 | 策略 |
|---------|------|------|
| 1-10 | 最佳 | 直接全部暴露 |
| 10-30 | 可接受 | 按场景分组 |
| 30-100 | 需要管理 | 延迟加载 + 搜索发现 |
| 100+ | 困难 | 分层代理 |

**延迟加载模式**（Claude Code 的做法）：

```
第一轮：只告诉 LLM 工具名列表（不含参数 schema）
  ↓
LLM 调用 ToolSearch("搜索关键词")
  ↓
系统返回匹配工具的完整 schema
  ↓
LLM 调用实际工具
```

## 工具与 API 的关系

Claude API 的 Tool Use 协议：

```json
// 请求：定义可用工具
{
  "tools": [{
    "name": "read_file",
    "description": "读取文件内容",
    "input_schema": {
      "type": "object",
      "properties": {
        "path": { "type": "string" }
      },
      "required": ["path"]
    }
  }]
}

// 响应：模型请求调用工具
{
  "content": [{
    "type": "tool_use",
    "id": "toolu_123",
    "name": "read_file",
    "input": { "path": "/src/app.ts" }
  }]
}

// 下一轮请求：发送工具结果
{
  "messages": [{
    "role": "user",
    "content": [{
      "type": "tool_result",
      "tool_use_id": "toolu_123",
      "content": "文件内容..."
    }]
  }]
}
```

## 下一章

工具执行产生结果，结果需要被记忆和管理。下一章讲解 Agent 的记忆与上下文管理。

→ [记忆与上下文管理](/ai-agent/memory-context)
