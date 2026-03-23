# Acme IPC 通信层设计文档

## 概述

本文档描述 Acme 桌面应用中 **渲染进程 (Renderer) 与主进程 (Main)** 之间的通信架构。

### 设计目标

1. **类型安全** - 使用 Zod 进行运行时数据校验
2. **多窗口支持** - 支持多个并发窗口，每个窗口独立通信
3. **流式响应** - 支持 Agent 流式输出的高效分发
4. **性能优化** - 使用 MessageChannel 绕过 Chromium IPC 数据传输层
5. **开发体验** - 简洁的 API，对标 oRPC 的调用方式

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│  Electron Main Process                                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ MessageChannelRouter                                       │  │
│  │  - 管理 windowId → MessagePort 映射                        │  │
│  │  - 注册 channel → handler 路由                             │  │
│  │  - 向指定窗口发送消息                                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                  │
│                              │ MessageChannel (port2)            │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                  │
│  ┌───────────────────────────┴────────────────────────────┐    │
│  │ Preload                                                  │    │
│  │  - 创建 MessageChannel (port1=renderer, port2=main)     │    │
│  │  - postMessage port2 到主进程注册                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              ▲                                  │
│                              │ MessageChannel (port1)            │
├──────────────────────────────┼──────────────────────────────────┤
│                              │                                  │
│  ┌───────────────────────────┴────────────────────────────┐    │
│  │ Renderer (React)                                         │    │
│  │  window.api.invoke(channel, input) → Promise<T>         │    │
│  │  window.api.send(channel, data)                         │    │
│  │  window.api.on(channel, handler) → unsubscribe          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 通信模式

| 模式 | 方法 | 方向 | 用途 |
|------|------|------|------|
| **RPC 调用** | `invoke(channel, input)` | 双向 | 请求-响应，如 `agent:start` |
| **单向通知** | `send(channel, data)` | 单向 | fire-and-forget，如 `agent:cancel` |
| **事件订阅** | `on(channel, handler)` | 反向 | 订阅主进程推送，如 `agent:output` |

---

## 核心组件

### 1. MessageChannelRouter (Main 进程)

位置：`apps/desktop/src/main/ipc/router.ts`

**职责**：
- 管理所有窗口的 MessagePort 连接
- 注册和分发 channel → handler
- 向指定窗口发送消息（单播/广播）

**关键设计**：
```typescript
class MessageChannelRouter {
  private handlers = new Map<string, Handler>()
  private ports = new Map<string, MessagePort>()  // windowId → Port

  register<TInput, TOutput>(
    channel: string,
    schema: { input: z.ZodSchema; output: z.ZodSchema },
    handler: Handler<TInput, TOutput>
  )

  registerWindow(port: MessagePort): string  // 返回 windowId

  sendToWindow(windowId: string, channel: string, data: unknown)
  broadcast(channel: string, data: unknown)
}
```

### 2. Contracts (Shared Package)

位置：`packages/shared/src/ipc/contracts.ts`

**职责**：
- 定义所有 IPC channel 的 Zod schemas
- 确保类型安全和运行时校验

```typescript
export const agentContracts = {
  start: {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  stop: {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  sendMessage: {
    input: z.object({ agentId: z.string(), content: z.string() }),
    output: z.object({ messageId: z.string() }),
  },
  getStatus: {
    input: z.undefined(),
    output: z.object({
      running: z.array(z.string()),
      available: z.array(z.string()),
    }),
  },
}

export const sessionContracts = {
  create: {
    input: z.object({ vaultId: z.string() }),
    output: z.object({ sessionId: z.string() }),
  },
  list: {
    input: z.object({ vaultId: z.string() }),
    output: z.array(z.object({
      id: z.string(),
      title: z.string(),
      updatedAt: z.string(),
    })),
  },
  getMessages: {
    input: z.object({ sessionId: z.string(), limit: z.number().optional() }),
    output: z.array(MessageSchema),
  },
}

export const vaultContracts = {
  create: {
    input: z.object({ name: z.string(), path: z.string() }),
    output: z.object({ vaultId: z.string() }),
  },
  list: {
    input: z.undefined(),
    output: z.array(VaultSchema),
  },
  switch: {
    input: z.object({ vaultId: z.string() }),
    output: z.boolean(),
  },
}
```

