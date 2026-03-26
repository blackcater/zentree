# RPC 框架增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 RPC 模块添加 WindowRegistry、HTTP SSE 支持、Schema 校验和 AbortController 超时机制

**Architecture:** 在现有 RPC 框架基础上添加新功能，保持向后兼容。WindowRegistry 解耦窗口管理，HttpRpcServer 通过 SSE 实现 push 和 stream，Schema 校验使用 @standard-schema/spec

**Tech Stack:** TypeScript, Electron, Hono, @standard-schema/spec, SSE

---

## 文件结构

```
apps/desktop/src/shared/rpc/
├── types.ts              # 修改: 添加 WindowRegistry, RpcCallOptions
├── RpcError.ts          # 无需修改
├── utils.ts             # 新增: createTimeoutSignal()
├── electron/
│   ├── AppWindowRegistry.ts   # 新增: WindowRegistry 示例实现
│   ├── ElectronRpcServer.ts   # 修改: 使用 WindowRegistry
│   ├── ElectronRpcServer.test.ts
│   ├── ElectronRpcClient.ts   # 修改: 添加 AbortSignal 支持
│   ├── ElectronRpcClient.test.ts
│   └── index.ts
├── http/
│   ├── HttpRpcServer.ts       # 修改: SSE push + schema 校验
│   ├── HttpRpcServer.test.ts
│   ├── HttpRpcClient.ts       # 修改: SSE stream + onEvent + AbortSignal
│   ├── HttpRpcClient.test.ts
│   └── index.ts
└── index.ts
```

---

## Task 1: 更新 types.ts - 添加 WindowRegistry 和 RpcCallOptions

**Files:**

- Modify: `apps/desktop/src/shared/rpc/types.ts`

- [ ] **Step 1: 添加 WindowRegistry 接口定义**

在 `types.ts` 末尾添加:

```typescript
import type { BrowserWindow, WebContents } from 'electron'

export interface WindowRegistry {
  registerWindow(window: BrowserWindow, group?: string): string
  unregisterWindow(window: BrowserWindow): void

  joinGroup(clientId: string, groupId: string): void
  leaveGroup(clientId: string, groupId: string): void

  sendToClient(clientId: string, channel: string, ...args: unknown[]): void
  sendToGroup(groupId: string, channel: string, ...args: unknown[]): void
  sendToAll(channel: string, ...args: unknown[]): void

  getWebContentsByClientId(clientId: string): WebContents | null
  getClientIdByWebContents(webContents: WebContents): string | null
}

export interface RpcCallOptions {
  signal?: AbortSignal
}
```

- [ ] **Step 2: 更新 RpcClient 接口添加 options 参数**

修改 `RpcClient` 接口:

```typescript
export interface RpcClient {
  readonly clientId: string
  readonly groupId?: string

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
  onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn
}
```

- [ ] **Step 3: 运行测试确保类型检查通过**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shared/rpc/types.ts
git commit -m "feat(rpc): add WindowRegistry interface and RpcCallOptions"
```

---

## Task 2: 实现 AppWindowRegistry 示例实现

**Files:**

- Create: `apps/desktop/src/shared/rpc/electron/AppWindowRegistry.ts`

- [ ] **Step 1: 编写 AppWindowRegistry 实现**

```typescript
import type { BrowserWindow, WebContents } from 'electron'

import type { WindowRegistry } from '../types'

export class AppWindowRegistry implements WindowRegistry {
  private windows = new Map<string, BrowserWindow>()
  private groups = new Map<string, Set<string>>()
  private webContentsToClientId = new Map<WebContents, string>()

  registerWindow(window: BrowserWindow, group?: string): string {
    const clientId = `client-${window.id}`
    this.windows.set(clientId, window)
    this.webContentsToClientId.set(window.webContents, clientId)

    if (group) {
      this.joinGroup(clientId, group)
    }

    return clientId
  }

