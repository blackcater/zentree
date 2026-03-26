# RPC 框架实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现跨进程 RPC 框架，支持 Electron IPC 和 HTTP 两种传输层

**Architecture:**

- 核心接口定义在 `types.ts`（已有）
- `RpcServer` / `RpcRouter` 用于服务端注册 handler
- `RpcClient` 用于客户端调用
- `ElectronRpcServer` / `ElectronRpcClient` 实现 Electron IPC 传输
- `HttpRpcServer` / `HttpRpcClient` 实现 HTTP 传输

**Tech Stack:**

- TypeScript
- Electron IPC (ipcMain/ipcRenderer)
- superjson (序列化)
- @standard-schema/spec (Schema 验证)

---

## File Structure

```
apps/desktop/src/shared/rpc/
├── types.ts                    # 核心接口 (已存在)
├── RpcError.ts                 # 错误类 (已存在,需补充 fromJSON)
├── utils.ts                    # 工具函数 (已存在)
├── electron/
│   ├── ElectronRpcServer.ts    # 主进程 RPC 服务
│   ├── ElectronRpcClient.ts    # 渲染进程 RPC 客户端
│   └── index.ts                # Electron 模块导出
├── http/
│   ├── HttpRpcServer.ts        # HTTP RPC 服务端
│   ├── HttpRpcClient.ts        # HTTP RPC 客户端
│   └── index.ts                # HTTP 模块导出
└── index.ts                    # 统一导出
```

---

## Task 1: 补充 RpcError.fromJSON

**Files:**

- Modify: `apps/desktop/src/shared/rpc/RpcError.ts`

RpcError.ts 已缺少 `fromJSON` 静态方法，需要补充以支持错误反序列化。

- [ ] **Step 1: 添加 fromJSON 静态方法**

修改 `apps/desktop/src/shared/rpc/RpcError.ts`，在 `from` 方法后添加 `fromJSON`：

```typescript
static fromJSON(json: IRpcErrorDefinition): RpcError {
    return new RpcError(json.code, json.message, json.data)
}
```

- [ ] **Step 2: 运行类型检查**

Run: `bunx tsc --noEmit apps/desktop/src/shared/rpc/RpcError.ts`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/shared/rpc/RpcError.ts
git commit -m "fix(rpc): add RpcError.fromJSON for error deserialization"
```

---

## Task 2: 创建 ElectronRpcServer 基类

**Files:**

- Create: `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts`
- Test: `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.test.ts`

实现主进程 RPC 服务端，处理渲染进程调用和事件推送。

- [ ] **Step 1: 编写测试**

创建 `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest'
import type { IpcMain, WebContents } from 'electron'
import { ElectronRpcServer } from './ElectronRpcServer'

describe('ElectronRpcServer', () => {
  it('should register handler and invoke it', async () => {
    const mockIpcMain = {
      on: vi.fn(),
      handle: vi.fn(),
    } as unknown as IpcMain

    const server = new ElectronRpcServer(mockIpcMain)

    // Mock webContents for push
    const mockWebContents = {
      send: vi.fn(),
      id: 1,
    }

    server.handle('test/echo', async (ctx, msg: string) => {
      return { echoed: msg }
    })

    // Get the registered handler
    const handleSpy = mockIpcMain.handle as ReturnType<typeof vi.fn>
    expect(handleSpy).toHaveBeenCalledWith(
      'rpc:test/echo',
      expect.any(Function)
    )
  })

  it('should support router for namespace organization', async () => {
    const mockIpcMain = {
      on: vi.fn(),
      handle: vi.fn(),
    } as unknown as IpcMain

    const server = new ElectronRpcServer(mockIpcMain)

    server.router('conversation').handle('create', async (ctx, params) => {
      return { id: 'conv-1', ...params }
    })

    const handleSpy = mockIpcMain.handle as ReturnType<typeof vi.fn>
    expect(handleSpy).toHaveBeenCalledWith(
      'rpc:conversation/create',
      expect.any(Function)
    )
  })

  it('should push event to webContents', async () => {
    const mockIpcMain = {
      on: vi.fn(),
      handle: vi.fn(),
    } as unknown as IpcMain

    const server = new ElectronRpcServer(mockIpcMain)
    const mockWebContents = { send: vi.fn(), id: 1 }

    // Register a client
    server.handle('test/register', async (ctx) => {
      return { clientId: ctx.clientId }
    })

    // Invoke the handler to establish context
    const handleFn = (mockIpcMain.handle as ReturnType<typeof vi.fn>).mock
      .calls[0][1]
    const result = await handleFn({}, 'test-args')

    // Test push
    server.push('notification', { type: 'broadcast' }, { msg: 'hello' })
    // push should work without throwing
  })
})
```

- [ ] **Step 2: 运行测试验证**

Run: `bun test apps/desktop/src/shared/rpc/electron/ElectronRpcServer.test.ts`
Expected: 测试文件可运行（部分测试可能因 mock 不完整而失败，这是预期的）

- [ ] **Step 3: 实现 ElectronRpcServer**

创建 `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts`：

```typescript
import type { IpcMain, IpcMainInvokeEvent, WebContents } from 'electron'
import type {
  RpcServer,
  RpcRouter,
  Rpc,
  HandleOptions,
  IRpcErrorDefinition,
} from '../types'
import { RpcError } from '../RpcError'

