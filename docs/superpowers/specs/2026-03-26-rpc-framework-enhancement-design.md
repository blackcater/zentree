# RPC 框架增强设计

## 1. 概述

本文档描述 `desktop/src/shared/rpc` 模块的增强功能，包括：

1. **WindowRegistry 接口**：替代 `WebContentsManager`，由应用层提供，实现窗口消息发送
2. **HTTP SSE 支持**：`HttpRpcServer` 和 `HttpRpcClient` 支持 SSE 推送和流式调用
3. **Schema 数据校验**：使用 `@standard-schema/spec` 对 handler 参数进行校验
4. **超时机制**：客户端支持 `AbortController`/`AbortSignal` 控制超时和取消

## 2. WindowRegistry 接口

### 2.1 设计背景

原设计使用 `WebContentsManager` 接口，但存在以下问题：

- `getWebContents` 方法未被使用
- `send` 方法职责不清晰（需根据 target 类型判断如何发送）

### 2.2 接口定义

```typescript
import type { BrowserWindow, WebContents } from 'electron'

export interface WindowRegistry {
  // 窗口注册（自动生成 clientId，返回值即 clientId）
  registerWindow(window: BrowserWindow, group?: string): string
  // 注销窗口（通过 window 查找 clientId，自动离组）
  unregisterWindow(window: BrowserWindow): void

  // 群组管理
  joinGroup(clientId: string, groupId: string): void
  leaveGroup(clientId: string, groupId: string): void

  // 消息发送
  sendToClient(clientId: string, channel: string, ...args: unknown[]): void
  sendToGroup(groupId: string, channel: string, ...args: unknown[]): void
  sendToAll(channel: string, ...args: unknown[]): void

  // 查询
  getWebContentsByClientId(clientId: string): WebContents | null
  getClientIdByWebContents(webContents: WebContents): string | null
}
```

**职责划分**：

- `registerWindow`：注册窗口，自动生成 clientId 并返回，传入 `group` 时自动加入该组
- `unregisterWindow`：注销窗口，通过 window 查找 clientId，自动从所有群组移除
- `joinGroup`/`leaveGroup`：客户端加群/退群
- `sendToClient`/`sendToGroup`/`sendToAll`：消息发送
- `getWebContentsByClientId`：通过 clientId 查询 WebContents
- `getClientIdByWebContents`：通过 WebContents 查询 clientId

### 2.3 ElectronRpcServer 改造

```typescript
export class ElectronRpcServer implements RpcServer {
  constructor(
    private readonly _registry: WindowRegistry,
    private readonly _ipcMain: IpcMain
  ) {}

  push(event: string, target: Rpc.Target, ...args: unknown[]): void {
    const channel = `rpc:event:${this._normalizeEvent(event)}`

    if (target.type === 'broadcast') {
      this._registry.sendToAll(channel, ...args)
    } else if (target.type === 'client' && target.clientId) {
      this._registry.sendToClient(target.clientId, channel, ...args)
    } else if (target.type === 'group' && target.groupId) {
      this._registry.sendToGroup(target.groupId, channel, ...args)
    }
  }
}
```

**clientId 获取逻辑**：

在 `handle()` 注册的 IPC 回调中，通过 `e.sender`（WebContents）反查 clientId：

```typescript
this._ipcMain.on(
  `rpc:invoke:${eventPath}`,
  async (e, payload: { invokeId: string; args: unknown[] }) => {
    const { invokeId, args } = payload
    // 通过 WebContents 反查 clientId
    const clientId = this._registry.getClientIdByWebContents(e.sender)
    if (!clientId) {
      e.sender.send(`rpc:response:${invokeId}`, {
        error: new RpcError('UNAUTHORIZED', 'Unknown client').toJSON(),
      })
      return
    }

    const result = await handler.handler({ clientId }, ...args)
    // ...
  }
)
```

## 3. HTTP SSE 支持

### 3.1 背景

原 `HttpRpcServer.push()` 和 `HttpRpcClient.stream()`/`onEvent()` 均未实现。HTTP 协议本身不支持服务端推送，需要借助 SSE（Server-Sent Events）实现。

### 3.2 服务端实现（HttpRpcServer）

#### SSE 端点