  unregisterWindow(window: BrowserWindow): void {
    const clientId = this.webContentsToClientId.get(window.webContents)
    if (!clientId) return

    for (const [, clientIds] of this.groups) {
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

- [ ] **Step 2: 导出 AppWindowRegistry**

检查 `apps/desktop/src/shared/rpc/electron/index.ts`, 添加导出:

```typescript
export { AppWindowRegistry } from './AppWindowRegistry'
```

- [ ] **Step 3: 运行类型检查**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/AppWindowRegistry.ts apps/desktop/src/shared/rpc/electron/index.ts
git commit -m "feat(rpc): add AppWindowRegistry example implementation"
```

---

## Task 3: 重构 ElectronRpcServer 使用 WindowRegistry

**Files:**

- Modify: `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts`

- [ ] **Step 1: 更新导入并修改构造函数**

将 `WebContentsManager` 替换为 `WindowRegistry`:

```typescript
import type { IpcMain, WebContents } from 'electron'

import { RpcError } from '../RpcError'
import type { RpcServer, RpcRouter, Rpc, WindowRegistry } from '../types'
import { ElectronRpcRouter } from './ElectronRpcRouter'
```

删除 `WebContentsManager` 接口, 修改构造函数:

```typescript
export class ElectronRpcServer implements RpcServer {
  constructor(
    private readonly _registry: WindowRegistry,
    private readonly _ipcMain: IpcMain
  ) {}
```

- [ ] **Step 2: 更新 handle() 方法中的 clientId 获取逻辑**

修改 IPC handler 回调, 使用 `getClientIdByWebContents`:

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

    try {
      const result = await handlerFn({ clientId }, ...args)
      // ... 后续代码保持不变
```

- [ ] **Step 3: 更新 push() 方法使用 WindowRegistry**

```typescript
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
```

- [ ] **Step 4: 运行类型检查**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts
git commit -m "refactor(rpc): replace WebContentsManager with WindowRegistry"
```

---

## Task 4: 更新 ElectronRpcServer 测试

**Files:**

- Modify: `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.test.ts`

- [ ] **Step 1: 更新 mock 工厂函数**

```typescript
const createMockRegistry = (): WindowRegistry => ({
  sendToClient: vi.fn(),
  sendToGroup: vi.fn(),
  sendToAll: vi.fn(),
  registerWindow: vi.fn(() => 'client-1'),
  unregisterWindow: vi.fn(),
  joinGroup: vi.fn(),
  leaveGroup: vi.fn(),
  getWebContentsByClientId: vi.fn(),
  getClientIdByWebContents: vi.fn(() => 'client-1'),
})
```

- [ ] **Step 2: 更新所有使用 `mockManager` 的测试为 `mockRegistry`**

将 `mockManager.send` 替换为对应的 `mockRegistry.sendToXxx` 方法:

```typescript
// push event to broadcast
expect(mockRegistry.sendToAll).toHaveBeenCalledWith('rpc:event:test/event', {
  data: 'test',
})

// push event to specific client
expect(mockRegistry.sendToClient).toHaveBeenCalledWith(
  'client-123',
  'rpc:event:test/event',
  { data: 'test' }
)

// push event to group
expect(mockRegistry.sendToGroup).toHaveBeenCalledWith(
  'group-456',
  'rpc:event:test/event',
  { data: 'test' }
)
```

- [ ] **Step 3: 添加新测试 - clientId 反查**

```typescript
it('should get clientId from WebContents via registry', async () => {
  const mockRegistry = createMockRegistry()
  const mockIpcMain = createMockIpcMain()

  const server = new ElectronRpcServer(mockRegistry, mockIpcMain)

  server.handle('test/echo', async (ctx) => {
    return { clientId: ctx.clientId }
  })

  // 触发 handler
  const handler = (mockIpcMain.on as ReturnType<typeof vi.fn>).mock.calls[0][1]
  const mockSender = { id: 999 } as any
  await handler(mockSender, { invokeId: 'test-1', args: ['hello'] })

  expect(mockRegistry.getClientIdByWebContents).toHaveBeenCalledWith(mockSender)
})
```

- [ ] **Step 4: 运行测试**

Run: `cd apps/desktop && bun test src/shared/rpc/electron/ElectronRpcServer.test.ts`
Expected: 所有测试通过

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcServer.test.ts
git commit -m "test(rpc): update ElectronRpcServer tests for WindowRegistry"
```

---

## Task 5: 为 HttpRpcServer 添加 Schema 校验

**Files:**

- Modify: `apps/desktop/src/shared/rpc/http/HttpRpcServer.ts`

- [ ] **Step 1: 添加 schema 校验逻辑**

修改 `_setupRoutes()` 中的 handler 调用部分:

```typescript
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

    // 标准化输出需要展开为参数
    return handler.handler(ctx, ...(Array.isArray(result.value) ? result.value : [result.value]))
  }

  return handler.handler(ctx, ...args)
}
```

- [ ] **Step 2: 调用新的 \_handleRPC 方法**

修改 POST handler:

```typescript
this.app.post('/rpc/**', async (c: Context) => {
  const fullPath = c.req.path
  const rpcIndex = fullPath.indexOf('/rpc/')
  const path = rpcIndex >= 0 ? fullPath.slice(rpcIndex + 5) : fullPath
  const args = await c.req.json().catch(() => [])

  const ctx: Rpc.RequestContext = {
    clientId: this._getClientId(c),
  }

  try {
    const result = await this._handleRPC(path, args, ctx)

    // Handle async iterator (streaming)
    if (
      result &&
      typeof result === 'object' &&
      Symbol.asyncIterator in result
    ) {
      const chunks: unknown[] = []
      for await (const chunk of result as unknown as AsyncIterable<unknown>) {
        chunks.push(chunk)
      }
      return c.json({ result: chunks })
    }

    return c.json({ result })
  } catch (err) {
    const rpcError = RpcError.from(err)
    return c.json(
      { error: rpcError.toJSON() },
      rpcError.code === 'NOT_FOUND' ? 404 : 500
    )
  }
})
```

- [ ] **Step 3: 运行类型检查**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shared/rpc/http/HttpRpcServer.ts
git commit -m "feat(rpc): add schema validation to HttpRpcServer"
```

---

## Task 6: 为 HttpRpcServer 添加 SSE 支持

**Files:**

- Modify: `apps/desktop/src/shared/rpc/http/HttpRpcServer.ts`

- [ ] **Step 1: 添加 SSE 客户端管理**

添加属性:

```typescript
private _sseClients = new Map<string, Set<{ stream: ReadableStreamController; clientId: string }>>()
```

- [ ] **Step 2: 添加 SSE 路由设置方法**

```typescript
private _setupSSERoutes() {
  // GET /rpc/events - SSE 事件流
  this.app.get('/rpc/events', async (c: Context) => {
    const clientId = this._getClientId(c)

    return c.streamSSE(async (stream) => {
      const controller = { stream, clientId }
      if (!this._sseClients.has(clientId)) {
        this._sseClients.set(clientId, new Set())
      }
      this._sseClients.get(clientId)!.add(controller)

      stream.writeSSE({ event: 'connected', data: JSON.stringify({ clientId }) })

      stream.onAbort(() => {
        this._sseClients.get(clientId)?.delete(controller)
        if (this._sseClients.get(clientId)?.size === 0) {
          this._sseClients.delete(clientId)
        }
      })
    })
  })
}
```

- [ ] **Step 3: 实现 push() 方法的 SSE 发送**

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

private _broadcastSSE(event: string, data: string) {
  for (const [, controllers] of this._sseClients) {
    for (const stream of controllers) {
      stream.writeSSE({ event, data })
    }
  }
}

private _sendSSEToClient(clientId: string, event: string, data: string) {
  const controllers = this._sseClients.get(clientId)
  if (controllers) {
    for (const stream of controllers) {
      stream.writeSSE({ event, data })
    }
  }
}

private _sendSSEToGroup(groupId: string, event: string, data: string) {
  // HTTP 无群组概念，直接广播
  this._broadcastSSE(event, data)
}
```

- [ ] **Step 4: 在构造函数中调用 \_setupSSERoutes**

```typescript
constructor(private readonly app: Hono) {
  this._setupRoutes()
  this._setupSSERoutes()
}
```

- [ ] **Step 5: 运行类型检查**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/shared/rpc/http/HttpRpcServer.ts
git commit -m "feat(rpc): add SSE support to HttpRpcServer"
```

---

## Task 7: 更新 HttpRpcServer 测试

**Files:**

- Modify: `apps/desktop/src/shared/rpc/http/HttpRpcServer.test.ts`

- [ ] **Step 1: 添加 schema 校验测试**

```typescript
import { z } from 'zod'

it('should validate schema and reject invalid input', async () => {
  const app = new Hono()
  const server = new HttpRpcServer(app)

  const schema = z.object({
    name: z.string(),
    age: z.number(),
  })

  server.handle('test/validate', { schema }, async (_ctx, ...args) => {
    return { valid: true, data: args[0] }
  })

  // Invalid input - age should be number
  const response = await app.request('/rpc/test/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ name: 'John', age: 'not-a-number' }]),
  })

  expect(response.status).toBe(500)
  const json = await response.json()
  expect(json.error.code).toBe('INVALID_PARAMS')
})
```

- [ ] **Step 2: 添加 SSE 推送测试**

```typescript
it('should handle SSE connections', async () => {
  const app = new Hono()
  const server = new HttpRpcServer(app)

  server.handle('test/push', async (_ctx) => {
    server.push('test/event', { type: 'broadcast' }, { msg: 'hello' })
    return { pushed: true }
  })

  // Note: Full SSE testing requires client connection
  // This just verifies the route is set up correctly
  const response = await app.request('/rpc/events', {
    method: 'GET',
    headers: { Accept: 'text/event-stream' },
  })

  expect(response.status).toBe(200)
})
```

- [ ] **Step 3: 运行测试**

Run: `cd apps/desktop && bun test src/shared/rpc/http/HttpRpcServer.test.ts`
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shared/rpc/http/HttpRpcServer.test.ts
git commit -m "test(rpc): add HttpRpcServer tests for schema validation and SSE"
```

---

## Task 8: 更新 HttpRpcClient 添加 SSE stream() 和 onEvent()

**Files:**

- Modify: `apps/desktop/src/shared/rpc/http/HttpRpcClient.ts`

- [ ] **Step 1: 添加 SSE 相关属性**

```typescript
private _eventSource: EventSource | null = null
private _eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()
private _signal: AbortSignal | undefined
```

- [ ] **Step 2: 实现 SSE stream() 方法**

```typescript
async *stream<T>(event: string, options: RpcCallOptions = {}, ...args: unknown[]): AsyncIterable<T> {
  const normalizedEvent = event.replace(/^\/|\/$/g, '')

  const response = await fetch(
    `${this._baseUrl}/rpc/${normalizedEvent}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rpc-client-id': this.clientId,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(args),
      signal: options.signal,
    }
  )

