# AI Agent 架构

本模块讲解构建 AI Agent 的通用设计模式，从"什么是 Agent"出发，逐步深入 ReAct 循环、Tool Use、记忆管理、多 Agent 协调和评估体系。

## 章节总览

<div class="module-grid">
<a class="module-card" href="/ai-agent-learning/ai-agent/what-is-agent">
  <div class="icon">🤖</div>
  <h3>什么是 AI Agent</h3>
  <p>Agent 的定义边界、与 Chatbot 的区别、核心能力三角（感知-推理-行动）。</p>
</a>
<a class="module-card" href="/ai-agent-learning/ai-agent/react-pattern">
  <div class="icon">🔄</div>
  <h3>ReAct 模式</h3>
  <p>Reasoning + Acting 的循环范式，从论文到工程实现，为什么 ReAct 成为主流。</p>
</a>
<a class="module-card" href="/ai-agent-learning/ai-agent/tool-use">
  <div class="icon">🔧</div>
  <h3>Tool Use 设计</h3>
  <p>如何定义好的工具接口、Schema 设计原则、错误处理与重试策略。</p>
</a>
<a class="module-card" href="/ai-agent-learning/ai-agent/memory-context">
  <div class="icon">🧠</div>
  <h3>记忆与上下文管理</h3>
  <p>短期记忆 vs 长期记忆，上下文窗口管理，RAG 与向量检索的集成。</p>
</a>
<a class="module-card" href="/ai-agent-learning/ai-agent/multi-agent">
  <div class="icon">🤝</div>
  <h3>Multi-Agent 架构</h3>
  <p>分布式 Agent 协作模式：supervisor、swarm、pipeline，以及实际案例分析。</p>
</a>
<a class="module-card" href="/ai-agent-learning/ai-agent/evaluation">
  <div class="icon">📊</div>
  <h3>评估与可观测性</h3>
  <p>Agent 的评估维度、SWE-bench 等基准测试、生产环境的 trace 与可观测性设计。</p>
</a>
</div>

## 推荐学习路线

```
基础 → 什么是 AI Agent → ReAct 模式 → Tool Use 设计
  ↓
进阶 → 记忆与上下文 → Multi-Agent → 评估与可观测性
  ↓
实践 → Claude Code 源码分析（看真实实现如何落地）
```
