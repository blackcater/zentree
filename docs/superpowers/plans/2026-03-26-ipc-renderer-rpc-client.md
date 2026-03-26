# IpcRendererRpcClient Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `IpcRendererRpcClient` that implements `RpcClient` interface using `ipcRenderer`, enabling renderer process to make RPC calls without direct WebContents access.

**Architecture:**
- Renderer process uses `ipcRenderer` to send messages to main process
- Main process (ElectronRpcServer) receives via `ipcMain.on` and responds
- IpcRendererRpcClient listens on generic channels (`rpc:response`, `rpc:event`, `rpc:stream`) and extracts specific invokeId/eventName from channel names

**Key Challenge:** `ipcRenderer.on(channel)` does NOT support wildcard patterns. We must listen on exact channel names OR use a bridge approach.

**Solution:** Modify ElectronRpcServer to send responses to BOTH formats:
1. Original: `rpc:response:${invokeId}` (for ElectronRpcClient via webContents)
2. New: `rpc:response` with invokeId in payload (for IpcRendererRpcClient via ipcRenderer)

**Tech Stack:** Electron IPC (ipcRenderer/ipcMain), TypeScript

---

## File Structure

```
apps/desktop/src/shared/rpc/electron/
├── index.ts                      # Add IpcRendererRpcClient export
├── ElectronRpcClient.ts         # Keep for main process use
├── IpcRendererRpcClient.ts      # NEW: Renderer process RPC client
├── ElectronRpcServer.ts         # Modify: send to both formats
└── AppWindowRegistry.ts         # Keep as-is

apps/desktop/src/preload/
├── index.ts                     # Modify: use IpcRendererRpcClient
└── preload.d.ts               # Modify: update types
```

---

## Task 1: Modify ElectronRpcServer to support both response formats

**Files:**
- Modify: `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts`

- [ ] **Step 1: Read current implementation**

```typescript
// Current ElectronRpcServer.ts (lines 82-88)
e.sender.send(`rpc:response:${invokeId}`, { result })
```

Needs to ALSO send via ipcRenderer to a generic channel.

- [ ] **Step 2: Modify to send both formats**

Update the response sending code to:
1. Send via `webContents.send('rpc:response:invokeId', data)` - existing
2. ALSO send via `webContents.send('rpc:response', { channel: 'rpc:response:invokeId', ...data })` - new

This allows IpcRendererRpcClient to listen on `rpc:response` and extract the specific channel.

```typescript
// In ElectronRpcServer.ts, modify the response sending:
// Original response (for ElectronRpcClient via webContents)
e.sender.send(`rpc:response:${invokeId}`, { result })

// Also send via generic channel (for IpcRendererRpcClient via ipcRenderer)
// This bridges webContents messages to ipcRenderer-accessible messages
e.sender.send('rpc:response', {
  channel: `rpc:response:${invokeId}`,
  result,
})
```

Same for error responses and stream chunks.

- [ ] **Step 3: Run tests**

Run: `cd apps/desktop && bun test src/shared/rpc/electron/ElectronRpcServer.test.ts`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts
git commit -m "feat(rpc): add generic channel support for IpcRendererRpcClient

ElectronRpcServer now sends responses to both:
1. rpc:response:${invokeId} (original for ElectronRpcClient)
2. rpc:response (new for IpcRendererRpcClient bridge)"
```

---

## Task 2: Create IpcRendererRpcClient

**Files:**
- Create: `apps/desktop/src/shared/rpc/electron/IpcRendererRpcClient.ts`
- Test: `apps/desktop/src/shared/rpc/electron/IpcRendererRpcClient.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// apps/desktop/src/shared/rpc/electron/IpcRendererRpcClient.test.ts
import { describe, it, expect, vi, beforeEach } from 'bun:test'
import { IpcRendererRpcClient } from './IpcRendererRpcClient'