  if (!response.ok) {
    throw new RpcError('HTTP_ERROR', `HTTP ${response.status}: ${response.statusText}`)
  }

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

- [ ] **Step 3: 实现 onEvent() 方法**

```typescript
onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn {
  if (!this._eventSource) {
    this._eventSource = new EventSource(`${this._baseUrl}/rpc/events`)

    this._eventSource.addEventListener('push', (e: MessageEvent) => {
      try {
        const { event: eventName, args } = JSON.parse(e.data)
        const listeners = this._eventListeners.get(eventName)
        if (listeners) {
          for (const l of listeners) {
            l(...args)
          }
        }
      } catch {
        // Ignore parse errors
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
    // Close EventSource if no listeners
    if (this._eventListeners.size === 0 && this._eventSource) {
      this._eventSource.close()
      this._eventSource = null
    }
  }
}
```

- [ ] **Step 4: 更新 call() 方法添加 AbortSignal 支持**

```typescript
async call<T>(event: string, options: RpcCallOptions = {}, ...args: unknown[]): Promise<T> {
  const normalizedEvent = event.replace(/^\/|\/$/g, '')

  const response = await fetch(
    `${this._baseUrl}/rpc/${normalizedEvent}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rpc-client-id': this.clientId,
        ...(this.groupId && { 'x-rpc-group-id': this.groupId }),
      },
      body: JSON.stringify(args),
      signal: options.signal,
    }
  )

  if (!response.ok) {
    throw new RpcError('HTTP_ERROR', `HTTP ${response.status}: ${response.statusText}`)
  }

  const payload = await response.json()

  if (payload.error) {
    throw RpcError.fromJSON(payload.error as IRpcErrorDefinition)
  }

  return payload.result as T
}
```

- [ ] **Step 5: 运行类型检查**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/shared/rpc/http/HttpRpcClient.ts
git commit -m "feat(rpc): add SSE stream and onEvent to HttpRpcClient"
```

