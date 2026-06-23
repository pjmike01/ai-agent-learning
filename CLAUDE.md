# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目简介

这是一个基于 VitePress 的中文文档站点（`lang: zh-CN`），用于系统化学习 AI Agent 架构。纯内容项目——没有应用代码，只有 Markdown 文档加 VitePress 主题。部署在 GitHub Pages：`https://pjmike01.github.io/ai-agent-learning/`。

## 常用命令

```bash
npm install        # 安装依赖（需要 Node.js 18+）
npm run dev        # 启动开发服务器 http://localhost:5173
npm run build      # 构建静态站点到 docs/.vitepress/dist
npm run preview    # 本地预览构建产物
```

项目没有测试和 lint。唯一的「构建校验」就是 `npm run build` 能跑通。

## 部署

推送到 `main` 分支会触发 `.github/workflows/deploy.yml`，它执行 `npm ci && npm run build`，再通过 `peaceiris/actions-gh-pages` 把 `docs/.vitepress/dist` 发布到 GitHub Pages。无需手动部署。

## 架构与约定

- **`package.json` 必须保留 `"type": "module"`** —— 否则 VitePress 构建会报 ESM-cannot-be-required 错误。

- **`base: '/ai-agent-learning/'`** 在 `docs/.vitepress/config.ts` 中设置。这点很关键：正文（`.md` / HTML）里手写的绝对链接（例如 `docs/claude-code/index.md` 中 `module-card` 锚点）必须带上完整的 `/ai-agent-learning/...` 前缀；而 `config.ts` 的 `nav` / `sidebar` 用的是 base 相对路径，**不带**前缀（例如 `/claude-code/`）。搞混会导致只在线上出现、本地 `npm run dev` 看不出来的死链。

- **导航有两处来源**，新增或移动页面时必须同步：
  1. `docs/.vitepress/config.ts` —— `nav`（顶栏）和 `sidebar`（按 URL 前缀分组，如 `/claude-code/`）。
  2. 各 `index.md` 里的页面内链接网格（`.module-grid` / `.module-card` HTML 块）。

- **内容模块**位于 `docs/<module>/`。`claude-code/` 和 `ai-agent/` 是完整内容；`openclaw/`、`harness/`、`ai-coding/` 是占位页，使用 `.coming-soon` CSS 块。每个模块目录都有一个 `index.md` 作为导读/落地页。

- **自定义主题**在 `docs/.vitepress/theme/`：`index.ts` 继承默认主题，导入 `custom.css`（紫色品牌色 + `.module-card`、`.resource-card`、`.coming-soon`、`.chapter-badge` 等类），并全局注册 `ResourceCard.vue` 组件。

- **`ResourceCard` 组件**用于 `docs/resources/index.md` 的精选链接。它的 `tags` prop 是**字符串**而非数组——写法是 `tags="['架构', '深度']"`（双引号内套单引号）；组件内部把单引号替换成双引号后用 `JSON.parse` 解析。新增资源时照搬现有条目的格式即可。

- **静态资源**放在 `docs/public/`（如 `logo.svg`），引用时省略 `public/` 这一段。
