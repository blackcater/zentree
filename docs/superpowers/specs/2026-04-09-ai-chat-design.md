# AI Chat 功能设计文档

## 1. 概述

本文档定义 Desktop 应用的 AI 对话功能，定位为**代码助手/编程辅助**，参考 Codex 的核心体验。

### 核心特性

- 多 Agent 并行（Claude/Codex/ACP）
- 单窗口对话 + 后台多对话管理
- 完整 Part 类型展示（文本/工具/推理/压缩/文件引用）
- 交互式权限审批
- 持久化对话历史（创建/查看/删除/Fork/Resume/Archive/Rollback）
- 上下文自动压缩 + 用户手动触发

### 参考竞品

| 竞品 | 参考点 |
|-----|--------|
| Codex | 核心交互模式、Thread/Turn 模型、完整生命周期 |
| Harnss | 引擎驱动型架构、EngineHookState 接口 |
| AionUi | Electron IPC 集成、多 Agent 管理 |
| Craft Agents | 多后端路由、Skills 系统 |
| OpenCode | 工具定义 API、权限系统 |

---

## 2. 架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Renderer Process                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    SessionManager                            │ │
│  │  - activeSession: SessionId                                 │ │
│  │  - backgroundSessions: Map<SessionId, SessionState>        │ │
│  │  - 切换/创建/删除/归档会话                                 │ │
│  └─────────────────────────┬──────────────────────────────────┘ │
│                            │                                     │
│  ┌─────────────────────────┼──────────────────────────────────┐ │
│  │                         ▼                                   │ │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │ │
│  │  │ClaudeEngine  │ │ CodexEngine  │ │  ACPEngine   │        │ │
│  │  │              │ │              │ │              │        │ │
│  │  │ useClaude()  │ │ useCodex()   │ │ useACP()     │        │ │
│  │  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘        │ │
│  │         │                │                │                  │ │
│  │         └────────────────┼────────────────┘                  │ │
│  │                          ▼                                   │ │
│  │               ┌──────────────────┐                        │ │
│  │               │  EngineHookState  │ ← 统一接口              │ │
│  │               └──────────────────┘                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     UI Components                           │ │
│  │  ChatPanel / MessageList / ToolCard / PermissionDialog     │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ RPC (IPC Bridge)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Main Process                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   EngineBridge                              │ │
│  │  - ClaudeBridge: spawn Claude CLI / connect SDK            │ │
│  │  - CodexBridge:  spawn Codex CLI / connect app-server      │ │
│  │  - ACPBridge:    spawn ACP agents via stdio                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   SessionStore (Interface)                 │ │
│  │  - create / get / list / update / delete                   │ │
│  │  - fork / archive / rollback                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               JsonlSessionStore (Default Impl)             │ │
│  │  - 存储目录: userData/sessions/                            │ │
│  │  - 格式: JSONL (每行一条 Turn)                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 引擎驱动型架构

参考 Harnss 的 `EngineHookState` 接口，每个引擎实现统一接口：

```typescript
interface EngineHookState {
  // 状态
  messages: Message[]
  status: 'idle' | 'processing' | 'error' | 'waiting_permission'
  error?: Error
  tokenUsage?: TokenUsage

  // 操作
  send(text: string): void
  interrupt(): void
  fork(): SessionId
  resume(sessionId: SessionId): void
}

interface EngineBridge {
  readonly engineType: 'claude' | 'codex' | 'acp'

  // 生命周期
  initialize(config: EngineConfig): Promise<void>
  destroy(): void

  // 状态订阅
  onEvent(event: string, listener: EngineEventListener): CancelFn

  // 操作
  send(sessionId: string, input: string): Promise<void>
  interrupt(sessionId: string): Promise<void>
  fork(sessionId: string, fromTurnId?: string): Promise<SessionId>
  resume(sessionId: string): Promise<void>
}
```

### 2.3 现有 RPC 集成

复用现有的 `shared/rpc` 架构：