describe('IpcRendererRpcClient', () => {
  let mockIpcRenderer: any
  let client: IpcRendererRpcClient

  beforeEach(() => {
    mockIpcRenderer = {
      send: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
    }
  })

  it('should have clientId and groupId', () => {
    client = new IpcRendererRpcClient(mockIpcRenderer, 'test-group')
    expect(client.clientId).toBe('ipc-renderer-client')
    expect(client.groupId).toBe('test-group')
  })

  it('should send rpc:invoke on call()', async () => {
    let responseHandler: Function
    mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
      if (channel === 'rpc:response') {
        responseHandler = (data: any) => cb(null, {
          channel: `rpc:response:${data?.invokeId || 'invoke-1'}`,
          result: { message: 'success' }
        })
      }
    })
    mockIpcRenderer.removeListener = vi.fn()

    client = new IpcRendererRpcClient(mockIpcRenderer)

    // Trigger the response handler
    responseHandler({ invokeId: 'invoke-1', result: { message: 'success' } })

    expect(mockIpcRenderer.send).toHaveBeenCalledWith('rpc:invoke:test', {
      invokeId: expect.stringContaining('invoke-'),
      args: ['arg1'],
    })
  })

  it('should handle errors', async () => {
    let responseHandler: Function
    mockIpcRenderer.on = vi.fn((channel: string, cb: Function) => {
      if (channel === 'rpc:response') {
        responseHandler = (data: any) => cb(null, {
          channel: `rpc:response:invoke-1`,
          error: { code: 'ERR_SERVER', message: 'Server error' }
        })
      }
    })

    client = new IpcRendererRpcClient(mockIpcRenderer)

    responseHandler({
      channel: 'rpc:response:invoke-1',
      error: { code: 'ERR_SERVER', message: 'Server error' }
    })

    await expect(
      client.call('/test', {})
    ).rejects.toThrow('Server error')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/desktop && bun test src/shared/rpc/electron/IpcRendererRpcClient.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write implementation**

```typescript
// apps/desktop/src/shared/rpc/electron/IpcRendererRpcClient.ts
import type { IpcRenderer } from 'electron'

import { RpcError, type IRpcErrorDefinition } from '../RpcError'
import type { Rpc, RpcClient } from '../types'

export class IpcRendererRpcClient implements RpcClient {
  readonly clientId: string
  readonly groupId?: string

  private readonly _ipcRenderer: IpcRenderer
  private readonly _pendingCalls = new Map<string, { resolve: Function; reject: Function }>()
  private readonly _eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()
  private readonly _streamHandlers = new Map<string, { onChunk: Function; onDone: Function; cancel: Function }>()
  private _invokeCounter = 0

  constructor(ipcRenderer: IpcRenderer, groupId?: string) {
    this._ipcRenderer = ipcRenderer
    this.clientId = 'ipc-renderer-client'
    this.groupId = groupId

    // Listen for generic rpc:response channel
    // Server sends to this channel with full channel info in payload
    ipcRenderer.on('rpc:response', (...args: unknown[]) => {
      // args[0] is the channel that was actually used by server, e.g., "rpc:response:invoke-1"
      // args[1] is the payload
      const payload = args[1] as { channel: string; result?: unknown; error?: IRpcErrorDefinition }
      if (!payload?.channel) return

      // Extract invokeId from channel like "rpc:response:invoke-1"
      const invokeId = payload.channel.split(':').slice(2).join(':')
      const pending = this._pendingCalls.get(invokeId)
      if (pending) {
        if (payload.error) {
          pending.reject(RpcError.fromJSON(payload.error))
        } else {
          pending.resolve(payload.result)
        }
        this._pendingCalls.delete(invokeId)
      }
    })

    // Listen for events
    ipcRenderer.on('rpc:event', (...args: unknown[]) => {
      const payload = args[1] as { channel: string; data?: unknown[] }
      if (!payload?.channel) return
      const eventName = payload.channel.split(':').slice(2).join(':')
      const listeners = this._eventListeners.get(eventName)
      if (listeners) {
        for (const listener of listeners) {
          listener(...(payload.data || []))
        }
      }
    })

    // Listen for stream chunks
    ipcRenderer.on('rpc:stream', (...args: unknown[]) => {
      const payload = args[1] as { channel: string; chunk?: unknown; done?: boolean }
      if (!payload?.channel) return
      const channel = payload.channel
      // channel format: "rpc:stream:eventPath:invokeId"
      const parts = channel.split(':')
      const invokeId = parts.at(-1)!
      const handler = this._streamHandlers.get(invokeId)
      if (handler) {
        if (payload.done) {
          handler.onDone()
        } else {
          handler.onChunk(payload.chunk)
        }
      }
    })
  }

  async call<T>(event: string, options: Rpc.CallOptions = {}, ...args: unknown[]): Promise<T> {
    const { signal } = options
    const invokeId = `invoke-${++this._invokeCounter}`
    const eventPath = event.replaceAll(/^\/|\/$/g, '')

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new RpcError(RpcError.ABORTED, 'Request was aborted'))
        return
      }

      const abortHandler = () => {
        this._pendingCalls.delete(invokeId)
        if (signal?.reason?.name === 'TimeoutError') {
          reject(new RpcError(RpcError.TIMEOUT, `RPC call ${event} timed out`))
        } else {
          reject(new RpcError(RpcError.ABORTED, 'Request was aborted'))
        }
      }

      signal?.addEventListener('abort', abortHandler)

      this._pendingCalls.set(invokeId, {
        resolve: (...resolveArgs: unknown[]) => {
          signal?.removeEventListener('abort', abortHandler)
          resolve(resolveArgs[0] as T)
        },
        reject: (...rejectArgs: unknown[]) => {
          signal?.removeEventListener('abort', abortHandler)
          reject(rejectArgs[0])
        },
      })

      this._ipcRenderer.send(`rpc:invoke:${eventPath}`, { invokeId, args })
    })
  }

  stream<T>(event: string, _options: Rpc.CallOptions = {}, ...args: unknown[]): Rpc.StreamResult<T> {
    const invokeId = `invoke-${++this._invokeCounter}`
    const eventPath = event.replaceAll(/^\/|\/$/g, '')
    const chunks: T[] = []

    const cancelStream = () => {
      this._ipcRenderer.send(`rpc:cancel:${eventPath}:${invokeId}`)
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

    this._ipcRenderer.send(`rpc:invoke:${eventPath}`, { invokeId, args })

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

  onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn {
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
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/desktop && bun test src/shared/rpc/electron/IpcRendererRpcClient.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/IpcRendererRpcClient.ts apps/desktop/src/shared/rpc/electron/IpcRendererRpcClient.test.ts
git commit -m "feat(rpc): add IpcRendererRpcClient for renderer process

IpcRendererRpcClient implements RpcClient interface using ipcRenderer.
Listens on generic channels (rpc:response, rpc:event, rpc:stream) and
extracts specific invokeId/eventName from channel info in payload."
```

---

## Task 3: Update ElectronRpcServer to send events via generic channel too

**Files:**
- Modify: `apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts`

- [ ] **Step 1: Modify push() method**

The `push()` method sends events to specific clients. Update it to also send via the generic `rpc:event` channel.

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/ElectronRpcServer.ts
git commit -m "feat(rpc): send events via generic rpc:event channel

Push events to both:
1. Original target-specific channel (rpc:event:${eventName})
2. Generic rpc:event channel with eventName in payload"
```

---

## Task 4: Export IpcRendererRpcClient from index

**Files:**
- Modify: `apps/desktop/src/shared/rpc/electron/index.ts`

- [ ] **Step 1: Add export**

```typescript
// apps/desktop/src/shared/rpc/electron/index.ts
export { ElectronRpcServer } from './ElectronRpcServer'
export { ElectronRpcClient } from './ElectronRpcClient'
export { IpcRendererRpcClient } from './IpcRendererRpcClient'  // NEW
export { AppWindowRegistry } from './AppWindowRegistry'
export type { WindowRegistry } from '../types'
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/shared/rpc/electron/index.ts
git commit -m "feat(rpc): export IpcRendererRpcClient"
```

---

## Task 5: Update preload to use IpcRendererRpcClient

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`
- Modify: `apps/desktop/src/preload/preload.d.ts`

- [ ] **Step 1: Update preload/index.ts**

```typescript
// apps/desktop/src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

import { electronAPI } from '@electron-toolkit/preload'

import { IpcRendererRpcClient } from '../shared/rpc/electron'

// Lazy-initialized RPC client
let rpcClient: IpcRendererRpcClient | null = null

const api = {
  getRpcClient: (): IpcRendererRpcClient => {
    if (!rpcClient) {
      rpcClient = new IpcRendererRpcClient(ipcRenderer)
    }
    return rpcClient
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
}
```

- [ ] **Step 2: Update preload.d.ts**

```typescript
// apps/desktop/src/preload/preload.d.ts
import type { ElectronAPI } from '@electron-toolkit/preload'
import type { IpcRendererRpcClient } from '../shared/rpc/electron'

interface API {
  getRpcClient(): IpcRendererRpcClient
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/preload/index.ts apps/desktop/src/preload/preload.d.ts
git commit -m "feat(preload): use IpcRendererRpcClient

Preload now creates IpcRendererRpcClient using ipcRenderer instead
of ElectronRpcClient using webContents. This works from renderer context."
```

---

## Task 6: Verify types compile and lint

**Files:**
- None (verification only)

- [ ] **Step 1: TypeScript check**

Run: `cd apps/desktop && bunx tsc --noEmit -p tsconfig.json`
Expected: No errors

- [ ] **Step 2: Lint**

Run: `cd apps/desktop && bunx oxlint src/shared/rpc/electron/IpcRendererRpcClient.ts src/preload/index.ts src/preload/preload.d.ts`
Expected: 0 warnings, 0 errors

- [ ] **Step 3: Format**

Run: `bunx oxfmt src/shared/rpc/electron/IpcRendererRpcClient.ts src/preload/index.ts src/preload/preload.d.ts`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "style: format and lint IpcRendererRpcClient"
```

---

## Task 7: End-to-end test with rpc-debug page

**Files:**
- None (verify existing integration)

- [ ] **Step 1: Start desktop app**

Run: `cd apps/desktop && bun run dev`

- [ ] **Step 2: Navigate to /rpc-debug**

- [ ] **Step 3: Test all RPC calls**

1. `/debug/echo` - should return same text
2. `/debug/add` - should return sum
3. `/debug/stream-numbers` - should show streaming numbers
4. `/debug/server-time` - should return clientId and time
5. `/debug/slow-echo` with timeout - should show timeout error
6. `/debug/trigger-event` + event listener - should receive event

---

## Summary

After completing all tasks:
- `IpcRendererRpcClient` uses `ipcRenderer` (available in renderer/preload context)
- `ElectronRpcServer` sends to both original channels AND generic channels
- Preload exposes `IpcRendererRpcClient` via `window.api.getRpcClient()`
- Renderer can use `window.api.getRpcClient().call()`, `.stream()`, `.onEvent()`
- Full backward compatibility with `ElectronRpcClient` maintained