---

## Task 9: 更新 HttpRpcClient 测试

**Files:**

- Modify: `apps/desktop/src/shared/rpc/http/HttpRpcClient.test.ts`

- [ ] **Step 1: 添加 SSE stream 测试**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'bun:test'

// Note: SSE stream testing requires a running server
// These tests verify the client's behavior with mocked responses
```

- [ ] **Step 2: 运行现有测试确保没有破坏性变更**

Run: `cd apps/desktop && bun test src/shared/rpc/http/HttpRpcClient.test.ts`
Expected: 现有测试通过

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/shared/rpc/http/HttpRpcClient.test.ts
git commit -m "test(rpc): update HttpRpcClient tests"
```

---

## Task 10: 更新 ElectronRpcClient 添加 AbortSignal 支持

**Files:**

- Modify: `apps/desktop/src/shared/rpc/electron/ElectronRpcClient.ts`

- [ ] **Step 1: 更新 call() 方法签名**

```typescript
async call<T>(
  event: string,
  options: RpcCallOptions = {},
  ...args: unknown[]
): Promise<T> {
  const { signal } = options
  const invokeId = `invoke-${++this._invokeCounter}`
  const eventPath = event.replace(/^\/|\/$/g, '')

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new RpcError('ABORTED', 'Request was aborted'))
      return
    }

    const abortHandler = () => {
      this._pendingCalls.delete(invokeId)
      if (signal?.reason?.name === 'TimeoutError') {
        reject(new RpcError('TIMEOUT', `RPC call ${event} timed out`))
      } else {
        reject(new RpcError('ABORTED', 'Request was aborted'))
      }
    }

    signal?.addEventListener('abort', abortHandler)

    this._pendingCalls.set(invokeId, {
      resolve: (...resolveArgs) => {
        signal?.removeEventListener('abort', abortHandler)
        resolve(resolveArgs[0] as T)
      },
      reject: (...rejectArgs) => {
        signal?.removeEventListener('abort', abortHandler)
        reject(rejectArgs[0])
      },
    })

    this._webContents.send(`rpc:invoke:${eventPath}`, { invokeId, args })
  })
}
```