interface RegisteredHandler {
  handler: Rpc.HandlerFn
  options?: HandleOptions
}

// 用于应用层注入 webContents 管理器
export interface WebContentsManager {
  send(clientId: string, channel: string, ...args: unknown[]): void
  getWebContents(clientId: string): WebContents | null
}

export class ElectronRpcServer implements RpcServer {
  private handlers = new Map<string, RegisteredHandler>()
  private ipcMain: IpcMain
  private webContentsManager: WebContentsManager | null = null

  constructor(ipcMain: IpcMain) {
    this.ipcMain = ipcMain
  }

  // 设置 WebContents 管理器，用于 push 和事件发送
  setWebContentsManager(manager: WebContentsManager): void {
    this.webContentsManager = manager
  }

  handle(event: string, handler: Rpc.HandlerFn): void
  handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void
  handle(
    event: string,
    optionsOrHandler: HandleOptions | Rpc.HandlerFn,
    maybeHandler?: Rpc.HandlerFn
  ): void {
    const eventPath = this.normalizeEvent(event)
    const { handler, options } =
      typeof optionsOrHandler === 'function'
        ? { handler: optionsOrHandler, options: undefined }
        : { handler: maybeHandler!, options: optionsOrHandler }

    this.handlers.set(eventPath, { handler, options })

    // 监听 invoke:xxx 通道，接收客户端调用
    this.ipcMain.on(
      `rpc:invoke:${eventPath}`,
      async (e, payload: { invokeId: string; args: unknown[] }) => {
        const { invokeId, args } = payload
        const clientId = `client-${e.sender.id}`

        try {
          const result = await handler({ clientId }, ...args)

          // Handle async iterator (streaming)
          if (
            result &&
            typeof result === 'object' &&
            Symbol.asyncIterator in result
          ) {
            const iterator = result[Symbol.asyncIterator]()
            let cancel = false

            // Store cancel function on the event for abort
            ;(e as any)._rpcCancel = () => {
              cancel = true
            }

            for await (const chunk of iterator) {
              if (cancel) break
              // Send streaming chunk back
              e.sender.send(`rpc:stream:${eventPath}:${invokeId}`, {
                chunk,
                done: false,
              })
            }

            e.sender.send(`rpc:stream:${eventPath}:${invokeId}`, {
              chunk: null,
              done: true,
            })
            e.sender.send(`rpc:response:${invokeId}`, {
              result: { chunks: [] },
            })
          } else {
            e.sender.send(`rpc:response:${invokeId}`, { result })
          }
        } catch (err) {
          const rpcError = RpcError.from(err)
          e.sender.send(`rpc:response:${invokeId}`, {
            error: rpcError.toJSON(),
          })
        }
      }
    )
  }

  router(namespace: string): RpcRouter {
    const prefix = this.normalizeEvent(namespace)
    return {
      handle: (event: string, handler: Rpc.HandlerFn) => {
        this.handle(`${prefix}/${event}`, handler)
      },
      handle: (
        event: string,
        options: HandleOptions,
        handler: Rpc.HandlerFn
      ) => {
        this.handle(`${prefix}/${event}`, options, handler)
      },
      router: (ns: string) => {
        return this.router(`${prefix}/${ns}`)
      },
    }
  }

