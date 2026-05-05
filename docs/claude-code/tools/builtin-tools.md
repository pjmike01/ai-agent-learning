# c07 · 内置工具详解

<span class="chapter-badge">c07</span> **内置工具详解** — Claude Code 内置 40+ 个工具，覆盖文件操作、代码执行、搜索、Agent 调度等。

<div class="source-path">📁 tools/*/</div>

## 工具分类总览

### 文件操作类（只读）

| 工具名 | 功能 | 并发安全 | 核心特性 |
|--------|------|---------|---------|
| `Read` | 读取文件内容 | ✅ | Token 感知截断、图片/PDF 支持 |
| `Glob` | 文件路径模式匹配 | ✅ | `**/*.ts` 风格 glob |
| `Grep` | 内容搜索 | ✅ | 正则支持、上下文行 |
| `LS` | 列出目录内容 | ✅ | 树形展示 |

### 文件操作类（写入）

| 工具名 | 功能 | 并发安全 | 核心特性 |
|--------|------|---------|---------|
| `Write` | 写入文件 | ❌ | 创建或覆盖，Diff 预览 |
| `Edit` | 精确文本替换 | ❌ | old_string → new_string，唯一性校验 |
| `MultiEdit` | 批量编辑 | ❌ | 多个 Edit 操作原子化 |
| `NotebookEdit` | Jupyter 编辑 | ❌ | 单元格级别操作 |

### 代码执行类

| 工具名 | 功能 | 并发安全 | 核心特性 |
|--------|------|---------|---------|
| `Bash` | 执行 Shell 命令 | ❌ | 沙盒可选、语义解析、120s 超时 |
| `NotebookRun` | 运行 Jupyter 单元格 | ❌ | 捕获输出和异常 |

### Agent 与任务类

| 工具名 | 功能 | 并发安全 | 核心特性 |
|--------|------|---------|---------|
| `Agent` | 启动子 Agent | ❌ | 独立 QueryEngine、隔离会话 |
| `Task` | 后台任务 | ❌ | 异步执行、状态追踪 |
| `TodoWrite` | 任务列表管理 | ❌ | 结构化 todo 跟踪 |

### 搜索与发现类

| 工具名 | 功能 | 并发安全 | 核心特性 |
|--------|------|---------|---------|
| `WebSearch` | 网页搜索 | ✅ | Bing/Google 接入 |
| `WebFetch` | 网页内容抓取 | ✅ | HTML 转 Markdown、15分钟缓存 |
| `ToolSearch` | 延迟工具发现 | ✅ | 关键词匹配加载工具 schema |

### MCP 资源类

| 工具名 | 功能 |
|--------|------|
| `ListMcpResources` | 列出 MCP 服务器资源 |
| `ReadMcpResource` | 读取 MCP 资源内容 |

## 深度解析：BashTool

BashTool 是最复杂的内置工具之一。

```typescript
// tools/BashTool/BashTool.tsx（简化）
const BashTool = buildTool({
  name: 'Bash',
  inputSchema: z.object({
    command: z.string(),
    timeout: z.number().optional(),
  }),

  isReadOnly: (input) => isReadOnlyBashCommand(input.command),
  isDestructive: (input) => isDestructiveBashCommand(input.command),

  call: async (input, context) => {
    // 1. 沙盒检查
    if (await shouldUseSandbox(input.command)) {
      return executeSandboxed(input)
    }

    // 2. 执行命令
    const result = await execCommand(input.command, {
      timeout: input.timeout ?? 120_000,
      abortSignal: context.abortController.signal,
    })

    // 3. 输出大小检查
    if (result.stdout.length > MAX_OUTPUT_SIZE) {
      return truncateOutput(result)
    }

    return { type: 'result', result: result.stdout }
  },

  checkPermissions: async (input, context) => {
    // 解析命令语义，判断危险操作
    return checkBashPermissions(input.command, context)
  },
})
```

**语义解析** 是 BashTool 权限检查的核心。它不是简单地用字符串匹配，而是解析命令树：

```
"git push && rm -rf /tmp/secret"
      ↓ 解析
  AND(
    git push  → 中等风险（网络操作）
    rm -rf    → 高风险（递归删除）
  )
  → 整体评估为高风险，需要用户确认