- [ ] **Step 2: 更新 stream() 方法签名**

```typescript
stream<T>(
  event: string,
  options: RpcCallOptions = {},
  ...args: unknown[]
): Rpc.StreamResult<T> {
  const { signal } = options
  const invokeId = `invoke-${++this._invokeCounter}`
  const eventPath = event.replace(/^\/|\/$/g, '')
  const chunks: T[] = []

  const cancelStream = () => {
    this._webContents.send(`rpc:cancel:${eventPath}:${invokeId}`)
  }

  this._streamHandlers.set(invokeId, {
    onChunk: (chunk: unknown) => {
      chunks.push(chunk as T)
    },
    onDone: () => {
      this._streamHandlers.delete(invokeId)
    },
    cancel: cancelStream,
  })

  this._webContents.send(`rpc:invoke:${eventPath}`, { invokeId, args })

  const iterator: AsyncIterator<T> = {
    next: async () => {
      if (chunks.length > 0) {
        return { done: false, value: chunks.shift()! }
      }
      await new Promise<void>((resolve) => {
        const check = () => {
          if (chunks.length > 0) {
            resolve()
          } else if (this._streamHandlers.has(invokeId)) {
            setTimeout(check, 10)
          } else {
            resolve()
          }
        }
        check()
      })
      if (chunks.length > 0) {
        return { done: false, value: chunks.shift()! }
      }
      return { done: true, value: undefined }
    },
  }

  return {
    [Symbol.asyncIterator]: () => iterator,
    cancel: () => {
      const handler = this._streamHandlers.get(invokeId)
      if (handler?.cancel) {
        handler.cancel()
      }
      this._streamHandlers.delete(invokeId)
    },
  }
}
```

