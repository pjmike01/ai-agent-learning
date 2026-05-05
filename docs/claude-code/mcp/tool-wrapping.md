# c11 · MCPTool 包装

<span class="chapter-badge">c11</span> **MCPTool 包装** — MCP 服务器的工具如何被无缝适配为 Claude Code 的统一 Tool 接口。

<div class="source-path">📁 tools/MCPTool/ · tools/ToolSearchTool/</div>

## 设计目标

内置工具和 MCP 工具对 Agent 主循环来说应该**完全透明**——主循环不关心工具是本地实现还是远程 MCP 服务器提供的。

`MCPTool` 是一个适配器（Adapter），将 MCP 协议的工具包装为 Claude Code 的 `Tool<I,O>` 接口：

```
MCP Server                      Claude Code
┌──────────────┐                ┌────────────────────┐
│ MCP Tool     │                │ MCPTool             │
│  - name      │    包装        │  - name (规范化)    │
│  - inputSchema│ ──────────► │  - inputSchema (Zod)│
│  - call()    │                │  - call()           │
└──────────────┘                │  - checkPermissions │
                                │  - renderToolResult │
                                └────────────────────┘
                                        │
                                        ▼
                                  工具池（与内置工具混合）
```

## 核心包装逻辑

```typescript
// tools/MCPTool/MCPTool.ts（简化）
function createMCPTool(
  serverName: string,
  mcpTool: MCPToolDefinition,
  client: MCPClient,
): Tool {
  // 规范化工具名
  const toolName = normalizeMcpToolName(serverName, mcpTool.name)

  // MCP JSON Schema → Zod Schema
  const inputSchema = jsonSchemaToZod(mcpTool.inputSchema)

  return buildTool({
    name: toolName,
    inputSchema,
    shouldDefer: true,  // 默认延迟加载（MCP 工具可能很多）

    call: async (input, context) => {
      // 通过 MCP 客户端调用远程工具
      const result = await client.callTool({
        name: mcpTool.name,  // 注意：发给服务器时用原始名称
        arguments: input,
      })

      if (result.isError) {
        return { type: 'error', error: result.content[0].text }
      }

      return {
        type: 'result',
        result: extractContent(result.content),
      }
    },

    checkPermissions: async (input, context) => {
      // MCP 工具默认需要用户确认
      // 可通过 settings.json 添加放行规则
      return checkMCPToolPermissions(toolName, input, context)
    },

    // MCP 工具的 description 来自服务器
    description: async () => mcpTool.description ?? toolName,
  })
}
```

## 延迟加载（Deferred Loading）

MCP 工具默认 `shouldDefer: true`。这意味着：

1. **第一轮对话** — 只发送工具名称，不发送完整 schema
2. **模型调用 ToolSearch** — 根据关键词找到需要的工具
3. **加载完整 schema** — 返回给模型，模型再发起实际调用

```
系统 Prompt（第一轮）：
  可用工具：
    - mcp__github__list_repos [延迟加载]
    - mcp__github__create_pr [延迟加载]
    - mcp__filesystem__read_file [延迟加载]
    ...（只有名称，没有参数描述）

模型：我需要查看 GitHub 仓库列表
  → 调用 ToolSearch({ query: "github list repos" })

ToolSearch 返回：
  mcp__github__list_repos 的完整 schema：
    - owner: string (仓库所有者)
    - type: 'public' | 'private' | 'all'
    ...

模型：好的，现在我知道参数了
  → 调用 mcp__github__list_repos({ owner: "myorg", type: "all" })
```

**延迟加载节省 Token** — 如果有 50 个 MCP 工具但本次任务只用到 2 个，避免了 48 个工具 schema 的 Token 浪费。

## `alwaysLoad` 覆盖延迟加载

某些高频工具可以声明 `alwaysLoad: true`，在第一轮就加载完整 schema：

```typescript
// 总是立即加载的工具（如核心文件操作）
const FileReadTool = buildTool({
  alwaysLoad: true,
  shouldDefer: false,
  // ...
})
```

## MCP 资源访问

除了工具，MCP 服务器还可以暴露**资源**（静态数据，如文件、数据库记录）。Claude Code 提供两个内置工具访问资源：

```typescript
// ListMcpResourcesTool - 列出可用资源
// 返回：[{ uri, name, description, mimeType }, ...]

// ReadMcpResourceTool - 读取具体资源
// 输入：{ serverName, uri }
// 返回：资源内容
```

资源与工具的区别：资源是数据（不执行），工具是操作（执行有副作用）。

## 工具名冲突处理

当 MCP 工具与内置工具同名时，内置工具优先：

```typescript
function assembleToolPool(builtinTools, mcpTools) {
  const builtinNames = new Set(builtinTools.map(t => t.name))

  // 过滤掉与内置工具冲突的 MCP 工具
  const filteredMcpTools = mcpTools.filter(t => !builtinNames.has(t.name))

  return [...builtinTools, ...filteredMcpTools]
}
```

这保证了 Claude Code 的核心功能（Read/Edit/Bash）不会被 MCP 服务器覆盖。

## 下一章

工具系统和 MCP 集成讲完了。下一模块进入上下文与记忆——Claude Code 如何管理对话的"大脑"。

→ [c12 · Prompt 系统](/claude-code/context/prompt-system)
