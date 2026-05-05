# c01 · 项目概览

<span class="chapter-badge">c01</span> **项目概览** — 本章建立对 Claude Code 整体结构的认知地图，是后续所有章节的索引。

<div class="source-path">📁 ~/IdeaProjects/claude-code-main/</div>

## 这是什么

Claude Code 是 Anthropic 官方出品的 **AI 编程 CLI 工具**，以 TypeScript 编写，运行在 Node.js / Bun 环境中。它的核心能力是：

- 在终端中与 Claude 模型交互，执行真实的文件操作、代码运行、Git 命令
- 通过 **工具系统** 将模型的意图转化为真实副作用
- 通过 **MCP** 协议扩展接入外部服务
- 支持多 Agent 协调、后台任务、远程控制等高级模式

## 技术栈

| 层次 | 技术 |
|------|------|
| 运行时 | Bun（生产）/ Node.js（兼容） |
| 语言 | TypeScript 5.x |
| 终端 UI | [Ink](https://github.com/vadimdemedes/ink)（React for CLI）|
| 状态管理 | 自定义 Zustand-like Store |
| Schema 校验 | Zod |
| 构建工具 | Bun bundle（含编译期特性开关） |
| 测试 | Vitest |
| AI 模型 | Anthropic Claude API（流式） |

## 目录结构速查

```
claude-code-main/               # 1,884 个 TS/TSX 文件，约 34MB
│
├── entrypoints/                # 入口点
│   ├── cli.tsx                 # CLI 主入口（命令行解析、模式路由）
│   ├── mcp.ts                  # MCP Server 模式入口
│   └── agentSdkTypes.ts        # Agent SDK 类型导出
│
├── main.tsx                    # REPL 应用根组件（785KB）
├── query.ts                    # ★ Agent 主循环（异步生成器）
├── QueryEngine.ts              # ★ 循环编排器（配置、生命周期）
├── Tool.ts                     # ★ 工具类型系统与注册
├── Task.ts                     # 后台任务与子 Agent 管理
├── commands.ts                 # 斜杠命令注册表
├── context.ts                  # Git 状态、CLAUDE.md 注入、上下文组装
├── cost-tracker.ts             # Token 计量与成本追踪
│
├── tools/                      # 40+ 工具实现（每个独立子目录）
│   ├── BashTool/
│   ├── FileReadTool/
│   ├── FileEditTool/
│   ├── FileWriteTool/
│   ├── AgentTool/
│   ├── MCPTool/
│   └── ...
│
├── services/
│   ├── api/claude.ts           # Anthropic API 流式调用封装
│   ├── tools/toolOrchestration.ts  # 并发调度（读写分区）
│   ├── compact/                # 上下文压缩（auto/reactive/snip）
│   ├── mcp/                    # MCP 连接管理
│   └── autoDream/              # 记忆整合（Dream 机制）
│
├── state/
│   └── AppStateStore.ts        # 全局状态（消息、权限、成本）
│
├── components/                 # 146 个 Ink/React 终端 UI 组件
├── hooks/                      # 87 个生命周期 Hooks
├── constants/                  # 系统 Prompt、Feature Flags、工具列表
├── types/                      # 共享类型定义（message、permissions 等）
│
├── coordinator/                # 多 Agent 协调模式（feature-gated）
├── assistant/                  # KAIROS 主动助手（feature-gated）
├── bridge/                     # 远程控制（claude.ai 集成）
├── buddy/                      # 彩蛋：Tamagotchi 宠物（feature-gated）
│
├── memdir/                     # 记忆系统（CLAUDE.md 附加、整合）
├── skills/                     # 用户自定义技能目录
├── migrations/                 # 模型代号迁移脚本
└── bootstrap/
    └── state.ts                # 全局状态初始化（Session、Cost、遥测）
```

## 核心模块依赖关系

```
entrypoints/cli.tsx
        │
        ▼
   main.tsx  ──────────────── AppStateStore
        │                           │
        ▼                           │
  QueryEngine.ts  ◄─────────────────┘
        │
        ├──► query.ts (Agent 主循环)
        │         │
        │         ├──► services/api/claude.ts  ──► Anthropic API
        │         │
        │         ├──► services/tools/toolOrchestration.ts
        │         │         │
        │         │         └──► tools/*/  (40+ 工具)
        │         │
        │         └──► services/compact/  (上下文压缩)
        │
        ├──► context.ts  (系统 Prompt 组装)
        │         │
        │         └──► memdir/  (CLAUDE.md 注入)
        │
        └──► components/  (终端 UI 渲染)
```

## 模块一览

| 章节 | 内容 | 核心文件 |
|------|------|---------|
| [c02 启动流程](/claude-code/core/bootstrap) | CLI 解析 → 初始化 → REPL 启动 | `entrypoints/cli.tsx`, `main.tsx` |
| [c03 Agent 主循环](/claude-code/core/agent-loop) | query() 异步生成器、5步执行周期 | `query.ts` |
| [c04 QueryEngine](/claude-code/core/query-engine) | 循环编排、配置项、submitMessage | `QueryEngine.ts` |
| [c05 消息系统](/claude-code/core/message-system) | 7种消息类型、ToolResult 结构 | `types/message.ts` |
| [c06 Tool 类型系统](/claude-code/tools/tool-system) | Tool\<I,O\> 接口、buildTool 模式 | `Tool.ts`, `tools.ts` |
| [c07 内置工具详解](/claude-code/tools/builtin-tools) | 40+ 工具分类、Bash/FileRead 解析 | `tools/*/` |
| [c08 并发控制](/claude-code/tools/concurrency) | 读写分区、10并发、批次调度 | `services/tools/toolOrchestration.ts` |
| [c09 权限系统](/claude-code/tools/permissions) | 6种模式、8层规则来源 | `types/permissions.ts` |
| [c10 MCP 架构](/claude-code/mcp/architecture) | 5种传输、连接生命周期 | `services/mcp/` |
| [c11 MCPTool 包装](/claude-code/mcp/tool-wrapping) | 延迟加载、ToolSearch | `tools/MCPTool/` |
| [c12 Prompt 系统](/claude-code/context/prompt-system) | 静态/动态缓存分区 | `constants/prompts.ts` |
| [c13 记忆系统](/claude-code/context/memory) | CLAUDE.md、Dream 整合 | `memdir/`, `services/autoDream/` |
| [c14 成本追踪](/claude-code/context/cost-tracking) | ModelUsage、OpenTelemetry | `cost-tracker.ts` |
| [c15 多 Agent 协调](/claude-code/advanced/multi-agent) | coordinator 4阶段、Task 子代理 | `coordinator/`, `Task.ts` |
| [c16 状态管理](/claude-code/advanced/state-management) | AppStateStore、投机 fork | `state/AppStateStore.ts` |
| [c17 终端 UI 系统](/claude-code/advanced/ui-components) | Ink/React、权限对话框 | `components/` |
| [c18 技能与插件](/claude-code/advanced/skills-plugins) | Skills、Hook 扩展点 | `skills/`, `hooks/` |
| [c19 特殊功能彩蛋](/claude-code/advanced/special-features) | BUDDY 宠物、KAIROS、Feature Flags | `buddy/`, `assistant/` |

## 规模参考

- **1,884** 个 TypeScript/TSX 文件
- **34 MB** 源码总大小
- **40+** 内置工具
- **20+** 编译期 Feature Flags
- **146** 个终端 UI 组件
- **87** 个生命周期 Hooks