```typescript
private _sseClients = new Map<string, Set<ReadableStreamController>>()

private _setupSSERoutes() {
  // GET /rpc/events - SSE 事件流
  this.app.get('/rpc/events', async (c: Context) => {
    const clientId = this._getClientId(c)

    return c.streamSSE(async (stream) => {
      const controller = { stream, clientId }
      this._addSSEClient(clientId, controller)

      stream.writeSSE({ event: 'connected', data: JSON.stringify({ clientId }) })

      stream.onAbort(() => {
        this._removeSSEClient(clientId)
      })
    })
  })
}
```

#### push() 实现

```typescript
push(event: string, target: Rpc.Target, ...args: unknown[]): void {
  const eventData = JSON.stringify({ event, args })

  if (target.type === 'broadcast') {
    this._broadcastSSE('push', eventData)
  } else if (target.type === 'client' && target.clientId) {
    this._sendSSEToClient(target.clientId, 'push', eventData)
  } else if (target.type === 'group' && target.groupId) {
    this._sendSSEToGroup(target.groupId, 'push', eventData)
  }
}
```

### 3.3 客户端实现（HttpRpcClient）

#### stream() - SSE 流式调用

```typescript
async *stream<T>(event: string, ...args: unknown[]): AsyncIterable<T> {
  const response = await fetch(
    `${this._baseUrl}/rpc/${event.replace(/^\/|\/$/g, '')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rpc-client-id': this.clientId,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(args),
      signal: this._signal,
    }
  )

  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()!

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          yield JSON.parse(line.slice(6)) as T
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
```

#### onEvent() - SSE 事件订阅

```typescript
private _eventSource: EventSource | null = null
private _eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()

onEvent(event: string, listener: (...args: unknown[]) => void): CancelFn {
  if (!this._eventSource) {
    this._eventSource = new EventSource(`${this._baseUrl}/rpc/events`)

    this._eventSource.addEventListener('push', (e: MessageEvent) => {
      const { event: eventName, args } = JSON.parse(e.data)
      const listeners = this._eventListeners.get(eventName)
      if (listeners) {
        for (const l of listeners) {
          l(...args)
        }
      }
    })
  }

  if (!this._eventListeners.has(event)) {
    this._eventListeners.set(event, new Set())
  }
  this._eventListeners.get(event)!.add(listener)

  return () => {
    const listeners = this._eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
      if (listeners.size === 0) {
        this._eventListeners.delete(event)
      }
    }
  }
}
```

## 4. Schema 数据校验

### 4.1 背景

原 `HandleOptions` 已引用 `@standard-schema/spec`，但未实现具体校验逻辑。

### 4.2 StandardSchemaV1 接口

```typescript
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly version: 1
    readonly vendor: string
    readonly validate: (
      value: unknown,
      options?: unknown
    ) => Result<Output> | Promise<Result<Output>>
  }
}

type Result<T> =
  | { value: T; issues?: undefined }
  | { issues: Array<{ message: string; path?: Array<string | number> }> }
```

### 4.3 实现

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec'

export interface HandleOptions {
  schema?: StandardSchemaV1
}

// HttpRpcServer 中的调用校验
private async _handleRPC(path: string, args: unknown[], ctx: Rpc.RequestContext) {
  const handler = this._handlers.get(path)

  if (!handler) {
    throw new RpcError('NOT_FOUND', `Handler not found: ${path}`)
  }

  // Schema 校验
  if (handler.options?.schema) {
    const schema = handler.options.schema
    const result = await schema['~standard'].validate(args)

    if ('issues' in result) {
      throw new RpcError('INVALID_PARAMS', 'Schema validation failed', result.issues)
    }

    // 校验成功后，args 被转换为标准化输出
    return handler.handler(ctx, ...(Array.isArray(result.value) ? result.value : [result.value]))
  }

  return handler.handler(ctx, ...args)
}
```

### 4.4 使用示例

Zod 的 `z.ZodSchema` 原生实现了 `StandardSchemaV1` 接口，可以直接使用：

```typescript
import { z } from 'zod'

// Zod schema 直接实现 StandardSchemaV1
const createConversationSchema = z.object({
  title: z.string(),
  mode: z.enum(['chat', 'agent']).optional(),
})

server.handle(
  'conversation/create',
  { schema: createConversationSchema },
  async (ctx, ...args) => {
    // args 已通过 schema 校验，类型为 { title: string; mode?: 'chat' | 'agent' }
    const { title, mode } = args[0]
    // ...
  }
)
```

