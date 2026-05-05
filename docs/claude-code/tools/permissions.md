# c09 · 权限系统

<span class="chapter-badge">c09</span> **权限系统** — 六种执行模式，八层规则来源，构成 Claude Code 安全执行的核心防线。

<div class="source-path">📁 types/permissions.ts · hooks/useCanUseTool.tsx · utils/permissions/</div>

## 为什么需要权限系统

Claude Code 能执行任意 Shell 命令、修改任意文件。没有权限控制，一个"有问题"的模型响应可能删除重要文件或泄露敏感数据。权限系统在工具执行前提供了可配置的安全门控。

## 六种执行模式

```typescript
type PermissionMode =
  | 'default'           // 交互式提示（默认）
  | 'auto'              // ML 自动决策（AFK 模式）
  | 'acceptEdits'       // 自动接受文件编辑，其他工具仍提示
  | 'bypassPermissions' // 跳过所有检查（受控场景）
  | 'dontAsk'           // 自动拒绝所有工具
  | 'plan'              // 只读预览模式
```

| 模式 | 适用场景 |
|------|---------|
| `default` | 日常交互使用，每次工具调用都询问 |
| `auto` | 无人值守长时间任务，ML 分类器决策 |
| `acceptEdits` | 信任模型的代码修改，只对 Bash 等询问 |
| `bypassPermissions` | CI/CD 流水线、受信任的自动化环境 |
| `dontAsk` | 只想聊天不执行任何工具 |
| `plan` | 预览模型意图，不实际执行 |

## 八层规则来源

权限规则按优先级从低到高叠加：

```
优先级（低 → 高）
┌──────────────────────────────────────────┐
│ 1. 默认值（工具自带 checkPermissions）     │
│ 2. 用户设置 (~/.claude/settings.json)     │
│ 3. 项目设置 (.claude/settings.json)       │
│ 4. 本地设置 (.claude/settings.local.json) │
│ 5. 策略设置（企业 GrowthBook 远程）        │
│ 6. CLI 参数 (--allow-bash "git *")        │
│ 7. 斜杠命令会话规则 (/allow Bash)         │
│ 8. 运行时覆盖（代码中显式设置）            │
└──────────────────────────────────────────┘
```

```typescript
type ToolPermissionContext = {
  mode: PermissionMode
  alwaysAllowRules: ToolPermissionRulesBySource  // 按来源分组的放行规则
  alwaysDenyRules: ToolPermissionRulesBySource   // 按来源分组的拒绝规则
  alwaysAskRules: ToolPermissionRulesBySource    // 强制询问规则
  // ...
}

// 规则格式：工具名(可选条件)
// 示例：
//   "Bash"           → 放行所有 Bash 调用
//   "Bash(git *)"    → 只放行 git 开头的命令
//   "Read"           → 放行所有文件读取
//   "Write(/tmp/*)"  → 只允许写入 /tmp 目录
```

## 权限决策流程

```
工具调用请求
     │
     ▼ hasPermissionsToUseTool()
     │
     ├─ 检查 alwaysDenyRules → 匹配 → 拒绝（不询问）
     │
     ├─ 检查 alwaysAllowRules → 匹配 → 放行（不询问）
     │
     ├─ 执行 tool.checkPermissions() → 工具自带逻辑
     │
     ├─ 执行 permission hooks → settings.json 中配置的 shell hooks
     │
     ├─ mode == 'bypassPermissions'? → 放行
     │
     ├─ mode == 'auto'? → ML 分类器决策（TRANSCRIPT_CLASSIFIER 特性）
     │         ├─ 分类为安全 → 放行
     │         └─ 分类为风险 / 达到拒绝阈值 → 降级到交互提示
     │
     └─ mode == 'default' → 展示 UI 对话框等待用户确认
```

## 权限规则语法

规则支持 glob 风格的条件匹配：

```json
// ~/.claude/settings.json
{
  "permissions": {
    "allow": [
      "Bash(git *)",
      "Bash(npm test)",
      "Read",
      "Write(src/**)",
      "Edit(src/**)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(curl *)",
      "Write(/etc/*)"
    ]
  }
}
```

## Auto 模式与 Denial 追踪

Auto 模式下，ML 分类器通过分析**历史对话 + 当前工具调用**来判断是否放行：

```typescript
// utils/permissions/denialTracking.ts
type DenialTrackingState = {
  denialCount: number      // 自动拒绝次数
  successCount: number     // 成功执行次数
  lastDecisionTime: number | null
}

const DENIAL_LIMITS = {
  INITIAL_THRESHOLD: 3,   // 连续 3 次自动拒绝后降级到交互提示
  RESET_SUCCESS_COUNT: 2, // 连续 2 次成功后重置计数器
}
```

**降级机制** 防止自动模式在不确定情况下无限循环：连续拒绝超过阈值时，系统会要求用户手动确认，避免 Agent 卡死。

## 受保护文件

某些文件无论何种模式都会额外警告：

```typescript
const PROTECTED_FILES = [
  '.gitconfig',
  '.bashrc', '.zshrc', '.zprofile',
  '.profile', '.bash_profile',
  '.mcp.json',
  '.claude.json',
  // SSH 密钥等
]
```

## 权限解释器

在展示交互确认对话框之前，Claude Code 可以调用一次额外的 API，生成对当前操作风险的**人类可读解释**：

```
┌─────────────────────────────────────────────┐
│ Claude 想要执行以下命令：                     │
│                                             │
│   rm -rf ./node_modules                     │
│                                             │
│ 风险说明：此命令将递归删除 node_modules       │
│ 目录。该目录可通过 npm install 重建，         │
│ 不会丢失重要数据。                           │
│                                             │
│  [允许]  [拒绝]  [始终允许此命令]             │
└─────────────────────────────────────────────┘
```

## 下一章

工具系统基本介绍完毕。下一模块进入 MCP 集成——Claude Code 如何通过标准协议接入外部服务。

→ [c10 · MCP 架构](/claude-code/mcp/architecture)
