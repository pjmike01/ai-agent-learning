# c16 · 状态管理

<span class="chapter-badge">c16</span> **状态管理** — AppStateStore 是 Claude Code 的"全局大脑"，采用 Zustand-like 模式管理复杂的运行时状态。

<div class="source-path">📁 state/AppStateStore.ts · bootstrap/state.ts</div>

## AppState 结构

```typescript
// state/AppStateStore.ts（简化）
type AppState = {
  // ── 会话消息 ──────────────────────────────────
  messages: Message[]                    // 完整对话历史
  agentTasks: AgentTask[]                // 活跃的子代理任务
  backgroundTasks: BackgroundTask[]      // 后台任务列表

  // ── 权限 ──────────────────────────────────────
  permissionContext: ToolPermissionContext  // 权限规则和模式
  
  // ── 工具状态 ──────────────────────────────────
  toolJSX: Map<string, ReactNode>         // 工具自定义 UI（toolUseID → ReactNode）
  fileHistory: Map<string, FileSnapshot> // 文件修改历史（支持撤销）
  
  // ── 投机执行 ──────────────────────────────────
  speculativeContext?: SpeculativeContext // Fork 状态

  // ── 归因 ──────────────────────────────────────
  attributionState: AttributionState     // 提交作者信息
  
  // ── 团队模式 ──────────────────────────────────
  teammates: TeamMember[]                // 多代理团队成员
  
  // ── UI 状态 ───────────────────────────────────
  isProcessing: boolean                  // 是否正在处理
  interruptCount: number                 // 用户中断次数
}
```

## Zustand-like 模式

AppStateStore 采用与 Zustand 相似的设计：

```typescript
// 函数式更新（不可变）
function setAppState(updater: (prev: AppState) => AppState): void {
  const prev = store.getState()
  const next = updater(prev)
  store.setState(next)
  
  // 触发所有订阅者
  notify(prev, next)
  
  // 持久化到 sessionStorage
  persistState(next)
}

// 读取状态
function getAppState(): AppState {
  return store.getState()
}

// React Hook 方式（带 selector 优化）
function useAppState<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
  )
}
```

**函数式更新** 保证状态不可变，便于 React 检测变化和触发重渲染。

## 状态更新示例

```typescript
// 向消息历史追加一条消息
setAppState(prev => ({
  ...prev,
  messages: [...prev.messages, newMessage],
}))

// 更新工具 UI
setAppState(prev => ({
  ...prev,
  toolJSX: new Map([...prev.toolJSX, [toolUseID, <MyComponent />]]),
}))

// 切换权限模式
setAppState(prev => ({
  ...prev,
  permissionContext: {
    ...prev.permissionContext,
    mode: 'auto',
  },
}))
```

## 文件历史快照

每次工具修改文件时，AppStateStore 保存修改前的内容：

```typescript
// 修改前保存快照
setAppState(prev => ({
  ...prev,
  fileHistory: new Map([
    ...prev.fileHistory,
    [filePath, {
      content: beforeContent,
      timestamp: Date.now(),
      toolUseID,
    }],
  ]),
}))
```

这支持了 `/undo` 命令——撤销最近的文件修改：

```typescript
// /undo 命令实现
async function handleUndo(appState: AppState): Promise<void> {
  const lastEdit = getLastFileEdit(appState.fileHistory)
  if (!lastEdit) return

  await fs.writeFile(lastEdit.path, lastEdit.snapshot.content)
  
  setAppState(prev => ({
    ...prev,
    fileHistory: deleteEntry(prev.fileHistory, lastEdit.path),
  }))
}
```

## 投机执行的状态隔离

```typescript
type SpeculativeContext = {
  forkId: string
  parentMessages: Message[]    // Fork 前的消息历史
  speculativeMessages: Message[] // Fork 后的新消息（还未确认）
}

// 创建 Fork
function forkAppState(state: AppState): AppState {
  return {
    ...state,
    speculativeContext: {
      forkId: uuid(),
      parentMessages: state.messages,
      speculativeMessages: [],
    },
  }
}

// 确认 Fork（合并到主状态）
function commitFork(state: AppState): AppState {
  const { speculativeContext } = state
  return {
    ...state,
    messages: [
      ...speculativeContext!.parentMessages,
      ...speculativeContext!.speculativeMessages,
    ],
    speculativeContext: undefined,
  }
}

// 放弃 Fork
function discardFork(state: AppState): AppState {
  return {
    ...state,
    messages: state.speculativeContext!.parentMessages,
    speculativeContext: undefined,
  }
}
```

## 状态持久化

状态保存在 `sessionStorage`（浏览器）或内存文件（CLI 模式），确保：

1. 刷新页面后恢复（Web 模式）
2. 会话 ID 可用于恢复成本统计
3. 后台任务状态可被主进程查询

## 与 React 的集成

Ink 的 React 组件通过 `useAppState` Hook 订阅状态变化：

```typescript
// components/Messages.tsx
function Messages() {
  // selector 精确订阅，避免不必要的重渲染
  const messages = useAppState(state => state.messages)
  
  return (
    <Box flexDirection="column">
      {messages.map(msg => <MessageItem key={msg.uuid} message={msg} />)}
    </Box>
  )
}
```

## 下一章

了解了状态管理，下一章看 Claude Code 的终端 UI 是如何用 React 组件在终端中渲染的。

→ [c17 · 终端 UI 系统](/claude-code/advanced/ui-components)