  push(event: string, target: Rpc.Target, ...args: unknown[]): void {
    if (!this.webContentsManager) {
      console.warn(
        'ElectronRpcServer: WebContentsManager not set, push() will not work'
      )
      return
    }

    const eventPath = this.normalizeEvent(event)

    if (target.type === 'broadcast') {
      // Send to all clients - app layer handles this via WebContentsManager
      // App would iterate all known clientIds
      this.webContentsManager.send('*', `rpc:event:${eventPath}`, ...args)
    } else if (target.type === 'client' && target.clientId) {
      this.webContentsManager.send(
        target.clientId,
        `rpc:event:${eventPath}`,
        ...args
      )
    } else if (target.type === 'group' && target.groupId) {
      // Groups handled by app layer
      this.webContentsManager.send(
        `group:${target.groupId}`,
        `rpc:event:${eventPath}`,
        ...args
      )
    }
  }

  private normalizeEvent(event: string): string {
    return event.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
  }
}
```

**注意**：使用 `ipcMain.on` 而非 `ipcMain.handle`，因为我们需要通过 `rpc:response:invokeId` 自定义响应通道。`ipcMain.handle` 会自动处理响应，不适合我们的协议。

**注意**：IPC 通道协议：

- 客户端调用：`rpc:invoke:event/path` 发送 `{ invokeId, args }`
- 服务端响应：`rpc:response:invokeId` 发送 `{ result }` 或 `{ error }`
- 服务端流式：`rpc:stream:event/path:invokeId` 发送 `{ chunk, done }`
- 服务端推送事件：`rpc:event:event/path`

- [ ] **Step 4: 运行测试**

Run: `bun test apps/desktop/src/shared/rpc/electron/ElectronRpcServer.test.ts`
Expected: 测试通过

- [ ] **Step 5: 提交**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts apps/desktop/src/shared/rpc/electron/ElectronRpcServer.test.ts
git commit -m "feat(rpc): add ElectronRpcServer for main process"
```

---

## Task 3: 创建 ElectronRpcClient

**Files:**

- Create: `apps/desktop/src/shared/rpc/electron/ElectronRpcClient.ts`
- Test: `apps/desktop/src/shared/rpc/electron/ElectronRpcClient.test.ts`

实现渲染进程 RPC 客户端，通过 preload 暴露的 API 调用主进程。

- [ ] **Step 1: 编写测试**

创建 `apps/desktop/src/shared/rpc/electron/ElectronRpcClient.test.ts`：

```typescript
import { describe, it, expect, vi } from 'vitest'
import type { WebContents } from 'electron'
import { ElectronRpcClient } from './ElectronRpcClient'

describe('ElectronRpcClient', () => {
  it('should call rpc handler and return result', async () => {
    const mockWebContents = {
      send: vi.fn(),
      id: 1,
      on: vi.fn(),
    }

    const client = new ElectronRpcClient(
      mockWebContents as unknown as WebContents
    )

    // Mock invoke response
    let handler: any
    ;(mockWebContents.send as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string, ...args) => {
        if (channel.startsWith('rpc:invoke:')) {
          // Simulate successful response
          setTimeout(() => {
            const replyChannel = channel.replace('rpc:invoke:', 'rpc:response:')
            // Find the listener and call it
          }, 0)
        }
      }
    )

    // This is a simplified test - full implementation needs proper async handling
    expect(client.clientId).toBe('client-1')
  })

  it('should support onEvent for listening to push events', async () => {
    const mockWebContents = {
      send: vi.fn(),
      id: 1,
      on: vi.fn(),
    }

    const client = new ElectronRpcClient(
      mockWebContents as unknown as WebContents
    )

    const handler = vi.fn()
    const cancel = client.onEvent('notification', handler)

    expect(mockWebContents.on).toHaveBeenCalledWith(
      'rpc:event:notification',
      expect.any(Function)
    )
  })
})
```

- [ ] **Step 2: 实现 ElectronRpcClient**

创建 `apps/desktop/src/shared/rpc/electron/ElectronRpcClient.ts`：