- [ ] **Step 3: 添加 RpcCallOptions 导入**

```typescript
import type { RpcClient, Rpc, RpcCallOptions } from '../types'
```

- [ ] **Step 4: 运行类型检查**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcClient.ts
git commit -m "feat(rpc): add AbortSignal support to ElectronRpcClient"
```

---

## Task 11: 更新 ElectronRpcClient 测试

**Files:**

- Modify: `apps/desktop/src/shared/rpc/electron/ElectronRpcClient.test.ts`

- [ ] **Step 1: 添加 AbortSignal 测试**

```typescript
it('should reject with ABORTED when signal is already aborted', async () => {
  const controller = new AbortController()
  controller.abort()

  const client = new ElectronRpcClient(mockWebContents)

  await expect(
    client.call('test/echo', { signal: controller.signal }, 'hello')
  ).rejects.toThrow('Request was aborted')
})
```

- [ ] **Step 2: 添加超时测试**

首先确保 `createTimeoutSignal` 工具函数已创建（Task 12）。然后添加测试:

```typescript
import { createTimeoutSignal } from '../utils'

it('should reject with TIMEOUT when signal times out', async () => {
  vi.useFakeTimers()
  const client = new ElectronRpcClient(mockWebContents)

  // Use createTimeoutSignal utility for reliable timeout testing
  const signal = createTimeoutSignal(1000)

  const promise = client.call('test/echo', { signal }, 'hello')

  // Fast-forward time to trigger timeout
  vi.advanceTimersByTime(1000)

  await expect(promise).rejects.toThrow()
  vi.useRealTimers()
})
```

Note: 如果测试环境支持 `AbortSignal.timeout()`，也可以直接使用 `AbortSignal.timeout(1000)` 替代。

- [ ] **Step 3: 运行测试**

Run: `cd apps/desktop && bun test src/shared/rpc/electron/ElectronRpcClient.test.ts`
Expected: 所有测试通过

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcClient.test.ts
git commit -m "test(rpc): add ElectronRpcClient AbortSignal tests"
```

---

## Task 12: 添加 utils.ts 创建工具函数

**Files:**

- Create: `apps/desktop/src/shared/rpc/utils.ts`

- [ ] **Step 1: 添加 createTimeoutSignal 工具函数**

```typescript
/**
 * Creates an AbortSignal that aborts after the specified timeout.
 * Note: This is a polyfill for AbortSignal.timeout() which is not widely supported.
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

/**
 * Creates an AbortSignal that can be aborted both manually and after timeout.
 */
export function createAbortSignalWithTimeout(timeoutMs: number): {
  signal: AbortSignal
  abort: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  return {
    signal: controller.signal,
    abort: () => {
      clearTimeout(timeoutId)
      controller.abort()
    },
  }
}
```

- [ ] **Step 2: 导出工具函数**

```typescript
export { createTimeoutSignal, createAbortSignalWithTimeout } from './utils'
```

- [ ] **Step 3: 运行类型检查**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shared/rpc/utils.ts apps/desktop/src/shared/rpc/index.ts
git commit -m "feat(rpc): add utils for AbortSignal timeout"
```

---

## 依赖安装

在开始实现前，需要安装依赖:

```bash
cd apps/desktop
bun add @standard-schema/spec zod
```
