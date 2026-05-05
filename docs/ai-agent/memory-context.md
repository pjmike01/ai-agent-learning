# 记忆与上下文管理

## Agent 为什么需要记忆

LLM 本身是**无状态**的——每次调用都是独立的，不知道之前发生了什么。Agent 的记忆系统解决两个问题：

1. **会话内连续性** — 在一次对话中记住已做的操作
2. **跨会话持久性** — 下次对话时记住上次的上下文

## 记忆的三种层次

```
┌──────────────────────────────────────────┐
│  感觉记忆（Sensory Memory）               │
│  当前 turn 的输入/输出                     │
│  存活时间：毫秒级                          │
├──────────────────────────────────────────┤
│  工作记忆（Working Memory）               │
│  对话历史（messages 数组）                 │
│  存活时间：会话级别                        │
│  限制：上下文窗口大小                      │
├──────────────────────────────────────────┤
│  长期记忆（Long-term Memory）             │
│  持久化的知识和偏好                        │
│  存活时间：永久                            │
│  存储：文件、数据库、向量存储               │
└──────────────────────────────────────────┘
```

## 工作记忆：消息历史

最直接的记忆形式——把所有对话消息传给 LLM：

```typescript
const messages = [
  { role: 'user', content: '帮我修复 login 模块的 bug' },
  { role: 'assistant', content: '让我先看看代码...',
    toolCalls: [{ name: 'read_file', args: { path: 'login.ts' } }] },
  { role: 'tool', content: '// login.ts 内容...' },
  { role: 'assistant', content: '发现了问题，空指针检查缺失...' },
  // ... 随着对话进行持续增长
]
```

**问题：上下文窗口是有限的。** Claude 的窗口是 200K tokens，但长会话很容易超出。

## 上下文压缩策略

当消息历史接近窗口限制时，需要压缩：

### 策略一：滑动窗口

保留最近 N 轮对话，丢弃更早的内容。

```typescript
function slidingWindow(messages: Message[], maxTurns: number): Message[] {
  return messages.slice(-maxTurns * 2)  // 每轮 2 条（user + assistant）
}
```

**缺点：** 丢失早期的重要上下文。

### 策略二：摘要压缩

用 LLM 对旧消息生成摘要，替换原始内容：

```typescript
async function compactMessages(messages: Message[]): Promise<Message[]> {
  const oldMessages = messages.slice(0, -RECENT_TURNS)
  const recentMessages = messages.slice(-RECENT_TURNS)

  // 用 LLM 生成摘要
  const summary = await llm.chat([
    { role: 'system', content: '请摘要以下对话的关键信息和已完成的操作。' },
    ...oldMessages
  ])

  return [
    { role: 'system', content: `之前的对话摘要：${summary}` },
    ...recentMessages
  ]
}
```

**Claude Code 的做法：** 使用 `auto compact` 策略，在 token 使用接近阈值时自动触发压缩。

### 策略三：选择性保留

标记重要消息不被压缩：

```typescript
type Message = {
  role: string
  content: string
  importance?: 'critical' | 'normal' | 'low'
}

function selectiveCompact(messages: Message[]): Message[] {
  const critical = messages.filter(m => m.importance === 'critical')
  const recent = messages.slice(-RECENT_TURNS)
  return [...critical, ...recent]
}
```

## 长期记忆设计

跨会话的记忆需要持久化存储。常见方案：

### 文件系统存储（Claude Code 方案）

```
~/.claude/CLAUDE.md          ← 全局用户偏好
项目/.claude/CLAUDE.md       ← 项目约定
项目/.claude/memory/         ← 结构化记忆条目
  ├── user_role.md
  ├── feedback_testing.md
  └── project_auth.md
```

**优点：** 简单、可版本控制、人类可读可编辑

### 向量数据库存储

```typescript
// 写入记忆
await vectorDB.upsert({
  id: 'memory_001',
  text: '用户偏好使用 TypeScript，不喜欢 var 声明',
  embedding: await embed(text),
  metadata: { type: 'preference', timestamp: Date.now() }
})

// 检索相关记忆
const relevant = await vectorDB.query({
  embedding: await embed(currentTask),
  topK: 5,
  filter: { type: 'preference' }
})
```

**优点：** 语义搜索，自动匹配相关记忆

### 结构化数据库

```sql
CREATE TABLE agent_memory (
  id TEXT PRIMARY KEY,
  type TEXT,          -- 'fact', 'preference', 'event'
  content TEXT,
  confidence REAL,
  created_at TIMESTAMP,
  last_accessed TIMESTAMP
);
```

**优点：** 精确查询，支持过期机制

## 记忆的生命周期管理

记忆不是只增不减的，需要管理其生命周期：

```
创建 → 使用 → 验证 → 更新/淘汰
  │                       │
  │   新信息出现时         │  与现实矛盾时
  │   更新记忆条目         │  标记为过时并删除
  │                       │
  └───────────────────────┘
```

**Claude Code 的 Dream 机制** 就是一个记忆生命周期管理器——每 24 小时自动整合、更新、修剪记忆。

## 下一章

当一个 Agent 不够用时，需要多个 Agent 协作。下一章讲解 Multi-Agent 架构。

→ [Multi-Agent 架构](/ai-agent/multi-agent)