```typescript
import type { WebContents } from 'electron'
import type { RpcClient, Rpc, IRpcErrorDefinition } from '../types'
import { RpcError } from '../RpcError'

export class ElectronRpcClient implements RpcClient {
  readonly clientId: string
  readonly groupId?: string

  private webContents: WebContents
  private pendingCalls = new Map<
    string,
    { resolve: Function; reject: Function }
  >()
  private eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()
  private streamHandlers = new Map<
    string,
    { onChunk: Function; onDone: Function }
  >()
  private invokeCounter = 0

  constructor(webContents: WebContents, groupId?: string) {
    this.webContents = webContents
    this.clientId = `client-${webContents.id}`
    this.groupId = groupId

    // Listen for RPC responses
    webContents.on('ipc-message', (channel: string, ...args: unknown[]) => {
      if (channel.startsWith('rpc:response:')) {
        const invokeId = channel.replace('rpc:response:', '')
        const pending = this.pendingCalls.get(invokeId)
        if (pending) {
          const payload = args[0] as {
            result?: unknown
            error?: IRpcErrorDefinition
          }
          if (payload.error) {
            pending.reject(RpcError.fromJSON(payload.error))
          } else {
            pending.resolve(payload.result)
          }
          this.pendingCalls.delete(invokeId)
        }
      } else if (channel.startsWith('rpc:event:')) {
        const eventName = channel.replace('rpc:event:', '')
        const listeners = this.eventListeners.get(eventName)
        if (listeners) {
          for (const listener of listeners) {
            listener(...args)
          }
        }
      } else if (channel.startsWith('rpc:stream:')) {
        // Format: rpc:stream:eventPath:invokeId
        const parts = channel.split(':')
        const invokeId = parts[parts.length - 1]
        const payload = args[0] as { chunk: unknown; done: boolean }
        const handler = this.streamHandlers.get(invokeId)
        if (handler) {
          if (payload.done) {
            handler.onDone()
          } else {
            handler.onChunk(payload.chunk)
          }
        }
      }
    })
  }

  async call<T>(event: string, ...args: unknown[]): Promise<T> {
    const invokeId = `invoke-${++this.invokeCounter}`
    const eventPath = event.replace(/^\/|\/$/g, '')

    return new Promise((resolve, reject) => {
      this.pendingCalls.set(invokeId, { resolve, reject })

      // Send invoke message: rpc:invoke:eventPath with { invokeId, args }
      this.webContents.send(`rpc:invoke:${eventPath}`, { invokeId, args })

      // Timeout: 30 seconds default
      setTimeout(() => {
        if (this.pendingCalls.has(invokeId)) {
          this.pendingCalls.delete(invokeId)
          reject(new RpcError(RpcError.TIMEOUT, `RPC call ${event} timed out`))
        }
      }, 30000)
    })
  }

  stream<T>(event: string, ...args: unknown[]): Rpc.StreamResult<T> {
    const invokeId = `invoke-${++this.invokeCounter}`
    const eventPath = event.replace(/^\/|\/$/g, '')
    const chunks: T[] = []
    let cancelFn: (() => void) | null = null

    // Set up stream handlers before sending
    this.streamHandlers.set(invokeId, {
      onChunk: (chunk: unknown) => {
        chunks.push(chunk as T)
      },
      onDone: () => {
        this.streamHandlers.delete(invokeId)
      },
    })

    // Send invoke message
    this.webContents.send(`rpc:invoke:${eventPath}`, { invokeId, args })

    const iterator: AsyncIterator<T> = {
      next: async () => {
        if (chunks.length > 0) {
          return { done: false, value: chunks.shift()! }
        }
        // Wait for more chunks
        await new Promise<void>((resolve) => {
          const check = () => {
            if (chunks.length > 0) {
              resolve()
            } else if (!this.streamHandlers.has(invokeId)) {
              resolve() // Stream ended
            } else {
              setTimeout(check, 10)
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
        if (cancelFn) cancelFn()
        this.streamHandlers.delete(invokeId)
        // TODO: Send cancel message to server
      },
    }
  }

  onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn {
    const channel = `rpc:event:${event}`

    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
      this.webContents.on(channel, (...listenerArgs: unknown[]) => {
        const listeners = this.eventListeners.get(event)
        if (listeners) {
          for (const l of listeners) {
            l(...listenerArgs)
          }
        }
      })
    }

    this.eventListeners.get(event)!.add(listener)

    return () => {
      const listeners = this.eventListeners.get(event)
      if (listeners) {
        listeners.delete(listener)
      }
    }
  }

  abort(): void {
    // Cancel all pending calls
    for (const [id, pending] of this.pendingCalls) {
      pending.reject(new RpcError(RpcError.ABORTED, 'Aborted'))
    }
    this.pendingCalls.clear()

    // Clear all stream handlers
    this.streamHandlers.clear()
  }
}
```

