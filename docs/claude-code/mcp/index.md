# MCP 集成

Model Context Protocol（MCP）是 Anthropic 提出的开放标准，让 AI 应用可以通过统一协议接入外部工具和数据源。本模块讲解 Claude Code 如何实现 MCP 客户端。

## 本模块章节

<div class="module-grid">
<a class="module-card" href="/ai-agent-learning/claude-code/mcp/architecture">
  <div class="icon">🔌</div>
  <h3>c10 · MCP 架构</h3>
  <p>五种传输方式（stdio/SSE/HTTP/WebSocket/SDK），连接生命周期管理，OAuth 与 XAA 认证。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/mcp/tool-wrapping">
  <div class="icon">📦</div>
  <h3>c11 · MCPTool 包装</h3>
  <p>MCP 工具如何被包装成统一的 Tool 接口，延迟加载机制，ToolSearch 发现流程。</p>
</a>
</div>

## MCP 在 Claude Code 中的角色

Claude Code 同时扮演两个角色：

- **MCP 客户端** — 连接外部 MCP 服务器，使用它们提供的工具和资源
- **MCP 服务器** — 通过 `claude --mcp` 启动，向其他应用暴露 Claude Code 能力

本模块重点讲解**客户端**侧的实现。
