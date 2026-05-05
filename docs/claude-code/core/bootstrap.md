# c02 · 启动流程

<span class="chapter-badge">c02</span> **启动流程** — 从用户输入 `claude` 到 REPL 渲染完成，理解每个初始化步骤的目的。

<div class="source-path">📁 entrypoints/cli.tsx · main.tsx · bootstrap/state.ts</div>

## 总览

Claude Code 的启动是一条**快速路径 + 完整初始化**的双轨设计：某些模式（如 `--version`）几乎不加载任何模块；常规 REPL 模式则经历完整的多阶段初始化。

```
$ claude
     │
     ▼
entrypoints/cli.tsx          ← Bun/Node 入口，解析 argv
     │
     ├─ --version?           → 直接输出版本号退出（不加载任何模块）
     ├─ --dump-system-prompt → 仅 Anthropic 内部可用
     ├─ --daemon-worker      → 后台进程模式
     ├─ --bridge             → 远程控制模式（claude.ai 集成）
     ├─ ps/logs/attach/kill  → 后台会话管理
     │
     └─ [默认 REPL 模式]
              │
              ▼
        entrypoints/init.ts
              │
              ├─ enableConfigs()           ← 加载 settings.json 各层
              ├─ initializeGrowthBook()    ← 特性开关（远程拉取）
              ├─ validateAuth()            ← API Key / OAuth 校验
              ├─ launchSetupScreens()      ← 首次使用引导
              │
              └─► main.tsx
                    │
                    ├─ AppStateProvider    ← 挂载全局状态树
                    ├─ QueryEngine.create  ← 初始化 Agent 引擎
                    └─ launchRepl()        ← 渲染 Ink 终端 UI
                              │
                              └─► renderAndRun()  ← 事件主循环
```

## 阶段一：命令行解析

`entrypoints/cli.tsx` 是 Bun bundle 的真正入口点。它处理多种执行模式：

```typescript
// 快速路径 —— 不触发模块初始化
if (argv.includes('--version')) {
  console.log(VERSION)
  process.exit(0)
}

// 守护进程工作者
if (argv.includes('--daemon-worker')) {
  await runDaemonWorker()
  process.exit(0)
}

// Bridge 模式（远程控制）
if (argv.includes('--bridge')) {
  await runBridgeMode()
  process.exit(0)
}
```

**快速路径的意义：** `--version` 不需要加载 34MB 的模块图，延迟极低。这是 CLI 工具的标准优化。

## 阶段二：配置加载

`enableConfigs()` 按**优先级从低到高**叠加多个配置层：

| 层级 | 文件位置 | 说明 |
|------|---------|------|
| 默认值 | 内置 | 工厂默认配置 |
| 用户级 | `~/.claude/settings.json` | 跨项目生效 |
| 项目级 | `.claude/settings.json` | 提交到 Git，团队共享 |
| 本地级 | `.claude/settings.local.json` | gitignore，个人覆盖 |
| 策略级 | 远程 GrowthBook | 企业组织策略 |
| CLI 参数 | `--allow-bash` 等 | 最高优先级 |

## 阶段三：特性开关初始化

```typescript
await initializeGrowthBook()
// 拉取远程特性配置（带陈旧缓存）
const featureValue = GrowthBook.getFeatureValueSync(staleCache)
```

GrowthBook 控制 20+ 个编译期/运行时特性开关（见 [c19 特殊功能](/claude-code/advanced/special-features)）。这步拉取是**异步非阻塞**的——使用上次缓存的值启动，后台更新。

## 阶段四：认证校验

```typescript
await validateAuth()
// 检查顺序：
// 1. ANTHROPIC_API_KEY 环境变量
// 2. ~/.claude/auth.json（OAuth token）
// 3. 引导用户完成 OAuth 流程
```

认证失败会直接退出并提示用户。

## 阶段五：AppState 挂载

`main.tsx` 在渲染 UI 之前挂载全局状态树：

```typescript
// bootstrap/state.ts 初始化的状态结构
type State = {
  sessionId: SessionId          // 当前会话 UUID
  parentSessionId?: SessionId   // 子代理的父会话
  originalCwd: string           // 启动时的工作目录
  projectRoot: string           // 稳定的项目根目录
  totalCostUSD: number          // 累计费用
  modelUsage: { [model]: ModelUsage }  // 分模型用量
  isInteractive: boolean        // 是否交互模式
  mainLoopModelOverride?: ModelSetting
  // ... 30+ 字段
}
```

## 阶段六：Ink 终端渲染

```typescript
await launchRepl({
  queryEngine,
  appState,
  // ...
})
// 底层：renderAndRun() 启动 React/Ink 事件循环
```

Ink 是 React 的终端版本——JSX 组件树渲染为 ANSI 转义码。整个 Claude Code 的 UI（输入框、进度条、工具结果、权限对话框）都是 React 组件。

## 关键设计决策

::: info 为什么用 Ink？
终端 UI 本质上也是树形状态驱动的。Ink 让 Claude Code 可以用 React 的状态机模型管理复杂的流式更新——工具执行中的进度条、并发工具的独立更新区块，用回调方式实现会非常混乱。
:::

::: warning 后台任务模式
`--daemon-worker` 启动一个独立进程，与主 REPL 通过 IPC 通信。`ps/attach/kill` 子命令管理这些后台会话，实现"关闭终端不中断任务"。
:::

## 下一章

理解了启动流程后，下一章深入 Agent 主循环——`query.ts` 中那个持续运行的异步生成器。

→ [c03 · Agent 主循环](/claude-code/core/agent-loop)