**支持的 Schema 类型**：`z.string()`、`z.number()`、`z.object()`、`z.array()` 等所有 Zod 类型。

## 5. 超时机制

### 5.1 背景

原 `ElectronRpcClient.call()` 有 30 秒硬编码超时，无法自定义。`HttpRpcClient` 无超时机制。

### 5.2 AbortController 模式

**注意**：`AbortSignal` 标准 API 没有 `timeout` 属性。调用者需要自行通过 `AbortSignal.timeout()` 静态方法或自行用 `setTimeout` 管理超时。

```typescript
export interface RpcCallOptions {
  signal?: AbortSignal
}

export interface RpcClient {
  call<T>(
    event: string,
    options?: RpcCallOptions,
    ...args: unknown[]
  ): Promise<T>
  stream<T>(
    event: string,
    options?: RpcCallOptions,
    ...args: unknown[]
  ): Rpc.StreamResult<T>
}
```

### 5.3 ElectronRpcClient 实现

```typescript
async call<T>(
  event: string,
  options: RpcCallOptions = {},
  ...args: unknown[]
): Promise<T> {
  const { signal } = options
  const invokeId = `invoke-${++this._invokeCounter}`
  const eventPath = event.replaceAll(/^\/|\/$/g, '')

  return new Promise((resolve, reject) => {
    // AbortSignal 处理
    if (signal?.aborted) {
      reject(new RpcError('ABORTED', 'Request was aborted'))
      return
    }

    const abortHandler = () => {
      this._pendingCalls.delete(invokeId)
      // 区分超时和其他取消
      if (signal?.reason?.name === 'TimeoutError') {
        reject(new RpcError('TIMEOUT', `RPC call ${event} timed out`))
      } else {
        reject(new RpcError('ABORTED', 'Request was aborted'))
      }
    }

    signal?.addEventListener('abort', abortHandler)

    this._pendingCalls.set(invokeId, {
      resolve: (...args) => {
        signal?.removeEventListener('abort', abortHandler)
        resolve(args[0] as T)
      },
      reject: (...args) => {
        signal?.removeEventListener('abort', abortHandler)
        reject(args[0])
      },
    })

    this._webContents.send(`rpc:invoke:${eventPath}`, { invokeId, args })
  })
}
```

### 5.4 使用示例

```typescript
// 超时控制（使用 AbortSignal.timeout()）
try {
  const result = await client.call(
    'event',
    { signal: AbortSignal.timeout(5000) },
    ...args
  )
} catch (err) {
  if (err instanceof RpcError && err.code === 'TIMEOUT') {
    // 处理超时
  }
}

// 手动取消
const controller = new AbortController()
setTimeout(() => controller.abort(), 5000)

try {
  const result = await client.call(
    'event',
    { signal: controller.signal },
    ...args
  )
} catch (err) {
  if (err instanceof RpcError && err.code === 'ABORTED') {
    // 处理取消
  }
}

// 注意：AbortSignal.timeout() 需要 polyfill 或 Node.js 18+ 环境
// 旧环境可使用：new AbortController() + setTimeout + controller.abort()
```

## 6. 目录结构

```
apps/desktop/src/shared/rpc/
├── types.ts           # 新增 WindowRegistry、RpcCallOptions
├── RpcError.ts
├── utils.ts           # 新增 createTimeoutSignal() 工具函数
├── electron/
│   ├── ElectronRpcServer.ts   # 改造：使用 WindowRegistry
│   ├── ElectronRpcClient.ts   # 新增 AbortSignal 支持
│   └── index.ts
├── http/
│   ├── HttpRpcServer.ts       # 新增 SSE push + schema 校验
│   ├── HttpRpcClient.ts       # 新增 SSE stream + onEvent + AbortSignal
│   └── index.ts
└── index.ts
```

## 7. 依赖变更

```diff
# packages/desktop/package.json
+ "@standard-schema/spec": "^1.0.0"
```

## 8. 向后兼容性

### 8.1 RpcClient.call() 签名变更

**原签名**：

