# c10 · MCP 架构

<span class="chapter-badge">c10</span> **MCP 架构** — Claude Code 如何管理多个 MCP 服务器连接，以及 5 种传输方式的适用场景。

<div class="source-path">📁 services/mcp/ · services/mcp/client.ts · services/mcp/types.ts</div>

## MCP 服务器配置

Claude Code 支持 5 种传输方式，配置在 settings.json 的 `mcpServers` 字段：

```typescript
type McpServerConfig =
  | {
      type: 'stdio'
      command: string           // 可执行文件路径
      args?: string[]
      env?: Record<string, string>
    }
  | {
      type: 'sse'               // Server-Sent Events（HTTP 流）
      url: string
      headers?: Record<string, string>
      oauth?: OAuthConfig
    }
  | {
      type: 'http'              // HTTP（streamable）
      url: string
      headers?: Record<string, string>
      oauth?: OAuthConfig
    }
  | {
      type: 'ws'                // WebSocket
      url: string
      headers?: Record<string, string>
    }
  | {
      type: 'sdk'               // 内置 SDK（同进程）
      name: string
    }
```

**配置示例：**

```json
// .claude/settings.json
{
  "mcpServers": {
    "filesystem": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
    },
    "github": {
      "type": "sse",
      "url": "https://api.github.com/mcp",
      "headers": { "Authorization": "Bearer ${GITHUB_TOKEN}" }
    },
    "local-tools": {
      "type": "http",
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## 配置作用域

每个 MCP 服务器配置附带作用域信息：

```typescript
type ScopedMcpServerConfig = McpServerConfig & {
  scope:
    | 'user'        // ~/.claude/settings.json
    | 'project'     // .claude/settings.json（共享）
    | 'local'       // .claude/settings.local.json（个人）
    | 'enterprise'  // 企业策略（远程下发）
    | 'dynamic'     // 运行时动态注册
    | 'claudeai'    // claude.ai 集成
    | 'managed'     // 托管服务（插件提供）
}
```

## 连接生命周期

```
应用启动
    │
    ▼ useManageMCPConnections()（React Hook）
    │
    ├─ 读取所有 mcpServers 配置
    │
    ├─ 并发建立连接（每个服务器独立）
    │       │
    │       ├─ stdio:  spawn 子进程，通过 stdin/stdout 通信
    │       ├─ sse:    建立 EventSource 连接
    │       ├─ http:   建立 HTTP 持久连接
    │       ├─ ws:     建立 WebSocket 连接
    │       └─ sdk:    直接调用内置实现
    │
    ├─ 连接成功 → ConnectedMCPServer
    │       ├─ capabilities（工具/资源列表）
    │       ├─ serverInfo（名称、版本）
    │       └─ instructions（使用说明注入系统 Prompt）
    │
    └─ 连接失败 → FailedMCPServer（记录错误，不阻塞启动）

应用运行中
    │
    ├─ 工具发现：MCP 工具被包装为 MCPTool，加入工具池
    ├─ 资源发现：通过 ListMcpResources/ReadMcpResource 工具访问
    └─ 自动重连：连接断开后指数退避重连

应用退出
    └─ cleanup() 关闭所有连接，停止子进程
```

## 认证机制

### OAuth 2.0

```typescript
type OAuthConfig = {
  clientId?: string
  authServerMetadataUrl?: string
  xaa?: boolean  // 是否使用 XAA（跨应用访问）
}
```

当 MCP 服务器返回 `-32042` 错误（需要认证），`elicitationHandler.ts` 触发 OAuth 流程：

```
服务器返回 -32042（需要认证）
        │
        ▼ elicitationHandler
        │
        ├─ 打开浏览器 → OAuth 授权页面
        ├─ 启动本地 HTTP 服务器接收回调
        ├─ 用户授权 → 获取 access_token
        └─ 重试原始请求（带 token）
```

### XAA（跨应用访问）

XAA 是 Anthropic 内部的跨应用认证方案：

```typescript
// 在 settings.json 中全局配置 IdP
{
  "xaaIdp": {
    "clientId": "...",
    "issuerUrl": "https://auth.example.com"
  }
}

// 各服务器声明使用 XAA
{
  "mcpServers": {
    "internal-tool": {
      "type": "http",
      "url": "https://tools.internal/mcp",
      "oauth": { "xaa": true }
    }
  }
}
```

XAA token 从 IdP 获取一次后，可复用于所有声明 `xaa: true` 的服务器。

## 服务器发现与工具名规范化

MCP 工具名经过规范化，避免不同服务器的同名冲突：

```typescript
// normalization.ts
function normalizeMcpToolName(serverName: string, toolName: string): string {
  return `mcp__${serverName}__${toolName}`
}
// 例：filesystem 服务器的 read_file 工具
// 规范化为：mcp__filesystem__read_file
```

## 服务器 instructions 注入

连接成功的服务器可以提供 `instructions` 字段，这些说明会自动注入系统 Prompt：

```
系统 Prompt（动态部分）
    ...
    ## MCP 服务器说明
    
    ### filesystem
    提供对 /tmp 目录的文件系统访问。
    使用 mcp__filesystem__read_file 读取文件。
    
    ### github  
    提供 GitHub API 访问...
    ...
```

## 下一章

了解了 MCP 服务器的连接管理，下一章看 MCP 工具如何被包装成与内置工具完全一致的接口。

→ [c11 · MCPTool 包装](/claude-code/mcp/tool-wrapping)