```

**只读命令识别** 允许 BashTool 并发执行：

```typescript
const READ_ONLY_COMMANDS = new Set([
  'cat', 'ls', 'echo', 'pwd', 'which', 'head', 'tail',
  'grep', 'find', 'wc', 'diff', 'file', 'stat', ...
])

function isReadOnlyBashCommand(command: string): boolean {
  const rootCommand = parseRootCommand(command)
  return READ_ONLY_COMMANDS.has(rootCommand)
}
```

## 深度解析：FileReadTool

```typescript
// tools/FileReadTool/FileReadTool.ts（简化）
const FileReadTool = buildTool({
  name: 'Read',
  isReadOnly: () => true,
  isConcurrencySafe: () => true,

  call: async (input, context) => {
    const { file_path, offset, limit } = input

    // 1. 图片处理
    if (isImageFile(file_path)) {
      const base64 = await readImageAsBase64(file_path)
      return {
        type: 'result',
        result: [{ type: 'image', source: { type: 'base64', data: base64 } }]
      }
    }

    // 2. PDF 处理
    if (file_path.endsWith('.pdf')) {
      return await extractPdfText(file_path, input.pages)
    }

    // 3. 文本文件 + Token 感知截断
    const content = await fs.readFile(file_path, 'utf-8')
    const lines = content.split('\n')

    // 限制行数避免超出 Token 限制
    const startLine = offset ?? 0
    const endLine = limit ? startLine + limit : Math.min(lines.length, 2000)

    return {
      type: 'result',
      result: lines.slice(startLine, endLine).join('\n'),
      // 如果截断了，告知模型文件还有更多内容
      resultForAssistant: endLine < lines.length
        ? `[文件已截断，显示第 ${startLine+1}-${endLine} 行，共 ${lines.length} 行]`
        : undefined
    }
  },
})
```

**Token 感知** 是 FileReadTool 的关键设计：它不是简单地读取文件，而是根据文件大小智能决定展示多少内容，防止单个工具调用消耗大量 Token。

## 深度解析：EditTool

EditTool 采用 **精确替换** 而非整文件覆盖：

```typescript
call: async (input) => {
  const { file_path, old_string, new_string } = input

  const content = await fs.readFile(file_path, 'utf-8')

  // 唯一性校验：old_string 必须在文件中只出现一次
  const count = countOccurrences(content, old_string)
  if (count === 0) {
    return { type: 'error', error: '未找到目标字符串' }
  }
  if (count > 1) {
    return { type: 'error', error: `目标字符串出现 ${count} 次，请提供更多上下文` }
  }

  const newContent = content.replace(old_string, new_string)
  await fs.writeFile(file_path, newContent)

  // 返回 diff 供用户审查
  return { type: 'result', result: generateDiff(content, newContent) }
}
```

**唯一性校验** 是防止模型误操作的关键：如果文件中有多个相同字符串，模型必须提供更长的上下文来精确定位，避免意外修改错误位置。

## AgentTool：递归 Agent

`AgentTool` 允许模型启动子 Agent 来处理子任务：

```typescript
call: async (input, context) => {
  // 创建完全隔离的子 QueryEngine
  const subEngine = new QueryEngine({
    ...context.options,
    initialMessages: [],
    maxTurns: input.maxTurns ?? DEFAULT_SUBTASK_TURNS,
    maxBudgetUsd: input.budget,
  })

  // 子 Agent 的输出作为工具结果返回
  let finalResult = ''
  for await (const event of subEngine.submitMessage(input.prompt)) {
    if (event.type === 'result') {
      finalResult = event.result
    }
  }

  return { type: 'result', result: finalResult }
}
```

子 Agent 拥有**完整的工具访问权限**，但消息历史完全隔离——它不知道父会话的上下文，只看到自己的任务描述。

## 下一章

了解了工具的实现，下一章看多个工具同时调用时的并发控制策略。

→ [c08 · 并发控制](/claude-code/tools/concurrency)
