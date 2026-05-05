# c06 · Tool 类型系统

<span class="chapter-badge">c06</span> **Tool 类型系统** — `Tool<I,O>` 接口是 Claude Code 工具系统的核心契约，理解它才能理解所有工具的设计模式。

<div class="source-path">📁 Tool.ts · tools.ts</div>

## 核心接口

每个工具都是一个实现了以下接口的对象：

```typescript
// Tool.ts
type Tool<
  Input extends AnyObject = AnyObject,
  Output = unknown,
  ProgressData = unknown
> = {
  // ── 基本信息 ──────────────────────────────────
  name: string                    // 工具名（全局唯一）
  aliases?: string[]              // 别名（向后兼容）
  searchHint?: string             // 延迟加载时的搜索关键词

  // ── Schema ────────────────────────────────────
  inputSchema: ZodType<Input>     // 输入校验（Zod）
  outputSchema?: ZodType<Output>  // 输出 schema（可选）

  // ── 核心执行 ──────────────────────────────────
  call(
    input: Input,
    context: ToolUseContext,
    canUseTool: CanUseToolFn,
    parentMessage: AssistantMessage,
    onProgress: (data: ProgressData) => void
  ): Promise<ToolResult<Output>>

  // ── 描述与渲染 ────────────────────────────────
  description(input: Input, options: Options): Promise<string>
  renderToolUseMessage(input: Input, options: Options): ReactNode
  renderToolResultMessage(
    content: ToolResult,
    progressMessages: ProgressMessage[],
    options: Options
  ): ReactNode
  renderToolUseProgressMessage?(
    progressData: ProgressData,
    options: Options
  ): ReactNode

  // ── 权限与安全 ────────────────────────────────
  checkPermissions(
    input: Input,
    context: ToolUseContext
  ): Promise<PermissionResult>
  
  isReadOnly(input: Input): boolean      // 不产生副作用
  isDestructive(input: Input): boolean   // 不可逆操作
  isConcurrencySafe(input: Input): boolean  // 可并发执行

  // ── 工具发现 ──────────────────────────────────
  isEnabled(): boolean                   // 当前环境是否可用
  shouldDefer?: boolean                  // 是否延迟加载 schema
  alwaysLoad?: boolean                   // 始终在第一轮加载

  // ── 用量与活动描述 ────────────────────────────
  userFacingName(input: Input): string
  activityDescription(input: Input, options: Options): string
  toAutoClassifierInput(input: Input): string  // 自动权限分类器输入
}
```

## buildTool() 工厂函数

大多数工具不需要实现所有 20+ 个方法。`buildTool()` 提供了合理的默认值：

```typescript
// tools.ts
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: () => false,   // 默认：不可并发（保守）
  isReadOnly: () => false,          // 默认：有副作用
  isDestructive: () => false,       // 默认：可撤销
  checkPermissions: (input) =>
    Promise.resolve({ behavior: 'allow', updatedInput: input }),
  toAutoClassifierInput: () => '',
  userFacingName: (input, { name }) => name,
  aliases: [],
}

function buildTool<I, O>(def: ToolDef<I, O>): Tool<I, O> {
  return { ...TOOL_DEFAULTS, ...def }
}
```

**保守的默认值** 是安全设计的体现：未声明并发安全的工具默认串行执行，避免竞争条件。

## ToolResult 类型

```typescript
type ToolResult<Output = unknown> =
  | { type: 'result'; result: Output; resultForAssistant?: string }
  | { type: 'error'; error: string }
  | { type: 'interrupted' }

// resultForAssistant：当完整结果太长时，向模型展示的摘要版本
```

## 工具注册与组装

```typescript
// tools.ts
function getTools(permissionContext: ToolPermissionContext): Tools {
  // 1. SIMPLE 模式：只有 Bash/Read/Edit
  if (isSimpleMode) return SIMPLE_TOOLS

  // 2. 获取所有基础工具
  let tools = getAllBaseTools()

  // 3. 应用拒绝规则过滤
  tools = tools.filter(t => !isDenied(t.name, permissionContext.denyRules))

  // 4. 过滤禁用工具
  tools = tools.filter(t => t.isEnabled())

  return tools
}

function assembleToolPool(
  permissionContext: ToolPermissionContext,
  mcpTools: Tools,
): Tools {
  const builtinTools = getTools(permissionContext)
  
  // 内置工具优先（同名时 MCP 工具被覆盖）
  const allTools = deduplicateByName([...builtinTools, ...mcpTools])
  
  // 排序确保 Prompt 缓存稳定性
  return sortToolsForCacheStability(allTools)
}
```

**Prompt 缓存稳定性** 是关键：工具列表顺序变化会导致系统 Prompt 变化，破坏缓存命中。`sortToolsForCacheStability()` 确保工具顺序在会话间保持一致。

## ToolUseContext

`call()` 方法接收的上下文对象，包含执行工具所需的一切：

```typescript
type ToolUseContext = {
  options: {
    commands: Command[]
    tools: Tools
    mainLoopModel: string
    mcpClients: MCPServerConnection[]
    isNonInteractiveSession: boolean
    // ...
  }
  abortController: AbortController    // 中断信号
  readFileState: FileStateCache       // 文件读取缓存
  getAppState(): AppState             // 当前全局状态
  setAppState(f: Updater): void       // 更新全局状态
  messages: Message[]                 // 当前消息历史
  setToolJSX?: SetToolJSXFn          // 设置工具自定义 UI
  appendSystemMessage?: (msg) => void // 注入系统消息
  handleElicitation?: (...)           // MCP 认证流处理
}
```

## 工具的 Zod Schema

工具 schema 直接决定模型能传什么参数：

```typescript
// BashTool 的 inputSchema 示例
const BashInputSchema = z.object({
  command: z.string()
    .describe('要执行的 bash 命令'),
  timeout: z.number()
    .optional()
    .describe('超时时间（毫秒），默认 120000'),
  description: z.string()
    .optional()
    .describe('命令的用途描述（用于 UI 显示）'),
})
```

Zod schema 自动转换为 JSON Schema 发给 Claude API，模型据此生成合法的工具调用。

## 延迟加载（Deferred Tools）

工具列表很长时，把所有 schema 都发给模型会浪费 Token。`shouldDefer: true` 的工具只发送名称，在需要时才加载完整 schema：

```typescript
// ToolSearchTool 负责按需加载
const ToolSearchTool = buildTool({
  name: 'ToolSearch',
  call: async ({ query }) => {
    // 在延迟工具列表中搜索匹配的工具
    // 返回匹配工具的完整 schema
  }
})
```

这是一种"工具发现"机制——模型先搜索需要什么工具，再加载对应的 schema。

## 下一章

了解了工具的类型系统，下一章看具体有哪些内置工具以及它们的设计细节。

→ [c07 · 内置工具详解](/claude-code/tools/builtin-tools)
