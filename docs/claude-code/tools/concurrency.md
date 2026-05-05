# c08 · 并发控制

<span class="chapter-badge">c08</span> **并发控制** — 模型一次可以调用多个工具，Claude Code 通过读写分区策略安全地并发执行它们。

<div class="source-path">📁 services/tools/toolOrchestration.ts</div>

## 问题背景

Claude API 支持**批量工具调用**——模型可以在一次回复中请求执行多个工具：

```json
{
  "content": [
    { "type": "tool_use", "id": "t1", "name": "Read", "input": {"file_path": "a.ts"} },
    { "type": "tool_use", "id": "t2", "name": "Read", "input": {"file_path": "b.ts"} },
    { "type": "tool_use", "id": "t3", "name": "Bash", "input": {"command": "git status"} },
    { "type": "tool_use", "id": "t4", "name": "Write", "input": {"file_path": "c.ts", ...} }
  ]
}
```

如果串行执行，用户等待时间 = 所有工具执行时间之和。如果全部并发，Write 可能在 Read 还没完成时就改了文件——产生竞争条件。

## 读写分区策略

`toolOrchestration.ts` 的核心算法：

```
工具调用列表
      │
      ▼ partitionToolCalls()
      │
      ├── 批次 A（并发组）：
      │   所有 isConcurrencySafe() = true 的工具
      │   └─ Read(a.ts), Read(b.ts), Bash("git status")
      │                    ↓ 并发执行，最多 10 个同时运行
      │
      └── 批次 B（串行组）：
          所有 isConcurrencySafe() = false 的工具
          └─ Write(c.ts)
                   ↓ 等批次 A 全部完成后，串行执行
```

```typescript
// toolOrchestration.ts（简化）
async function runTools(
  toolCalls: ToolUseBlock[],
  context: ToolUseContext,
): AsyncGenerator<ProgressMessage | ToolResult[]> {
  // 分区
  const [concurrentCalls, serialCalls] = partitionToolCalls(toolCalls)

  // 并发执行只读工具
  if (concurrentCalls.length > 0) {
    const results = await runConcurrent(concurrentCalls, context)
    yield results
  }

  // 串行执行写入工具
  for (const toolCall of serialCalls) {
    const result = await runSingle(toolCall, context)
    yield [result]
  }
}
```

## 并发上限

```typescript
const MAX_CONCURRENCY = parseInt(
  process.env.CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY ?? '10'
)

async function runConcurrent(calls, context) {
  // 使用信号量限制并发数
  const semaphore = new Semaphore(MAX_CONCURRENCY)
  return Promise.all(
    calls.map(call =>
      semaphore.acquire().then(async release => {
        try {
          return await runSingle(call, context)
        } finally {
          release()
        }
      })
    )
  )
}
```

10 是经验值——足够发挥并行优势，又不会因过多并发进程拖慢系统。

## isConcurrencySafe 的判定

工具的并发安全性由 `isConcurrencySafe()` 方法声明：

```typescript
// 只读工具：始终并发安全
const FileReadTool = buildTool({
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
  // ...
})

// BashTool：取决于命令语义
const BashTool = buildTool({
  isConcurrencySafe: (input) => isReadOnlyBashCommand(input.command),
  // ...
})

// 写入工具：永远不并发
const FileWriteTool = buildTool({
  isConcurrencySafe: () => false,  // 默认值，可省略
  // ...
})
```

**BashTool 的动态判定** 是一个精妙设计：`cat`、`ls`、`grep` 这类只读命令可以并发，`rm`、`git commit` 这类写操作不行——这由命令语义决定而非工具名称。

## 上下文修改工具的特殊处理

某些工具不修改文件系统，但修改 Agent 的**运行上下文**（如消息历史），这类工具也必须串行：

```typescript
// 修改上下文的工具必须串行
const isContextModifier = (tool: Tool) =>
  tool.name === 'MemoryWrite' ||
  tool.name === 'TodoWrite'

// 分区逻辑也考虑上下文修改
function partitionToolCalls(calls: ToolUseBlock[], tools: Tools) {
  return calls.reduce(([concurrent, serial], call) => {
    const tool = findTool(call.name, tools)
    const isSafe = tool.isConcurrencySafe(call.input) && !isContextModifier(tool)
    return isSafe
      ? [[...concurrent, call], serial]
      : [concurrent, [...serial, call]]
  }, [[], []])
}
```

## 进度流式传出

工具执行时，`onProgress` 回调允许工具实时发送进度：

```typescript
// BashTool 流式输出（简化）
call: async (input, context, canUseTool, parent, onProgress) => {
  const proc = spawn(input.command)
  
  proc.stdout.on('data', (chunk) => {
    onProgress({ type: 'output', text: chunk.toString() })
    // 触发 ProgressMessage yield → UI 实时更新
  })

  await proc.done()
}
```

`onProgress` → `ProgressMessage` → `yield` → UI 渲染 是工具执行实时反馈的完整链路。

## 下一章

工具执行前需要过权限关卡。下一章深入权限系统的 6 种模式和 8 层规则。

→ [c09 · 权限系统](/claude-code/tools/permissions)