### 3. Preload API (Renderer 进程)

位置：`apps/desktop/src/preload/index.ts`

**职责**：
- 创建 MessageChannel 连接
- 暴露类型安全的 API 给 Renderer

```typescript
const api = {
  invoke: <T>(channel: string, input?: unknown): Promise<T> => {
    // 通过 MessageChannel 发送 invoke 消息
    // 返回 Promise<T>
  },

  send: (channel: string, data?: unknown): void => {
    // fire-and-forget 单向消息
  },

  on: (channel: string, handler: (data: unknown) => void): (() => void) => {
    // 订阅主进程推送
    // 返回取消订阅函数
  },
}

contextBridge.exposeInMainWorld('api', api)
```

---

## 文件结构

```
packages/shared/src/ipc/
├── index.ts        # 导出 contracts, types
├── contracts.ts    # Zod schemas 定义
└── types.ts        # 共享类型定义

apps/desktop/src/
├── main/
│   ├── index.ts               # 主进程入口，初始化 router
│   └── ipc/
│       ├── router.ts           # MessageChannelRouter
│       ├── handlers/           # IPC handlers
│       │   ├── agent.ts       # Agent 相关 handlers
│       │   ├── session.ts     # Session 相关 handlers
│       │   └── vault.ts       # Vault 相关 handlers
│       └── index.ts            # 聚合所有 handlers
├── preload/
│   └── index.ts               # 创建 MessageChannel + 暴露 api
└── renderer/
    └── src/
        ├── api.ts             # Renderer 端类型安全封装
        └── main.tsx           # React 入口
```

---

## 流式输出支持

### 问题背景

AgentRuntime 运行在主进程，Agent 可能流式输出 token，需要高效分发给对应的渲染窗口。

### 架构

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ StreamManager                                         │   │
│  │  - 批量发送优化 (100ms interval)                      │   │
│  │  - windowId → AbortController 映射                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                │
│                           │ chunks 批量发送                 │
│                           ▼                                │
│                  MessageChannelRouter                         │
│                           │                                │
│                           │ sendToWindow(windowId, ...)     │
│                           ▼                                │
└─────────────────────────────────────────────────────────────┘
```

### 实现

```typescript
// main/ipc/StreamManager.ts
class StreamManager {
  private buffer = new Map<string, string[]>()
  private timers = new Map<string, NodeJS.Timeout>()
  private readonly INTERVAL = 100  // 100ms 批量

  push(agentId: string, windowId: string, chunk: string) {
    const key = `${agentId}:${windowId}`
    if (!this.buffer.has(key)) {
      this.buffer.set(key, [])
    }
    this.buffer.get(key)!.push(chunk)

    if (!this.timers.has(key)) {
      this.timers.set(key, setTimeout(() => this.flush(key), this.INTERVAL))
    }
  }

