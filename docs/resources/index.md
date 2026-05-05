# 精选学习资料

本页汇总 AI Agent 相关的优质学习资源，涵盖官方文档、架构分析、设计模式和工程实践。

## Claude Code 相关

<ResourceCard
  title="Claude Code 官方文档"
  source="Anthropic"
  desc="Claude Code CLI 工具的官方使用文档，包含安装、配置、命令参考等。"
  url="https://docs.anthropic.com/en/docs/claude-code"
  tags="['官方', 'Claude Code']"
/>

<ResourceCard
  title="Claude Code 源码架构解读"
  source="ShareAI"
  desc="系统化的 Claude Code 源码学习路径，19 个章节递进式讲解 Agent 架构。"
  url="https://learn.shareai.run/zh/s01/"
  tags="['架构', '深度']"
/>

## AI Agent 设计模式

<ResourceCard
  title="Building Effective Agents"
  source="Anthropic"
  desc="Anthropic 官方的 Agent 构建指南，介绍 Agent 循环、工具使用、上下文管理的最佳实践。"
  url="https://docs.anthropic.com/en/docs/build-with-claude/agentic"
  tags="['Agent', '设计模式']"
/>

<ResourceCard
  title="Tool Use 最佳实践"
  source="Anthropic"
  desc="Claude 工具使用的设计原则，如何定义好的工具 Schema，错误处理策略。"
  url="https://docs.anthropic.com/en/docs/build-with-claude/tool-use"
  tags="['工具', 'API']"
/>

<ResourceCard
  title="Prompt Caching 指南"
  source="Anthropic"
  desc="Prompt 缓存的使用方法，理解如何通过缓存降低 90% 的输入成本。"
  url="https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching"
  tags="['缓存', '优化']"
/>

## MCP 协议

<ResourceCard
  title="Model Context Protocol 规范"
  source="Anthropic"
  desc="MCP 协议的完整规范文档，理解 Agent 如何通过 MCP 扩展能力。"
  url="https://modelcontextprotocol.io/"
  tags="['官方', 'MCP']"
/>

## Claude API

<ResourceCard
  title="Claude API 文档"
  source="Anthropic"
  desc="Claude API 的完整参考，包括流式调用、工具使用、Prompt 缓存等核心功能。"
  url="https://docs.anthropic.com/en/docs"
  tags="['官方', 'API']"
/>

<ResourceCard
  title="Anthropic Cookbook"
  source="GitHub · Anthropic"
  desc="Anthropic 官方的实践示例集，包含 Tool Use、Prompt Caching 等最佳实践。"
  url="https://github.com/anthropics/anthropic-cookbook"
  tags="['官方', '实践']"
/>

## 相关技术栈

<ResourceCard
  title="Ink：React for CLI"
  source="GitHub · vadimdemedes"
  desc="Claude Code 终端 UI 的基础框架，用 React 组件构建交互式命令行界面。"
  url="https://github.com/vadimdemedes/ink"
  tags="['UI', 'React']"
/>

<ResourceCard
  title="Zod：TypeScript Schema 校验"
  source="GitHub · colinhacks"
  desc="Claude Code 工具系统使用 Zod 进行输入校验，理解 Zod 有助于理解工具定义。"
  url="https://zod.dev/"
  tags="['Schema', 'TypeScript']"
/>

<ResourceCard
  title="LangGraph"
  source="LangChain"
  desc="基于图结构的 Agent 工作流框架，适合构建复杂的多步骤 Agent。"
  url="https://langchain-ai.github.io/langgraph/"
  tags="['Agent', '框架']"
/>

---

## 如何添加新资料

在本文件中按照以下格式添加：

```html
<ResourceCard
  title="文章标题"
  source="来源网站"
  desc="一句话简介"
  url="https://example.com"
  tags="['标签1', '标签2']"
/>
```