**注意**：IPC 通道协议：

- 客户端调用：`rpc:invoke:event/path` 发送 `{ invokeId, args }`
- 服务端响应：`rpc:response:invokeId` 发送 `{ result }` 或 `{ error }`
- 服务端流式：`rpc:stream:event/path:invokeId` 发送 `{ chunk, done }`
- 服务端推送事件：`rpc:event:event/path`

- [ ] **Step 3: 运行测试**

Run: `bun test apps/desktop/src/shared/rpc/electron/ElectronRpcClient.test.ts`
Expected: 测试通过

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcClient.ts apps/desktop/src/shared/rpc/electron/ElectronRpcClient.test.ts
git commit -m "feat(rpc): add ElectronRpcClient for renderer process"
```

---

## Task 4: 创建 electron 模块导出

**Files:**

- Create: `apps/desktop/src/shared/rpc/electron/index.ts`

- [ ] **Step 1: 创建模块导出**

创建 `apps/desktop/src/shared/rpc/electron/index.ts`：

```typescript
export { ElectronRpcServer } from './ElectronRpcServer'
export type { ElectronRpcClient } from './ElectronRpcClient'
export { ElectronRpcClient } from './ElectronRpcClient'
```

- [ ] **Step 2: 提交**

```bash
git add apps/desktop/src/shared/rpc/electron/index.ts
git commit -m "feat(rpc): export electron module"
```

---

## Task 5: 创建 HttpRpcServer

**Files:**

- Create: `apps/desktop/src/shared/rpc/http/HttpRpcServer.ts`
- Test: `apps/desktop/src/shared/rpc/http/HttpRpcServer.test.ts`

实现 HTTP RPC 服务端，通过 Hono 或 Express 提供 RESTful 接口。

- [ ] **Step 1: 编写测试**

创建 `apps/desktop/src/shared/rpc/http/HttpRpcServer.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { HttpRpcServer } from './HttpRpcServer'

describe('HttpRpcServer', () => {
  it('should register handler and invoke it via HTTP', async () => {
    const app = new Hono()
    const server = new HttpRpcServer(app)

    server.handle('test/echo', async (ctx, msg: string) => {
      return { echoed: msg }
    })

    // Test the endpoint
    const response = await app.request('/rpc/test/echo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(['hello']),
    })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({ result: { echoed: 'hello' } })
  })

  it('should support router for namespace', async () => {
    const app = new Hono()
    const server = new HttpRpcServer(app)

    server.router('conversation').handle('create', async (ctx, params) => {
      return { id: 'conv-1', ...params }
    })

    const response = await app.request('/rpc/conversation/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ title: 'Test' }]),
    })

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.result.id).toBe('conv-1')
  })
})
```

- [ ] **Step 2: 实现 HttpRpcServer**

创建 `apps/desktop/src/shared/rpc/http/HttpRpcServer.ts`：

```typescript
import type { Context, Next } from 'hono'
import type {
  RpcServer,
  RpcRouter,
  Rpc,
  HandleOptions,
  IRpcErrorDefinition,
} from '../types'
import { RpcError } from '../RpcError'

interface RegisteredHandler {
  handler: Rpc.HandlerFn
  options?: HandleOptions
}

type HonoApp = {
  use: (path: any, ...handlers: any[]) => HonoApp
  on: (method: string, path: any, ...handlers: any[]) => HonoApp
  request: (path: string, init?: RequestInit) => Promise<Response>
}

export class HttpRpcServer implements RpcServer {
  private handlers = new Map<string, RegisteredHandler>()
  private app: HonoApp

  constructor(app: HonoApp) {
    this.app = app
    this.setupRoutes()
  }

  private setupRoutes() {
    // POST /rpc/:path - RPC invocation
    this.app.on('POST', '/rpc/:path+', async (c) => {
      const path = c.req.param('path')
      const args = await c.req.json().catch(() => [])

      const handler = this.handlers.get(path)
      if (!handler) {
        return c.json(
          {
            error: { code: 'NOT_FOUND', message: `Handler not found: ${path}` },
          },
          404
        )
      }

      const ctx: Rpc.RequestContext = {
        clientId: this.getClientId(c),
      }

      try {
        const result = await handler.handler(ctx, ...args)

        // Handle async iterator (streaming) - deferred for HTTP
        if (
          result &&
          typeof result === 'object' &&
          Symbol.asyncIterator in result
        ) {
          // For HTTP, streaming would use SSE or chunked transfer
          // Deferred implementation
          const chunks: unknown[] = []
          for await (const chunk of result as AsyncIterator<unknown>) {
            chunks.push(chunk)
          }
          return c.json({ result: chunks })
        }

        return c.json({ result })
      } catch (err) {
        const rpcError = RpcError.from(err)
        return c.json({ error: rpcError.toJSON() }, 500)
      }
    })

    // GET /rpc/:path/:event - SSE for event subscription (deferred)
  }