```typescript
// Main Process: 注册 Engine Handler
server.handle('/engine/initialize', (engineType, config) => ...)
server.handle('/engine/send', (sessionId, input) => ...)
server.handle('/engine/interrupt', (sessionId) => ...)
server.handle('/engine/fork', (sessionId, fromTurnId) => ...)

// Renderer: 监听事件
rpc.onEvent('permission:request', (data) => { /* 显示审批 */ })
rpc.onEvent('session:updated', (data) => { /* 更新 UI */ })
rpc.onEvent('stream:delta', (data) => { /* 消息增量 */ })

// Renderer: 调用操作
await rpc.call('/engine/send', sessionId, input)
await rpc.call('/permission/respond', requestId, approved)
```

---

## 3. 数据模型

### 3.1 Part 类型

完整支持竞品中的 Part 类型：

| PartType | 说明 | UI 展示 |
|----------|------|---------|
| `text` | Markdown 文本 | Markdown 渲染 + 复制按钮 |
| `tool` | 工具调用 | ToolCard 组件 |
| `reasoning` | 推理过程 | 折叠的思考内容 |
| `compaction` | 上下文压缩 | 分隔符 "Context compacted" |
| `file` | 文件引用 | 内联高亮或附件缩略图 |
| `agent` | Agent 引用 | 高亮文本 |

### 3.2 消息结构

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant'
  parts: Part[]
  timestamp: number
}

interface Part {
  id: string
  type: PartType
  // 类型安全的内容
  content: TextContent | ToolContent | ReasoningContent | ...
}

interface TextContent {
  type: 'text'
  text: string
}

interface ToolContent {
  type: 'tool'
  tool: string           // 'bash' | 'read' | 'edit' | ...
  input: Record<string, unknown>
  output?: string
  status: 'pending' | 'running' | 'completed' | 'error'
  error?: string
}

interface ReasoningContent {
  type: 'reasoning'
  text: string
  summary?: string
}

interface CompactionContent {
  type: 'compaction'
  message: string
}
```

### 3.3 Turn 结构

```typescript
interface Turn {
  id: string
  message: Message                    // User message
  parts: Part[]                      // Assistant parts
  status: 'in_progress' | 'completed' | 'interrupted' | 'error'
  diffs?: FileDiff[]                 // 本轮文件变更
  tokenUsage?: TokenUsage
}

interface FileDiff {
  path: string
  before: string
  after: string
  status: 'created' | 'modified' | 'deleted'
}
```

### 3.4 Session 结构

```typescript
interface Session {
  id: string
  name?: string
  engineType: 'claude' | 'codex' | 'acp'
  engineConfig: EngineConfig
  status: 'active' | 'archived'
  createdAt: number
  updatedAt: number
  turns: Turn[]
}
```

---

## 4. 核心功能

### 4.1 对话管理

| 功能 | 说明 |
|-----|------|
| **创建会话** | 选择引擎类型和配置，创建新 Session |
| **切换会话** | 后台保留所有会话，UI 切换 |
| **删除会话** | 软删除，可恢复 |
| **Fork** | 从当前会话或指定 Turn 复制创建新会话 |
| **Resume** | 恢复已存在的会话继续对话 |
| **Archive** | 归档不活跃的会话 |
| **Rollback** | 丢弃最近 N 轮，保留历史记录 |

### 4.2 消息展示

```typescript
// 渲染层级
SessionView
├── TurnList
│   └── Turn
│       ├── UserMessageDisplay
│       └── AssistantParts
│           ├── ContextToolGroup    // read/glob/grep 合并
│           ├── Part: text         // Markdown
│           ├── Part: reasoning    // 思考过程
│           ├── Part: tool         // ToolCard
│           └── Part: compaction   // 压缩提示
├── ToolCard
│   ├── Collapsible
│   ├── ToolHeader (icon, title, subtitle)
│   └── ToolBody (参数、结果)
├── PermissionDialog
│   └── PermissionRequest
│       ├── Tool 预览
│       └── Approve / Reject / Always Allow
└── DiffView (Turn 完成后的文件变更)
```

### 4.3 上下文压缩

- **自动压缩**: Engine 内部触发，发布 `compaction` Part
- **手动触发**: 用户通过命令或按钮触发压缩
- **UI 展示**: 渲染 `CompactionContent` 分隔符

---

## 5. 审批流程

### 5.1 分散式审批

各 Engine 内部处理审批，UI 只负责展示和转发：

```
Engine 内部 (Main Process)
       │
       │ ctx.ask({
       │   permission: 'edit',
       │   patterns: ['src/*.ts'],
       │   metadata: { diff: '...' }
       │ })
       │
       ▼
