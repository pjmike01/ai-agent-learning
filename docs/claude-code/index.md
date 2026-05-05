# Claude Code 源码分析

Claude Code 是 Anthropic 官方出品的 AI 编程 CLI 工具，以 TypeScript 编写，源码规模达 1,884 个文件、34MB。本模块将其拆解为 **19 个章节**，从启动流程到 Agent 主循环，从工具系统到多 Agent 协调，逐层递进。

## 模块总览

<div class="module-grid">
<a class="module-card" href="/ai-agent-learning/claude-code/overview">
  <div class="icon">📋</div>
  <h3>c01 · 项目概览</h3>
  <p>目录结构、技术栈、模块依赖关系速查表。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/core/">
  <div class="icon">🔄</div>
  <h3>核心架构（c02-c05）</h3>
  <p>启动流程、Agent 主循环、QueryEngine、消息系统。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/tools/">
  <div class="icon">🔧</div>
  <h3>工具系统（c06-c09）</h3>
  <p>Tool 类型系统、40+ 内置工具、并发控制、权限系统。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/mcp/">
  <div class="icon">🔌</div>
  <h3>MCP 集成（c10-c11）</h3>
  <p>5 种传输方式、MCPTool 包装、延迟加载与认证。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/context/">
  <div class="icon">🧠</div>
  <h3>上下文与记忆（c12-c14）</h3>
  <p>Prompt 缓存分区、Dream 记忆整合、成本追踪。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/advanced/">
  <div class="icon">🚀</div>
  <h3>高级特性（c15-c19）</h3>
  <p>多 Agent 协调、状态管理、UI 系统、技能插件、彩蛋。</p>
</a>
</div>

## 学习路线建议

```
入门 → c01 项目概览 → c02 启动流程 → c03 Agent 主循环
         ↓
深入 → c06 工具系统 → c09 权限系统 → c10 MCP 架构
         ↓
进阶 → c12 Prompt 系统 → c15 多 Agent → c19 特殊功能
```