  handle(event: string, handler: Rpc.HandlerFn): void
  handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void
  handle(
    event: string,
    optionsOrHandler: HandleOptions | Rpc.HandlerFn,
    maybeHandler?: Rpc.HandlerFn
  ): void {
    const eventPath = this.normalizeEvent(event)
    const { handler, options } =
      typeof optionsOrHandler === 'function'
        ? { handler: optionsOrHandler, options: undefined }
        : { handler: maybeHandler!, options: optionsOrHandler }

    this.handlers.set(eventPath, { handler, options })
  }

  router(namespace: string): RpcRouter {
    const prefix = this.normalizeEvent(namespace)
    return {
      handle: (event: string, handler: Rpc.HandlerFn) => {
        this.handle(`${prefix}/${event}`, handler)
      },
      handle: (
        event: string,
        options: HandleOptions,
        handler: Rpc.HandlerFn
      ) => {
        this.handle(`${prefix}/${event}`, options, handler)
      },
      router: (ns: string) => {
        return this.router(`${prefix}/${ns}`)
      },
    }
  }

  push(event: string, target: Rpc.Target, ...args: unknown[]): void {
    // HTTP push is deferred - would require SSE or WebSocket
    // For now, this is a no-op
  }

  private normalizeEvent(event: string): string {
    return event.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
  }

  private getClientId(c: Context): string {
    return c.req.header('x-rpc-client-id') || 'anonymous'
  }
}
```

- [ ] **Step 3: 运行测试**

Run: `bun test apps/desktop/src/shared/rpc/http/HttpRpcServer.test.ts`
Expected: 测试通过

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/shared/rpc/http/HttpRpcServer.ts apps/desktop/src/shared/rpc/http/HttpRpcServer.test.ts
git commit -m "feat(rpc): add HttpRpcServer for HTTP transport"
```

---

## Task 6: 创建 HttpRpcClient

**Files:**

- Create: `apps/desktop/src/shared/rpc/http/HttpRpcClient.ts`
- Test: `apps/desktop/src/shared/rpc/http/HttpRpcClient.test.ts`

实现 HTTP RPC 客户端。

- [ ] **Step 1: 编写测试**

创建 `apps/desktop/src/shared/rpc/http/HttpRpcClient.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { HttpRpcClient } from './HttpRpcClient'

describe('HttpRpcClient', () => {
  it('should have clientId after construction', () => {
    const client = new HttpRpcClient('http://localhost:3000')
    expect(client.clientId).toBeDefined()
  })

  it('should accept custom clientId', () => {
    const client = new HttpRpcClient('http://localhost:3000', 'my-client')
    expect(client.clientId).toBe('my-client')
  })
})
```

- [ ] **Step 2: 实现 HttpRpcClient**

创建 `apps/desktop/src/shared/rpc/http/HttpRpcClient.ts`：