┌─────────────────┐
│ Engine 暂停等待  │
│ (Promise 挂起)   │
└────────┬────────┘
         │
         │ rpc.push('permission:request', {
         │   requestId: 'req-1',
         │   tool: 'edit',
         │   params: { file: 'src/index.ts', ... },
         │   patterns: ['src/*.ts'],
         │   alwaysPatterns: ['src/*.ts']
         │ })
         ▼
Renderer 监听
       │
       │ 显示 PermissionDialog
       │
       │ 用户选择后
       │
       ▼
rpc.call('/permission/respond', {
  requestId: 'req-1',
  approved: true  // 或 false
})
       │
       ▼
Engine 收到响应，Promise resolve/reject
       │
       ▼
Engine 继续执行或返回错误
```

### 5.2 审批类型

| 权限类型 | 触发场景 |
|---------|---------|
| `bash` | 执行命令 |
| `edit` | 编辑文件 |
| `read` | 读取文件/目录 |
| `write` | 写入新文件 |
| `glob` / `grep` | 搜索文件 |
| `webfetch` | 访问 URL |
| `external_directory` | 访问工作区外的路径 |
| `task` | 派生子任务 |
| `todowrite` | 写入 Todo |

### 5.3 审批规则

```typescript
interface PermissionRule {
  permission: string
  patterns: Record<string, 'allow' | 'deny' | 'ask'>
  always?: string[]  // "始终允许" 的 pattern
}
```

---

## 6. 存储设计

### 6.1 SessionStore 接口

```typescript
interface SessionStore {
  // CRUD
  create(session: Omit<Session, 'id'>): Promise<Session>
  get(id: string): Promise<Session | null>
  list(filter?: { engineType?: string; status?: string }): Promise<SessionSummary[]>
  update(id: string, patch: Partial<Session>): Promise<void>
  delete(id: string): Promise<void>

  // 生命周期
  fork(baseId: string, fromTurnId?: string): Promise<Session>
  archive(id: string): Promise<void>
  unarchive(id: string): Promise<void>
  rollback(id: string, turnCount: number): Promise<void>

  // 工具方法
  addTurn(sessionId: string, turn: Turn): Promise<void>
  updateTurn(sessionId: string, turnId: string, patch: Partial<Turn>): Promise<void>
}
```

### 6.2 JSONL 存储实现

```
userData/
└── sessions/
    └── {sessionId}/
        ├── meta.json          # Session 元信息
        └── turns.jsonl        # Turn 列表 (JSONL)
```

```typescript
class JsonlSessionStore implements SessionStore {
  constructor(baseDir: string)