```typescript
call<T>(event: string, ...args: unknown[]): Promise<T>
```

**新签名**：

```typescript
call<T>(event: string, options?: RpcCallOptions, ...args: unknown[]): Promise<T>
```

**破坏性变更说明**：
如果现有代码这样调用：

```typescript
client.call('conversation/create', { title: 'Test' })
```

新实现会将 `{ title: 'Test' }` 解释为 `options`，导致实际参数丢失。

**迁移方案**：

1. **首选方案**：应用层使用 Zod 等 schema 定义参数，由 schema 校验层处理参数解析
2. **次选方案**：创建新方法 `callWithOptions()` 专门处理带选项的调用：
   ```typescript
   // 新方法（推荐迁移目标）
   callWithOptions<T>(event: string, options: RpcCallOptions, ...args: unknown[]): Promise<T>
   ```

### 8.2 其他兼容性

- `RpcServer.handle()` 的 `schema` 属性是可选的，不提供则跳过校验
- `WindowRegistry` 是新增接口，原 `WebContentsManager` 接口废弃

## 9. WindowRegistry 实现指南

### 9.1 基本实现

`WindowRegistry` 由应用层实现，通常与窗口管理逻辑一起：

```typescript
// 应用层实现示例
class AppWindowRegistry implements WindowRegistry {
  private windows = new Map<string, BrowserWindow>() // clientId -> window
  private groups = new Map<string, Set<string>>() // groupId -> Set<clientId>
  private webContentsToClientId = new Map<WebContents, string>() // reverse index

  registerWindow(window: BrowserWindow, group?: string): string {
    const clientId = `client-${window.id}`
    this.windows.set(clientId, window)
    this.webContentsToClientId.set(window.webContents, clientId)

    // 自动入组
    if (group) {
      this.joinGroup(clientId, group)
    }

    return clientId
  }

  unregisterWindow(window: BrowserWindow): void {
    const clientId = this.webContentsToClientId.get(window.webContents)
    if (!clientId) return

    // 从所有群组移除
    for (const [_, clientIds] of this.groups) {
      clientIds.delete(clientId)
    }

    this.windows.delete(clientId)
    this.webContentsToClientId.delete(window.webContents)
  }

  joinGroup(clientId: string, groupId: string): void {
    if (!this.groups.has(groupId)) {
      this.groups.set(groupId, new Set())
    }
    this.groups.get(groupId)!.add(clientId)
  }

  leaveGroup(clientId: string, groupId: string): void {
    this.groups.get(groupId)?.delete(clientId)
  }

  sendToClient(clientId: string, channel: string, ...args: unknown[]): void {
    const window = this.windows.get(clientId)
    if (window && !window.isDestroyed()) {
      window.webContents.send(channel, ...args)
    }
  }

  sendToGroup(groupId: string, channel: string, ...args: unknown[]): void {
    const clientIds = this.groups.get(groupId)
    if (clientIds) {
      for (const clientId of clientIds) {
        this.sendToClient(clientId, channel, ...args)
      }
    }
  }

  sendToAll(channel: string, ...args: unknown[]): void {
    for (const [clientId] of this.windows) {
      this.sendToClient(clientId, channel, ...args)
    }
  }

  getWebContentsByClientId(clientId: string): WebContents | null {
    const window = this.windows.get(clientId)
    return window && !window.isDestroyed() ? window.webContents : null
  }

  getClientIdByWebContents(webContents: WebContents): string | null {
    return this.webContentsToClientId.get(webContents) ?? null
  }
}
```

### 9.2 与 ElectronRpcServer 集成

```typescript
const registry = new AppWindowRegistry()
const server = new ElectronRpcServer(registry, ipcMain)

// 注册窗口（自动入组 "workspace-1"）
appWindow.on('ready-to-show', () => {
  const clientId = registry.registerWindow(appWindow, 'workspace-1')
})

// 关闭窗口时注销
appWindow.on('closed', () => {
  registry.unregisterWindow(appWindow)
})
```

### 9.3 生命周期管理

- `WindowRegistry` 实例通常与应用生命周期相同
- 当窗口关闭时，从 registry 注销
- SSE 客户端断开时，自动从 `_sseClients` 移除（通过 `stream.onAbort()`）