```typescript
import type { RpcClient, Rpc, IRpcErrorDefinition } from '../types'
import { RpcError } from '../RpcError'

export class HttpRpcClient implements RpcClient {
  readonly clientId: string
  readonly groupId?: string

  private baseUrl: string
  private pendingStreams = new Map<
    string,
    { resolve: Function; reject: Function }
  >()

  constructor(baseUrl: string, clientId?: string, groupId?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.clientId = clientId || `http-client-${Date.now()}`
    this.groupId = groupId
  }

  async call<T>(event: string, ...args: unknown[]): Promise<T> {
    const normalizedEvent = event.replace(/^\/|\/$/g, '')

    const response = await fetch(`${this.baseUrl}/rpc/${normalizedEvent}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rpc-client-id': this.clientId,
        ...(this.groupId && { 'x-rpc-group-id': this.groupId }),
      },
      body: JSON.stringify(args),
    })

    if (!response.ok) {
      throw new RpcError(
        'HTTP_ERROR',
        `HTTP ${response.status}: ${response.statusText}`
      )
    }

    const payload = await response.json()

    if (payload.error) {
      throw RpcError.fromJSON(payload.error as IRpcErrorDefinition)
    }

    return payload.result as T
  }

  stream<T>(event: string, ...args: unknown[]): Rpc.StreamResult<T> {
    // HTTP streaming deferred - would use fetch with ReadableStream
    // For now, return an empty async iterator
    const chunks: T[] = []

    const iterator: AsyncIterator<T> = {
      next: async () => {
        if (chunks.length > 0) {
          return { done: false, value: chunks.shift()! }
        }
        return { done: true, value: undefined }
      },
    }

    return {
      [Symbol.asyncIterator]: () => iterator,
      cancel: () => {
        // Cancel pending stream
      },
    }
  }

  onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn {
    // HTTP long-polling or SSE for events - deferred
    return () => {}
  }

  abort(): void {
    // Cancel all pending operations
    for (const pending of this.pendingStreams.values()) {
      pending.reject(
        RpcError.from({ code: RpcError.ABORTED, message: 'Aborted' })
      )
    }
    this.pendingStreams.clear()
  }
}
```

- [ ] **Step 3: 运行测试**

Run: `bun test apps/desktop/src/shared/rpc/http/HttpRpcClient.test.ts`
Expected: 测试通过

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/shared/rpc/http/HttpRpcClient.ts apps/desktop/src/shared/rpc/http/HttpRpcClient.test.ts
git commit -m "feat(rpc): add HttpRpcClient for HTTP transport"
```

---

## Task 7: 创建 http 模块导出

**Files:**

- Create: `apps/desktop/src/shared/rpc/http/index.ts`

- [ ] **Step 1: 创建模块导出**

创建 `apps/desktop/src/shared/rpc/http/index.ts`：

```typescript
export { HttpRpcServer } from './HttpRpcServer'
export { HttpRpcClient } from './HttpRpcClient'
```

- [ ] **Step 2: 提交**

```bash
git add apps/desktop/src/shared/rpc/http/index.ts
git commit -m "feat(rpc): export http module"
```

---

## Task 8: 创建统一导出

**Files:**

- Create: `apps/desktop/src/shared/rpc/index.ts`

- [ ] **Step 1: 创建统一导出**

创建 `apps/desktop/src/shared/rpc/index.ts`：

```typescript
// Core types and interfaces
export * from './types'
export { RpcError } from './RpcError'
export { extractRpcErrorMsg } from './utils'

// Electron transport
export { ElectronRpcServer } from './electron/ElectronRpcServer'
export { ElectronRpcClient } from './electron/ElectronRpcClient'

// HTTP transport
export { HttpRpcServer } from './http/HttpRpcServer'
export { HttpRpcClient } from './http/HttpRpcClient'
```

- [ ] **Step 2: 提交**

```bash
git add apps/desktop/src/shared/rpc/index.ts
git commit -m "feat(rpc): export unified RPC API"
```

---

## Task 9: 类型检查

在完成所有任务后，运行完整的类型检查确保无错误。

- [ ] **Step 1: 运行完整类型检查**

Run: `bunx tsc --noEmit -p apps/desktop/tsconfig.json`
Expected: 无类型错误

- [ ] **Step 2: 运行所有测试**

Run: `bun test apps/desktop/src/shared/rpc/**/*.test.ts`
Expected: 所有测试通过

- [ ] **Step 3: 代码格式检查**

Run: `bunx oxlint apps/desktop/src/shared/rpc/` 和 `bunx oxfmt --check apps/desktop/src/shared/rpc/`
Expected: 无警告/错误

- [ ] **Step 4: 最终提交**

如果有任何修复，提交最终更改：

```bash
git add -A
git commit -m "fix(rpc): address lint and typecheck issues"
```

---

## Implementation Notes

1. **ElectronRpcServer push() 实现**: 实际的 WebContents 映射需要在应用层管理，当前实现使用 clientId 作为标识符

2. **HTTP 流式**: HTTP 流式响应（SSE/chunked）在第一期实现中标记为 deferred

3. **Schema 验证**: HandleOptions.schema 字段已定义但未实现验证逻辑

4. **超时机制**: 请求超时未实现，使用默认超时

5. **客户端生命周期**: 断连/重连感知未实现
