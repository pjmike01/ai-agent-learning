# 核心架构

Claude Code 的核心是一个**基于异步流的 Agent 循环**。本模块从 CLI 入口出发，逐层拆解启动流程、主循环设计、QueryEngine 编排，以及贯穿全程的消息系统。

## 本模块章节

<div class="module-grid">
<a class="module-card" href="/ai-agent-learning/claude-code/core/bootstrap">
  <div class="icon">🚀</div>
  <h3>c02 · 启动流程</h3>
  <p>从 CLI 解析到 REPL 渲染，完整的初始化调用链：认证、特性开关、AppState 挂载。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/core/agent-loop">
  <div class="icon">🔄</div>
  <h3>c03 · Agent 主循环</h3>
  <p>query() 异步生成器的核心机制，5步执行周期，终止条件，流式事件产出。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/core/query-engine">
  <div class="icon">⚙️</div>
  <h3>c04 · QueryEngine</h3>
  <p>循环编排器的配置接口，submitMessage() 的生命周期，会话隔离与状态恢复。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/core/message-system">
  <div class="icon">💬</div>
  <h3>c05 · 消息系统</h3>
  <p>7种消息类型的职责，ToolResult 结构，消息在 Agent 循环中的流转状态机。</p>
</a>
</div>

## 核心思想

> **"把模型的动作意图变成真实执行结果，再把结果送回模型继续推理"**

这一句话概括了 Claude Code 的本质。没有循环，就没有 Agent——模型只是生成文本，而 Claude Code 把这些文本变成了真实的代码修改、命令执行和文件操作。
