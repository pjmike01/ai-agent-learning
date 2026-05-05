# c17 · 终端 UI 系统

<span class="chapter-badge">c17</span> **终端 UI 系统** — Claude Code 用 React 构建终端界面，146 个 Ink 组件渲染出完整的 CLI 交互体验。

<div class="source-path">📁 components/ · cli/print.ts</div>

## Ink：React for CLI

[Ink](https://github.com/vadimdemedes/ink) 是 React 的终端适配版本：

```
React（Web）         Ink（终端）
─────────────        ─────────────────
<div>           →    <Box>
<span>          →    <Text>
CSS flexbox     →    yoga layout（同款）
DOM 渲染        →    ANSI 转义码渲染
```

Claude Code 的终端界面本质上是一棵 React 树，通过 Ink 渲染为 ANSI 转义码输出到终端。

## 组件架构（146 个组件）

```
REPL 根组件（main.tsx）
├── InputArea                    # 用户输入区
│   ├── TextInput                # 文本输入框
│   └── CommandSuggestions       # 斜杠命令补全
├── MessageList                  # 消息历史
│   ├── UserMessageItem          # 用户消息
│   ├── AssistantMessageItem     # 助手消息
│   │   ├── TextContent          # 文本块（Markdown 渲染）
│   │   ├── ThinkingBlock        # 思考块（折叠显示）
│   │   └── ToolUseBlock         # 工具调用块
│   │       ├── ToolProgress     # 执行进度
│   │       └── ToolResult       # 执行结果
│   └── SystemMessageItem        # 系统消息
├── PermissionDialog             # 权限确认对话框
├── StatusBar                    # 底部状态栏（模型、费用、Token）
└── Modals                       # 各种弹窗
    ├── ConfigDialog             # 配置界面
    └── AutoModeOptInDialog      # Auto 模式引导
```

## 权限对话框

权限对话框是最复杂的 UI 组件之一：

```typescript
// components/PermissionRequest.tsx（简化）
function PermissionRequest({
  tool,
  input,
  description,
  onDecide,
}: PermissionRequestProps) {
  const [selected, setSelected] = useState<Decision>('allow')

  return (
    <Box flexDirection="column" borderStyle="round" padding={1}>
      {/* 工具信息 */}
      <Text bold>Claude 想要执行：</Text>
      <Text color="yellow">{tool.name}</Text>
      <Text dimColor>{description}</Text>

      {/* 风险说明（LLM 生成的） */}
      {riskExplanation && (
        <Box marginTop={1}>
          <Text dimColor>{riskExplanation}</Text>
        </Box>
      )}

      {/* 操作选项 */}
      <SelectInput
        items={[
          { label: '允许', value: 'allow' },
          { label: '允许（本次）', value: 'allow-once' },
          { label: '始终允许此命令', value: 'always-allow' },
          { label: '拒绝', value: 'deny' },
        ]}
        onSelect={item => onDecide(item.value)}
      />
    </Box>
  )
}
```

## 工具结果渲染

每个工具都可以自定义结果的渲染方式：

```typescript
// BashTool 结果渲染
renderToolResultMessage: (content, progressMessages) => {
  if (isSearchCommand(content.command)) {
    // 搜索命令：折叠显示（只展示行数）
    return <CollapsedOutput lineCount={content.lineCount} />
  }
  if (content.result.length > 5000) {
    // 超长输出：截断 + 折叠
    return <TruncatedOutput content={content.result} />
  }
  // 普通输出：直接显示
  return <Text>{content.result}</Text>
}

// FileEditTool 结果渲染
renderToolResultMessage: (content) => {
  // 显示 diff
  return <DiffView diff={content.diff} />
}
```

## Markdown 渲染

助手的文本回复支持 Markdown 渲染：

```typescript
// 终端 Markdown 渲染（简化）
function renderMarkdown(text: string): ReactNode {
  return (
    <>
      {parseMarkdown(text).map((block, i) => {
        if (block.type === 'code') {
          return <SyntaxHighlight key={i} lang={block.lang} code={block.content} />
        }
        if (block.type === 'heading') {
          return <Text key={i} bold>{block.content}</Text>
        }
        if (block.type === 'list-item') {
          return <Text key={i}>  • {block.content}</Text>
        }
        return <Text key={i}>{block.content}</Text>
      })}
    </>
  )
}
```

## 流式输出

得益于异步生成器，文本输出是**逐 token 流式**的：

```typescript
// 流式输出的状态管理
function AssistantMessageItem({ message }: { message: AssistantMessage }) {
  const [displayedText, setDisplayedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(true)

  useEffect(() => {
    // 监听流式 token
    const unsubscribe = subscribeToStream(message.uuid, (token) => {
      setDisplayedText(prev => prev + token)
    })
    return () => {
      unsubscribe()
      setIsStreaming(false)
    }
  }, [message.uuid])

  return (
    <Box>
      <Text>{displayedText}</Text>
      {isStreaming && <Text color="gray">▌</Text>}  {/* 光标动画 */}
    </Box>
  )
}
```

## 状态栏

底部状态栏实时显示关键信息：

```
claude-3-5-sonnet-20241022 | ↑ 12,450 ↓ 3,120 tokens | $0.0423 | 00:45
```

```typescript
function StatusBar() {
  const model = useAppState(s => s.currentModel)
  const usage = useAppState(s => s.totalUsage)
  const cost = useAppState(s => s.totalCostUSD)

  return (
    <Box justifyContent="space-between">
      <Text dimColor>{model}</Text>
      <Text dimColor>
        ↑ {usage.inputTokens.toLocaleString()} 
        ↓ {usage.outputTokens.toLocaleString()} tokens
      </Text>
      <Text dimColor>${cost.toFixed(4)}</Text>
    </Box>
  )
}
```

## 下一章

UI 之外，Claude Code 还有强大的扩展能力。下一章看 Skills 和 Plugins 系统。

→ [c18 · 技能与插件](/claude-code/advanced/skills-plugins)
