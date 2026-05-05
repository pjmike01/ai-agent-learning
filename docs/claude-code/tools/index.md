# 工具系统

工具（Tool）是 Claude Code 与外部世界交互的唯一通道。本模块从类型系统出发，逐步拆解内置工具的设计、并发调度策略和权限控制体系。

## 本模块章节

<div class="module-grid">
<a class="module-card" href="/ai-agent-learning/claude-code/tools/tool-system">
  <div class="icon">🏗️</div>
  <h3>c06 · Tool 类型系统</h3>
  <p>Tool&lt;I,O&gt; 接口的 20+ 方法，buildTool() 默认值填充模式，工具注册与过滤机制。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/tools/builtin-tools">
  <div class="icon">🔨</div>
  <h3>c07 · 内置工具详解</h3>
  <p>40+ 内置工具的分类速览，BashTool 的 sandbox 机制，FileReadTool 的 token 感知限制。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/tools/concurrency">
  <div class="icon">⚡</div>
  <h3>c08 · 并发控制</h3>
  <p>读写分区策略，10并发上限，serial/concurrent 批次调度，工具幂等性设计。</p>
</a>
<a class="module-card" href="/ai-agent-learning/claude-code/tools/permissions">
  <div class="icon">🔐</div>
  <h3>c09 · 权限系统</h3>
  <p>6种 PermissionMode，8层规则来源的优先级，Denial 计数器与自动降级机制。</p>
</a>
</div>

## 工具的本质

工具是**模型意图与真实副作用之间的契约**：

```
模型输出（JSON）: { "name": "Bash", "input": { "command": "ls -la" } }
                           │
                           ▼  Tool.call()
                           │
真实副作用:        在终端执行 ls -la，返回文件列表
```

每个工具定义了：
- 接受什么输入（Zod schema）
- 如何执行（call 方法）
- 是否需要用户授权（checkPermissions）
- 是否可以并发执行（isConcurrencySafe）
