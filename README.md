# AI Agent Learning

> 系统化学习 AI Agent 架构与源码分析的开源学习站点

在线访问：**https://pjmike01.github.io/ai-agent-learning/**

本站基于 [VitePress](https://vitepress.dev/) 构建，从真实产品源码出发，拆解 AI Agent 的核心设计与工程实践。

## 模块总览

| 模块 | 说明 | 状态 |
|------|------|------|
| 🔍 **Claude Code 源码分析** | 拆解 Claude Code 源码，19 个章节从启动流程到多 Agent 协调逐层递进 | ✅ 已完成 |
| 🧠 **AI Agent 架构** | 通用 Agent 设计模式：ReAct、Tool Use、记忆与上下文、Multi-Agent、评估 | ✅ 已完成 |
| 🏗️ **OpenClaw 架构学习** | OpenClaw 架构解析 | 🚧 建设中 |
| ⚙️ **Harness Engineering** | Harness 工程实践与架构 | 🚧 建设中 |
| 💻 **AI Coding** | AI 辅助编程实践 | 🚧 建设中 |
| 📚 **学习资料** | 精选 AI Agent 相关的优质学习资源 | ✅ 已完成 |

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 构建静态站点
npm run build

# 本地预览构建产物
npm run preview
```

> 需要 Node.js 18+ 环境。

## 目录结构

```
.
├── docs/
│   ├── .vitepress/
│   │   ├── config.ts          # 站点配置：导航、侧边栏、主题
│   │   ├── theme/             # 自定义主题与组件（ResourceCard 等）
│   │   └── public/            # 静态资源（logo 等）
│   ├── index.md               # 首页
│   ├── claude-code/           # Claude Code 源码分析（c01–c19）
│   ├── ai-agent/              # AI Agent 架构
│   ├── openclaw/              # OpenClaw（占位）
│   ├── harness/               # Harness Engineering（占位）
│   ├── ai-coding/             # AI Coding（占位）
│   └── resources/             # 学习资料
├── .github/workflows/deploy.yml  # GitHub Pages 自动部署
└── package.json
```

## 部署

推送到 `main` 分支后，[GitHub Actions](.github/workflows/deploy.yml) 会自动构建并发布到 GitHub Pages。

## 贡献

欢迎补充内容或修正错误：在 `docs/` 下相应目录新增/编辑 Markdown 文件后提交 PR 即可。新增学习资料可参考 [`docs/resources/index.md`](docs/resources/index.md) 中的 `ResourceCard` 写法。

## License

MIT
