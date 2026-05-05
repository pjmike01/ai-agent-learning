import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AI Agent Learning',
  description: '系统化学习 AI Agent 架构、源码分析与工程实践',
  lang: 'zh-CN',
  base: '/ai-agent-learning/',

  head: [
    ['link', { rel: 'icon', href: '/ai-agent-learning/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'AI Agent Learning',

    nav: [
      { text: '首页', link: '/' },
      {
        text: '模块',
        items: [
          { text: 'Claude Code 源码分析', link: '/claude-code/' },
          { text: 'OpenClaw 架构学习', link: '/openclaw/' },
          { text: 'Harness Engineering', link: '/harness/' },
          { text: 'AI Coding', link: '/ai-coding/' },
          { text: 'AI Agent 架构', link: '/ai-agent/' },
        ],
      },
      { text: '学习资料', link: '/resources/' },
    ],

    sidebar: {
      '/claude-code/': [
        {
          text: 'Claude Code 源码分析',
          items: [
            { text: '模块导读', link: '/claude-code/' },
            { text: 'c01 · 项目概览', link: '/claude-code/overview' },
          ],
        },
        {
          text: '核心架构',
          collapsed: false,
          items: [
            { text: '导读', link: '/claude-code/core/' },
            { text: 'c02 · 启动流程', link: '/claude-code/core/bootstrap' },
            { text: 'c03 · Agent 主循环', link: '/claude-code/core/agent-loop' },
            { text: 'c04 · QueryEngine', link: '/claude-code/core/query-engine' },
            { text: 'c05 · 消息系统', link: '/claude-code/core/message-system' },
          ],
        },
        {
          text: '工具系统',
          collapsed: false,
          items: [
            { text: '导读', link: '/claude-code/tools/' },
            { text: 'c06 · Tool 类型系统', link: '/claude-code/tools/tool-system' },
            { text: 'c07 · 内置工具详解', link: '/claude-code/tools/builtin-tools' },
            { text: 'c08 · 并发控制', link: '/claude-code/tools/concurrency' },
            { text: 'c09 · 权限系统', link: '/claude-code/tools/permissions' },
          ],
        },
        {
          text: 'MCP 集成',
          collapsed: false,
          items: [
            { text: '导读', link: '/claude-code/mcp/' },
            { text: 'c10 · MCP 架构', link: '/claude-code/mcp/architecture' },
            { text: 'c11 · MCPTool 包装', link: '/claude-code/mcp/tool-wrapping' },
          ],
        },
        {
          text: '上下文与记忆',
          collapsed: false,
          items: [
            { text: '导读', link: '/claude-code/context/' },
            { text: 'c12 · Prompt 系统', link: '/claude-code/context/prompt-system' },
            { text: 'c13 · 记忆系统', link: '/claude-code/context/memory' },
            { text: 'c14 · 成本追踪', link: '/claude-code/context/cost-tracking' },
          ],
        },
        {
          text: '高级特性',
          collapsed: false,
          items: [
            { text: '导读', link: '/claude-code/advanced/' },
            { text: 'c15 · 多 Agent 协调', link: '/claude-code/advanced/multi-agent' },
            { text: 'c16 · 状态管理', link: '/claude-code/advanced/state-management' },
            { text: 'c17 · 终端 UI 系统', link: '/claude-code/advanced/ui-components' },
            { text: 'c18 · 技能与插件', link: '/claude-code/advanced/skills-plugins' },
            { text: 'c19 · 特殊功能彩蛋', link: '/claude-code/advanced/special-features' },
          ],
        },
      ],

      '/ai-agent/': [
        {
          text: 'AI Agent 架构',
          items: [
            { text: '导读', link: '/ai-agent/' },
            { text: '什么是 AI Agent', link: '/ai-agent/what-is-agent' },
            { text: 'ReAct 模式', link: '/ai-agent/react-pattern' },
            { text: 'Tool Use 设计', link: '/ai-agent/tool-use' },
            { text: '记忆与上下文管理', link: '/ai-agent/memory-context' },
            { text: 'Multi-Agent 架构', link: '/ai-agent/multi-agent' },
            { text: '评估与可观测性', link: '/ai-agent/evaluation' },
          ],
        },
      ],

      '/openclaw/': [
        {
          text: 'OpenClaw 架构学习',
          items: [
            { text: '概述', link: '/openclaw/' },
          ],
        },
      ],

      '/harness/': [
        {
          text: 'Harness Engineering',
          items: [
            { text: '概述', link: '/harness/' },
          ],
        },
      ],

      '/ai-coding/': [
        {
          text: 'AI Coding',
          items: [
            { text: '概述', link: '/ai-coding/' },
          ],
        },
      ],

      '/resources/': [
        {
          text: '学习资料',
          items: [
            { text: '精选资料', link: '/resources/' },
          ],
        },
      ],
    },

    search: {
      provider: 'local',
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/anthropics/claude-code' },
    ],

    footer: {
      message: 'AI Agent Learning — 系统化学习 AI Agent 技术栈',
      copyright: '© 2025',
    },

    outline: {
      label: '本页目录',
      level: [2, 3],
    },

    docFooter: {
      prev: '上一章',
      next: '下一章',
    },

    lastUpdated: {
      text: '最后更新',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
})
