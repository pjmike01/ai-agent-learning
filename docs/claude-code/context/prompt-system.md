# c12 · Prompt 系统

<span class="chapter-badge">c12</span> **Prompt 系统** — 系统 Prompt 的静态/动态分区设计，以及为什么这样设计能显著降低 API 成本。

<div class="source-path">📁 constants/prompts.ts · context.ts</div>

## Prompt 缓存的价值

Claude API 支持 **Prompt 缓存**（Prompt Caching）：如果两次请求的前缀完全相同，第二次请求可以复用缓存，缓存读取价格约为正常价格的 1/10。

Claude Code 充分利用了这一特性。关键问题是：**系统 Prompt 哪些部分是固定的？哪些部分会随对话变化？**

## 静态/动态分区

```typescript
// constants/prompts.ts
const SYSTEM_PROMPT_DYNAMIC_BOUNDARY = '<!-- DYNAMIC_SECTION_START -->'

// 系统 Prompt 结构：
//
// ═══════════════════════════════════════ ← 可缓存（每次请求相同）
//  核心指令（工具使用规范、行为准则）
//  工具文档（所有工具的 description）
//  学习示例
//  安全规则
// ─────────────────────────────────────── ← SYSTEM_PROMPT_DYNAMIC_BOUNDARY
//  <!-- DYNAMIC_SECTION_START -->         ← 以下不缓存（每次可能不同）
//  用户 CLAUDE.md 内容
//  当前 git 状态
//  当前工作目录信息
//  MCP 服务器说明
// ═══════════════════════════════════════
```

**缓存命中条件**：两次请求中，`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 之前的内容完全相同。

## Prompt 组成模块

系统 Prompt 由多个独立模块组合：

```typescript
// 简化的 Prompt 组装逻辑
function buildSystemPrompt(context: PromptContext): string {
  const staticParts = [
    getCoreInstructions(),       // 核心行为规范
    getToolDocumentation(tools), // 工具使用说明
    getThinkingRules(thinkingConfig), // 扩展推理规则
    getSafetyInstructions(),     // 安全准则
  ]

  const dynamicParts = [
    SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
    getUserMemory(cwd),          // CLAUDE.md 内容
    getGitStatus(cwd),           // git status 输出
    getMcpInstructions(mcpClients), // MCP 服务器说明
    getWorkingDirContext(cwd),   // 当前目录信息
  ]

  return [...staticParts, ...dynamicParts].join('\n\n')
}
```

## 特殊 Prompt 节

### cyberRiskInstruction

安全相关的指令，由 Anthropic 安全团队维护：

```typescript
// constants/cyberRiskInstruction.ts
// 内容：处理安全敏感操作的规范，不公开显示
```

### undercover 模式

Anthropic 内部员工在公开仓库贡献时，Prompt 会注入特殊指令，隐藏内部信息（见 c19）。

### Thinking 规则

扩展推理模式下注入的规则，指导模型如何使用 thinking block：

```typescript
// 当 thinkingConfig.type === 'enabled' 时注入
const thinkingRules = `
你拥有思考能力。在回答之前，先在 <thinking> 块中整理你的思路。
思考块的内容不会直接展示给用户，但会影响你的回答质量。
`
```

## CLAUDE.md 注入

CLAUDE.md 是项目级别的"指令文件"，Claude Code 会自动注入当前项目的 CLAUDE.md：

```
搜索路径（按优先级）：
1. 当前工作目录的 CLAUDE.md
2. 父目录的 CLAUDE.md（向上遍历到项目根）
3. ~/.claude/CLAUDE.md（全局用户记忆）
4. 子目录中被引用的 CLAUDE.md（通过 @import）
```

多个 CLAUDE.md 会**合并注入**，子目录的内容优先级更高（更具体的指令覆盖通用指令）。

## 危险函数

代码中有一个显式标注"危险"的函数：

```typescript
// 这个函数会破坏缓存！仅在必要时使用
function DANGEROUS_uncachedSystemPromptSection(content: string): string {
  return content  // 注入动态内容到静态部分
}
```

调用此函数意味着让静态部分包含动态内容，导致缓存完全失效。

## git 状态注入

```typescript
// context.ts
async function getGitStatus(cwd: string): Promise<string> {
  try {
    const status = await exec('git status --short', { cwd })
    const branch = await exec('git branch --show-current', { cwd })
    return `当前分支：${branch}\n未提交变更：\n${status}`
  } catch {
    return ''  // 非 git 仓库时静默失败
  }
}
```

git 状态在动态部分，每次对话前刷新，不影响缓存。

## 下一章

Prompt 告诉模型"如何行动"，记忆系统告诉模型"这个项目是什么"。下一章深入记忆系统。

→ [c13 · 记忆系统](/claude-code/context/memory)
