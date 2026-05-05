# c18 · 技能与插件

<span class="chapter-badge">c18</span> **技能与插件** — Skills 是用户自定义的可复用工作流，Hooks 提供了 13 个生命周期挂载点来扩展 Claude Code。

<div class="source-path">📁 skills/ · hooks/ · services/mcp/channelPermissions.ts</div>

## Skills：可复用工作流

Skills 是存储在 `.claude/skills/` 目录下的 Markdown 文件，定义可复用的工作模式：

```
项目/.claude/skills/
├── code-review.md      # 代码审查工作流
├── refactor.md         # 重构模式
└── deploy.md           # 部署流程

~/.claude/skills/
├── daily-standup.md    # 个人习惯性工作流
└── commit-message.md   # 提交消息风格
```

**Skill 文件格式：**

```markdown
---
name: code-review
description: 执行全面的代码审查，检查安全性、性能和代码风格
triggers:
  - "code review"
  - "审查代码"
  - "review"
---

# 代码审查工作流

1. 首先阅读变更的完整 diff
2. 检查安全问题（SQL 注入、XSS、路径遍历）
3. 评估性能影响
4. 验证错误处理
5. 检查测试覆盖率
6. 生成结构化报告
```

## Skill 自动激活

当文件读取工具读取相关文件时，系统会自动推荐关联的 Skill：

```typescript
// skills/skillActivation.ts
async function onFileRead(filePath: string, skills: Skill[]): Promise<Skill[]> {
  const relevantSkills = skills.filter(skill =>
    skill.filePatterns.some(pattern => minimatch(filePath, pattern))
  )

  if (relevantSkills.length > 0) {
    // 注入系统消息提示用户
    appendSystemMessage({
      type: 'system',
      content: `发现相关技能：${relevantSkills.map(s => s.name).join(', ')}`,
    })
  }

  return relevantSkills
}
```

## Skill 发现（延迟加载）

通过 `skillPrefetch()` 在每轮对话前预先加载相关 Skill：

```typescript
// services/skills/skillPrefetch.ts
async function skillPrefetch(
  messages: Message[],
  skills: Skill[],
): Promise<AttachmentMessage[]> {
  // 分析最近的对话上下文
  const context = extractContext(messages.slice(-10))
  
  // 向量相似度搜索（或关键词匹配）
  const relevant = await findRelevantSkills(context, skills)
  
  // 作为 AttachmentMessage 注入
  return relevant.map(skill => makeSkillAttachment(skill))
}
```

## Hooks：生命周期扩展

Hooks 是 `settings.json` 中配置的 Shell 命令，在特定事件时执行：

```json
// .claude/settings.json
{
  "hooks": {
    "preToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo '执行 Bash 工具前' >> ~/.claude/audit.log"
          }
        ]
      }
    ],
    "postToolUse": [
      {
        "matcher": "FileEdit|FileWrite",
        "hooks": [
          {
            "type": "command",
            "command": "npm run lint -- ${file}"
          }
        ]
      }
    ],
    "sessionStart": [
      {
        "type": "command",
        "command": "echo '新会话开始' | notify-send"
      }
    ]
  }
}
```

## 13 个 Hook 挂载点

```typescript
type HookEvent =
  | 'preToolUse'         // 工具执行前
  | 'postToolUse'        // 工具执行后
  | 'preCompact'         // 上下文压缩前
  | 'postCompact'        // 上下文压缩后
  | 'sessionStart'       // 会话开始
  | 'sessionEnd'         // 会话结束
  | 'permissionRequest'  // 权限请求时
  | 'preSampling'        // API 调用前
  | 'postSampling'       // API 调用后
  | 'onError'            // 错误发生时
  | 'onInterrupt'        // 用户中断时
  | 'onCostThreshold'    // 成本阈值告警
  | 'onTokenBudget'      // Token 预算告警
```

## Hook 执行机制

```typescript
// hooks/executeHooks.ts
async function executeHooks(
  event: HookEvent,
  context: HookContext,
): Promise<HookResult[]> {
  const hooks = getMatchingHooks(event, context.toolName)
  
  const results = await Promise.all(
    hooks.map(async hook => {
      // 替换模板变量
      const command = interpolate(hook.command, context)
      
      // 执行 Shell 命令
      const { stdout, stderr, exitCode } = await exec(command, {
        timeout: hook.timeout ?? 30_000,
        env: { ...process.env, ...context.env },
      })

      return { hook, stdout, stderr, exitCode }
    })
  )

  // exitCode 非 0 可以阻止工具执行（仅 preToolUse）
  return results
}
```

**阻止工具执行**：`preToolUse` Hook 返回非零退出码时，工具调用被取消，原因注入消息历史。

## 插件通道权限

MCP 插件有独立的通道权限控制：

```typescript
// services/mcp/channelPermissions.ts
type PluginChannel = {
  id: string
  name: string
  permissions: {
    canReadFiles: boolean
    canWriteFiles: boolean
    canExecuteShell: boolean
    allowedPaths?: string[]
  }
}

// 插件只能访问其声明的权限范围
function checkPluginPermission(
  pluginId: string,
  action: PluginAction,
): boolean {
  const channel = getPluginChannel(pluginId)
  return isActionAllowed(channel.permissions, action)
}
```

## 下一章

最后一章揭秘 Claude Code 源码中那些有趣的彩蛋和内部功能。

→ [c19 · 特殊功能彩蛋](/claude-code/advanced/special-features)
