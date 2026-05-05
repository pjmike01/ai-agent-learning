# c19 · 特殊功能彩蛋

<span class="chapter-badge">c19</span> **特殊功能彩蛋** — 从 Tamagotchi 宠物到主动助手，Claude Code 源码中藏着许多有趣的内部功能。

<div class="source-path">📁 buddy/ · assistant/ · utils/undercover.ts · constants/</div>

## 编译期特性开关

Claude Code 使用 Bun 的 `feature()` API 在**编译时**消除死代码：

```typescript
import { feature } from 'bun:bundle'

// 编译时常量折叠
if (feature('BUDDY')) {
  // 内部构建中保留
  // 外部 npm 包中被完全删除（dead code elimination）
  await initBuddySystem()
}
```

**20+ 个特性开关总览：**

| 特性标志 | 功能 | 外部可用 |
|---------|------|---------|
| `BUDDY` | Tamagotchi 电子宠物 | ❌ |
| `KAIROS` | 主动助手 | ❌ |
| `KAIROS_BRIEF` | 简洁助手模式 | ❌ |
| `BRIDGE_MODE` | claude.ai 远程控制 | ❌ |
| `COORDINATOR_MODE` | 多 Agent 协调 | ❌ |
| `TRANSCRIPT_CLASSIFIER` | ML 自动权限 | ❌ |
| `VOICE_MODE` | 语音输入 | ❌ |
| `DAEMON` | 后台守护进程 | ✅ |
| `REACTIVE_COMPACT` | 响应式上下文压缩 | ✅ |
| `TOKEN_BUDGET` | Token 预算控制 | ✅ |
| `CHICAGO_MCP` | Computer Use（鼠标键盘控制） | Max/Pro |
| `EXPERIMENTAL_SKILL_SEARCH` | 技能发现实验 | ❌ |

## BUDDY：Tamagotchi 电子宠物

`buddy/` 目录实现了一个完整的终端宠物系统（2026年5月计划上线）：

### 物种生成

宠物物种通过 **Mulberry32 PRNG** 根据用户 ID 确定性生成——同一个用户永远孵出同一种宠物：

```typescript
// buddy/species.ts（简化）
function generateSpeciesFromUserId(userId: string): Species {
  const seed = hashUserId(userId)  // 用户 ID → 数字种子
  const rng = mulberry32(seed)

  const roll = rng()

  // 稀有度分层
  if (roll < 0.60) return pickCommon(rng)      // 60% 普通
  if (roll < 0.80) return pickUncommon(rng)    // 20% 不常见
  if (roll < 0.93) return pickRare(rng)        // 13% 稀有
  if (roll < 0.99) return pickLegendary(rng)   // 6% 传奇
  return pickMythic(rng)                       // 1% 神话
}

// 额外 1% 概率：闪光版本
const isShiny = rng() < 0.01
```

**18 种宠物**（部分）：Pebblecrab、Dustbunny、Mossfrog、Glowsquid...（名称在源码中以 `String.fromCharCode()` 混淆）

### 宠物属性

```typescript
type BuddyStats = {
  DEBUGGING: number   // 0-100
  PATIENCE: number
  CHAOS: number
  WISDOM: number
  SNARK: number
}
```

每次对话后，属性根据交互内容动态调整。

### ASCII 艺术

每种宠物有 5 行 ASCII 艺术和多帧动画：

```
  (•ᴗ•)    ← Pebblecrab（普通）
  /||\
  d  b

  ✧(•ᴗ•)✧  ← Pebblecrab 闪光版
  /||\
  d  b
```

### 宠物灵魂

宠物孵化时，Claude 会生成一段独特的"灵魂描述"——这只宠物的性格、兴趣和特点。每只宠物都是独一无二的。

## KAIROS：主动助手

`assistant/` 目录实现了一个**无需用户触发、主动观察并行动**的 AI 助手：

```typescript
// assistant/kairos.ts（简化）
class KairosAssistant {
  // 定时"滴答"——决定是否需要行动
  async tick(): Promise<void> {
    const context = await gatherContext()  // 读取日志、文件变化等

    // 调用模型判断是否需要主动行动
    const decision = await this.decide(context)

    if (decision.shouldAct) {
      // 15 秒预算：超时则推迟
      await withTimeout(15_000, () => this.act(decision.action))
    }
  }

  // 专属工具（普通会话没有）
  readonly exclusiveTools = [
    'SendUserFile',       // 主动发送文件给用户
    'PushNotification',   // 推送通知
    'SubscribePR',        // 订阅 PR 变化
  ]
}
```

**每日观察日志** — KAIROS 维护追加式日志，记录每天的观察，用于长期上下文积累。

## Undercover 模式

Anthropic 内部员工在向公开仓库贡献代码时，Claude Code 会自动进入"卧底"模式：

```typescript
// utils/undercover.ts
function isUndercoverActive(): boolean {
  // 强制开启
  if (process.env.CLAUDE_CODE_UNDERCOVER === '1') return true
  
  // Anthropic 员工 + 公开仓库 → 自动开启
  if (isAnthropicEmployee() && isPublicRepo()) return true
  
  return false
}
```

卧底模式下，Claude Code 会主动**隐藏**：
- 内部模型代号（Capybara、Tengu → 公开名称）
- 未发布的功能提及
- 内部工具链（Slack 频道、内部链接）
- Co-Authored-By 归因中的内部信息
- "Claude Code" 字样（在某些上下文）

## ULTRAPLAN：30分钟深度规划

一个将复杂规划任务 offload 到远程 Claude（Opus 4.6）的功能：

```typescript
// 30 分钟思考预算
const ULTRAPLAN_BUDGET_TOKENS = 150_000

// 本地轮询远程结果
while (!result) {
  await sleep(3_000)  // 每 3 秒检查一次
  result = await pollUltraplanResult(taskId)
}

// 结果通过 Teleport 机制注入本地会话
if (result.startsWith('__ULTRAPLAN_TELEPORT_LOCAL__')) {
  injectToLocalSession(result)
}
```

## 内部代号：Tengu

Claude Code 的内部项目代号是 **Tengu**（天狗，日本神话中的山神）。这个代号出现在 **100+** 个特性标志中：

```typescript
// 部分包含 tengu 的特性标志
'tengu_scratch'           // 多 Agent 共享便笺本
'tengu_penguins_off'      // Fast 模式 Kill Switch
'tengu_budget_reminder'   // Token 预算提醒
'tengu_caret_mode'        // 光标模式
'tengu_cowork'            // Cowork 模式
// ...
```

其他代号：
- **Fennec** — 早期 Opus 内部代号
- **Capybara** — 某个 Sonnet 版本内部代号
- **Penguin** — Fast 模式内部代号（penguin mode）

## 小结

Claude Code 的源码不只是一个 CLI 工具的实现——它包含了大量**面向未来**的功能、**内部工程文化**的体现（Tamagotchi 宠物！），以及精心设计的**安全机制**（Undercover 模式）。

这些"彩蛋"功能展示了 Anthropic 工程团队在构建 AI 工具时的思考方式：既有严肃的安全考量，也有充满趣味的设计。

---

**🎉 恭喜完成所有 19 章节的学习！**

你现在对 Claude Code 的架构有了全面的了解。欢迎查看[学习资料](/resources/)获取更多深度学习资源。
