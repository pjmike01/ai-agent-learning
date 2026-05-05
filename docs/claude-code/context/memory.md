# c13 · 记忆系统

<span class="chapter-badge">c13</span> **记忆系统** — CLAUDE.md 的注入链路，以及 Claude Code "梦境整合"记忆的神奇机制。

<div class="source-path">📁 memdir/ · services/autoDream/</div>

## 记忆的两种形式

Claude Code 的记忆分为两类：

| 类型 | 载体 | 持久化 | 更新方式 |
|------|------|--------|---------|
| **工作记忆** | 消息历史 | 会话级别 | 自动积累 |
| **长期记忆** | CLAUDE.md | 跨会话 | 手动 / 自动整合 |

本章重点讲**长期记忆**——CLAUDE.md 文件系统。

## CLAUDE.md 文件结构

```
项目根目录/
├── CLAUDE.md           ← 主记忆文件（项目级）
├── src/
│   ├── CLAUDE.md       ← 子目录记忆（src 相关约定）
│   └── components/
│       └── CLAUDE.md   ← 更细粒度的记忆
└── ~/.claude/
    └── CLAUDE.md       ← 全局用户记忆
```

## 注入链路

```typescript
// memdir/loadMemoryPrompt.ts（简化）
async function loadMemoryPrompt(cwd: string): Promise<AttachmentMessage[]> {
  const attachments: AttachmentMessage[] = []
  
  // 1. 全局用户记忆
  const globalMemory = await readIfExists('~/.claude/CLAUDE.md')
  if (globalMemory) attachments.push(makeAttachment(globalMemory))

  // 2. 沿目录树向上搜索
  let dir = cwd
  const visited = new Set<string>()
  while (dir !== path.dirname(dir)) {  // 直到根目录
    if (visited.has(dir)) break
    visited.add(dir)

    const claudeMd = path.join(dir, 'CLAUDE.md')
    const content = await readIfExists(claudeMd)
    if (content) {
      attachments.push(makeAttachment(content, claudeMd))
    }

    dir = path.dirname(dir)
  }

  // 3. 处理 @import 引用（嵌套记忆）
  return expandImports(attachments)
}
```

**去重机制** — 多层目录的 CLAUDE.md 可能重复引用同一文件，`filterDuplicateMemoryAttachments()` 确保每个文件只注入一次。

## @import 嵌套记忆

CLAUDE.md 支持引用其他文件：

```markdown
<!-- CLAUDE.md -->
# 项目约定

@import ./docs/ARCHITECTURE.md
@import ./src/CODING_STANDARDS.md

## 核心规则
...
```

这允许将记忆模块化管理，而不是把所有内容塞进一个巨大的 CLAUDE.md。

## Dream 记忆整合机制

这是 Claude Code 中最独特的设计之一——**自动记忆整合**，以"做梦"（Dream）比喻命名。

### 触发条件（三门同时满足）

```typescript
// services/autoDream/autoDream.ts
async function shouldDream(projectRoot: string): Promise<boolean> {
  const state = await readDreamState(projectRoot)
  const now = Date.now()

  return (
    // 条件 1：距离上次 Dream 超过 24 小时
    now - state.lastDreamTime > 24 * 60 * 60 * 1000 &&
    // 条件 2：自上次 Dream 后已有 5+ 个会话
    state.sessionsSinceLastDream >= 5 &&
    // 条件 3：获取整合锁（防止并发 Dream）
    await acquireDreamLock(projectRoot)
  )
}
```

### 四个整合阶段

```
Phase 1: Orient（定向）
  → ls 记忆目录
  → 读取当前 CLAUDE.md
  → 了解现有记忆结构

Phase 2: Gather（收集）
  → 扫描最近的会话日志
  → 找出新的信号（新发现、偏离的记忆、重要事件）
  → 检索可能过时的记忆条目

Phase 3: Consolidate（整合）
  → 写入/更新记忆条目
  → 将相对日期转为绝对日期（防止记忆失效）
  → 删除矛盾的记忆

Phase 4: Prune（修剪）
  → 保持 CLAUDE.md < 200 行、约 25KB
  → 删除过时的引用
  → 压缩冗余内容
```

**整合是只读执行** — Dream 过程中 Claude Code 不修改任何项目文件，只操作记忆文件。

### 日期规范化

```
记忆中的模糊日期 → Dream 整合 → 明确日期
"上周"          →             "2025-04-28"
"最近"          →             "2025-04-22 ~ 2025-04-29"
"前天"          →             "2025-04-30"
```

这确保了记忆在时间流逝后仍然可解读（"上周"三个月后就没意义了，但"2025-04-28"永远准确）。

## 记忆大小限制

CLAUDE.md 有两个上限：

| 限制 | 值 | 原因 |
|------|-----|------|
| 行数 | 200 行 | 防止大量 Token 浪费 |
| 大小 | ~25 KB | API 请求大小控制 |

超出限制时，Dream 整合会自动压缩：优先保留重要信息，删除冗余内容。

## 记忆与 Prompt 缓存的关系

CLAUDE.md 注入在**动态部分**（SYSTEM_PROMPT_DYNAMIC_BOUNDARY 之后），原因是：

1. 不同项目有不同的 CLAUDE.md
2. CLAUDE.md 内容会随时间变化（Dream 整合后）
3. 动态部分变化不影响静态部分的缓存命中

## 下一章

了解了上下文和记忆，下一章看如何精确追踪这些 API 调用的成本。

→ [c14 · 成本追踪](/claude-code/context/cost-tracking)