  async create(session): Promise<Session> {
    const dir = path.join(this.baseDir, session.id)
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify(meta))
    await fs.writeFile(path.join(dir, 'turns.jsonl'), '')
    return session
  }

  async addTurn(sessionId, turn): Promise<void> {
    const file = path.join(this.baseDir, sessionId, 'turns.jsonl')
    await fs.appendFile(file, JSON.stringify(turn) + '\n')
  }
}
```

---

## 7. 组件设计

### 7.1 核心组件

| 组件 | 职责 |
|-----|------|
| `ChatPanel` | 主聊天面板容器 |
| `MessageList` | 消息列表 + 自动滚动 |
| `Turn` | 单轮对话渲染 |
| `UserMessage` | 用户消息展示 |
| `AssistantParts` | Assistant 消息分组渲染 |
| `Part` | 单个 Part 分发器 |
| `ToolCard` | 工具调用卡片 |
| `ContextToolGroup` | 上下文工具组合 (read/glob/grep) |
| `DiffView` | 文件变更展示 |
| `PermissionDialog` | 权限审批弹窗 |
| `ThinkingIndicator` | 思考中动画 |
| `SessionList` | 会话列表侧边栏 |
| `SessionItem` | 单个会话项 |

### 7.2 组件关系

```typescript
// ChatPanel 组合
ChatPanel
├── SessionHeader
│   ├── SessionTitle
│   └── SessionActions (interrupt, fork, archive)
├── MessageList
│   └── VirtualList
│       └── Turn
│           ├── UserMessage
│           ├── AssistantParts
│           │   ├── ContextToolGroup?
│           │   ├── Part (text)
│           │   ├── Part (reasoning)?
│           │   ├── Part (tool)+
│           │   └── Part (compaction)?
│           ├── ThinkingIndicator?
│           └── DiffView?
├── InputBar
│   ├── Textarea
│   └── SendButton
└── PermissionDialog (Modal)
```

---

## 8. 技术实现要点

### 8.1 流式更新

复用现有 `rpc.stream()` 能力：

```typescript
// Renderer
const stream = rpc.stream('/engine/send', sessionId, input)
for await (const delta of stream) {
  switch (delta.type) {
    case 'text': appendText(delta.content); break
    case 'tool_start': showToolCard(delta.tool); break
    case 'tool_end': updateToolCard(delta.result); break
    case 'reasoning': showReasoning(delta.content); break
  }
}
```

### 8.2 多会话状态

```typescript
// useSessionManager hook
function useSessionManager() {
  const sessions = useState<Map<SessionId, SessionState>>(new Map())
  const activeId = useState<SessionId | null>(null)

  const activeSession = computed(() =>
    activeId.value ? sessions.get(activeId.value) : null
  )

  const createSession = async (engineType: EngineType) => { ... }
  const switchSession = (id: SessionId) => { activeId.value = id }
  const deleteSession = async (id: SessionId) => { ... }

  return {
    sessions,
    activeId,
    activeSession,
    createSession,
    switchSession,
    deleteSession,
    // ...
  }
}
```

### 8.3 权限审批集成

```typescript
// Main Process: EngineBridge
class EngineBridge {
  async initialize(engineType, config) {
    // 启动引擎子进程
    // 监听引擎的 permission 请求
    this.engine.on('permission_request', (req) => {
      // 通过 RPC 推送到 Renderer
      this.rpc.push('permission:request', req)
    })
  }

  async respondPermission(requestId: string, approved: boolean) {
    this.engine.resolvePermission(requestId, approved)
  }
}

// Renderer: PermissionDialog
function PermissionDialog({ request, onResponse }) {
  return (
    <Modal open={true}>
      <div class="permission-request">
        <h3>{request.tool} 需要权限</h3>
        <pre>{JSON.stringify(request.params, null, 2)}</pre>
        <div class="actions">
          <Button onClick={() => onResponse(false)}>拒绝</Button>
          <Button onClick={() => onResponse(true)}>允许</Button>
          <Button onClick={() => onResponse(true, { always: true })}>
            始终允许
          </Button>
        </div>
      </div>
    </Modal>
  )
}
```

---

## 9. 实现计划

### Phase 1: 核心框架
1. SessionStore 接口定义 + JSONL 实现
2. EngineBridge 抽象 + 基础实现
3. RPC Handler 注册 (engine/*, session/*, permission/*)
4. 基础 SessionManager (创建/切换/列表)

### Phase 2: 对话功能
1. ClaudeEngine 实现 (连接 Claude CLI)
2. 消息渲染 (Turn/Part 组件)
3. 流式更新 (text delta)
4. 工具卡片展示

### Phase 3: 完整功能
1. 权限审批流程
2. Fork/Resume/Archive/Rollback
3. 上下文压缩展示
4. Reasoning 展示

### Phase 4: 多引擎
1. CodexEngine 实现
2. ACPEngine 实现
3. 引擎切换 UI

---

## 10. 附录

### A. 参考文档

- Codex App Server Protocol: `docs/openai_codex/user-interfaces/app-server-and-ide-integration/index.md`
- Harnss Engine Architecture: `docs/OpenSource03_harnss/ai-engine-integration/index.md`
- OpenCode Tool System: `docs/anomalyco_opencode/core-application/tool-system-and-permissions.md`
- 现有 RPC 实现: `apps/desktop/src/shared/rpc/`

### B. 命名规范

遵循项目现有规范：
- 目录: kebab-case (`chat-panel`, `file-tree`)
- 组件文件: PascalCase (`ThreadCell.tsx`)
- Hook 文件: camelCase, `use` 前缀 (`useThread.ts`)
- 类型: PascalCase (`ThreadItem`)
- 常量: UPPER_SNAKE_CASE
