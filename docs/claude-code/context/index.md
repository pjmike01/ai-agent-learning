# 上下文与记忆

如何向模型传递正确的信息？如何在长会话中保持记忆？如何精确追踪 API 费用？本模块回答这三个问题。

## 本模块章节

<div class="module-grid">
<a class="module-card" href="/ai-agent-learning/claude-code/context/prompt-system">
  <div class="icon">📝</div>
  <h3>c12 · Prompt 系统</h3>
  <p>系统 Prompt 的静态/动态分区设计，为什么这样分区能最大化 API 缓存命中率。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/context/memory">
  <div class="icon">🧠</div>
  <h3>c13 · 记忆系统</h3>
  <p>CLAUDE.md 的注入链路，Dream 四阶段记忆整合机制，自动精简防止膨胀。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/context/cost-tracking">
  <div class="icon">💰</div>
  <h3>c14 · 成本追踪</h3>
  <p>ModelUsage 结构，OpenTelemetry 指标，分模型用量统计，会话成本恢复。</p>
</a>
</div>