  private flush(key: string) {
    const chunks = this.buffer.get(key)
    if (chunks?.length) {
      const [agentId, windowId] = key.split(':')
      router.sendToWindow(windowId, 'agent:chunks', { agentId, chunks })
      this.buffer.delete(key)
    }
    this.timers.delete(key)
  }
}
```

### 渲染进程订阅

```typescript
// renderer/chat.tsx
useEffect(() => {
  const unsub = window.api.on('agent:chunks', ({ agentId, chunks }) => {
    if (agentId === currentAgentId) {
      setMessages(prev => [...prev, ...chunks])
    }
  })
  return unsub
}, [currentAgentId])
```

---

## 多窗口支持

### 窗口注册流程

```
1. 窗口创建时，Preload 创建 MessageChannel
2. Preload 通过 ipcRenderer.postMessage 发送 port2 到主进程
3. 主进程 MessageChannelRouter.registerWindow(port) 注册
4. 返回 windowId 给渲染进程
5. 后续所有通信通过 MessageChannel，带 windowId 标识
```

### 窗口关闭处理

```typescript
// main/index.ts
browserWindow.on('closed', () => {
  streamManager.abortByWindow(windowId)
  router.unregisterWindow(windowId)
})
```

---

## 与 AgentRuntime 的集成

### Bridge 模式

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ MessageChannelRouter                                  │   │
│  │     │                                                │   │
│  │     │ (统一接口)                                     │   │
│  │     ▼                                                │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ AgentBridge (IAgentRuntimeBridge 接口)         │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  │           │                    │                     │   │
│  │           ▼                    ▼                     │   │
│  │  ┌───────────────┐    ┌───────────────┐           │   │
│  │  │ LocalBridge   │    │ RemoteBridge  │           │   │
│  │  │ (同进程)      │    │ (HTTP/WS)     │           │   │
│  │  └───────────────┘    └───────────────┘           │   │
│  │           │                    │                     │   │
│  │           └────────┬───────────┘                   │   │
│  │                    ▼                                │   │
│  │           ┌───────────────┐                        │   │
│  │           │ AgentRuntime  │                        │   │
│  │           └───────────────┘                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 接口定义

```typescript
interface IAgentRuntimeBridge {
  startAgent(agentId: string): Promise<boolean>
  stopAgent(agentId: string): Promise<boolean>
  sendMessage(agentId: string, content: string, options?: {
    onChunk?: (chunk: string) => void
    onComplete?: () => void
    onError?: (error: Error) => void
  }): Promise<string>  // returns messageId
  getStatus(): Promise<{ running: string[]; available: string[] }>
  stop(): Promise<void>
}
```

---

## 性能考虑

### 优化措施

| 优化项 | 说明 | 预期效果 |
|--------|------|----------|
| MessageChannel 传输 | 绕过 Chromium IPC 数据层 | 延迟降低 30-50% |
| 流式批量发送 | 100ms interval 聚合 chunks | IPC 消息数减少 90% |
| 独立 Port | 每个窗口独立 MessageChannel | 无锁竞争 |

### 性能预估

| Agent 并发数 | 优化前 (chunks/s) | 优化后 (IPC/s) |
|--------------|-------------------|----------------|
| 1 | ~20-50 | ~10 (批量后) |
| 10 | ~200-500 | ~20-50 |
| 50 | ~1000-2500 | ~50-100 |

---

## 实施步骤

### Phase 1: IPC 基础设施

1. [ ] 在 `packages/shared/src/ipc/` 创建 contracts 和 types
2. [ ] 在 `apps/desktop/src/main/ipc/` 实现 MessageChannelRouter
3. [ ] 在 `apps/desktop/src/preload/` 实现 api 客户端
4. [ ] 验证 Renderer ↔ Main 双向通信

### Phase 2: Agent 集成

5. [ ] 定义 AgentBridge 接口
6. [ ] 实现 LocalBridge (MVP)
7. [ ] 在 Main 进程初始化 Bridge
8. [ ] 实现 Agent handlers

### Phase 3: 流式输出

9. [ ] 实现 StreamManager
10. [ ] 集成到 Agent handlers
11. [ ] Renderer 端订阅和展示

### Phase 4: 会话和 Vault

12. [ ] 实现 Session handlers
13. [ ] 实现 Vault handlers
14. [ ] 完善 contracts schemas

---

## 设计决策记录

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-03-23 | 使用 MessageChannel 替代 Electron IPC | 更高性能，支持流式，多窗口更简单 |
| 2026-03-23 | 自定义 IPC，不用 oRPC | oRPC 多窗口支持复杂，只需 Zod 类型安全 |
| 2026-03-23 | Bridge 模式支持本地/远程切换 | 本地优先，远程扩展灵活 |
| 2026-03-23 | 流式批量发送 (100ms) | 减少 IPC 消息数量，优化性能 |

---

## 替代方案考虑

### 方案 A: 继续使用 oRPC

**优点**：开箱即用，类型安全完善
**缺点**：多窗口支持需要改造，流式支持虽然好但引入不必要的复杂性

### 方案 B: 纯 Electron IPC

**优点**：原生支持多窗口，调试工具完善
**缺点**：传输性能不如 MessageChannel

**最终选择**：自定义 MessageChannel IPC，在获得更高性能的同时，保持良好的开发体验和类型安全。
