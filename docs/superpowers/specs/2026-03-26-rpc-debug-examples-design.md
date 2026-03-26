# RPC Debug Examples Design

## Overview

Add simple examples in `desktop/src/main` and `desktop/src/renderer` to test the custom RPC capabilities in `desktop/src/shared/rpc`.

**Purpose**: Developer debugging tool to manually trigger RPC calls and verify they work correctly.

## Architecture

```
desktop/src/main/
├── services/
│   ├── index.ts              # Export RpcDebugService
│   ├── WindowManager.ts
│   └── RpcDebugService.ts     # NEW: RPC debug handlers
└── index.ts                   # Initialize RpcDebugService

desktop/src/renderer/src/
├── routes/
│   └── rpc-debug.tsx          # NEW: RPC debug UI page
└── main.tsx

desktop/src/preload/
├── index.ts                   # Expose RPC client
└── preload.d.ts               # Type declarations
```

## Main Process - RpcDebugService

**File**: `apps/desktop/src/main/services/RpcDebugService.ts`

Registers the following RPC handlers under `/debug` namespace:

| Handler | Type | Description |
|---------|------|-------------|
| `/debug/echo` | call | Returns input text - tests basic call |
| `/debug/add` | call | Returns sum of two numbers - tests parameter passing |
| `/debug/stream-numbers` | stream | Yields 1-5 with 200ms delay - tests streaming |
| `/debug/server-time` | call | Returns server ISO time + clientId - tests context |
| `/debug/trigger-event` | call | Pushes event to caller - tests server push |

### Implementation

```typescript
export class RpcDebugService {
  constructor(
    private readonly server: ElectronRpcServer,
    _ipcMain: IpcMain
  ) {
    this.registerHandlers()
  }

  private registerHandlers() {
    const router = this.server.router('debug')

    router.handle('echo', (_, text: string) => text)
    router.handle('add', (_, a: number, b: number) => a + b)

    router.handle('stream-numbers', async function* () {
      for (let i = 1; i <= 5; i++) {
        await new Promise((r) => setTimeout(r, 200))
        yield i
      }
    })

    router.handle('server-time', (ctx) => ({
      clientId: ctx.clientId,
      time: new Date().toISOString(),
    }))

    router.handle('trigger-event', (ctx, eventName: string) => {
      this.server.push(eventName, { type: 'client', clientId: ctx.clientId }, 'Hello from server!')
      return { triggered: true }
    })
  }
}
```

## Preload - Expose RPC Client

**File**: `apps/desktop/src/preload/index.ts`

Expose `ElectronRpcClient` instance via `window.api.rpc`.

**File**: `apps/desktop/src/preload/preload.d.ts`

Add `rpc: ElectronRpcClient | null` to the `API` interface.

## Renderer - /rpc-debug Page

**File**: `apps/desktop/src/renderer/src/routes/rpc-debug.tsx`

### UI Design

Card-based layout, each RPC call is a card:

```
┌─────────────────────────────┐
│ /debug/echo                 │
│ [____________] [Call]        │
│ Result: "hello"             │
└─────────────────────────────┘

┌─────────────────────────────┐
│ /debug/add                  │
│ [a: __] [b: __] [Call]      │
│ Result: 42                  │
└─────────────────────────────┘

┌─────────────────────────────┐
│ /debug/stream-numbers       │
│ [Start] [Cancel]             │
│ Progress: [1] → [2] → ...   │
└─────────────────────────────┘

┌─────────────────────────────┐
│ /debug/server-time          │
│ [Call]                      │
│ ClientId: client-1          │
│ Server Time: 2026-03-26...  │
└─────────────────────────────┘

┌─────────────────────────────┐
│ /debug/trigger-event        │
│ [event name] [Trigger]       │
│ Result: { triggered: true } │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Event Listener              │
│ [Start Listening] [Stop]     │
│ Events:                     │
│ - "my-event": "Hello..."    │
└─────────────────────────────┘
```

### Components

- **Card**: Container with title, input area, action buttons, result display
- **StreamCard**: Extends Card with progress visualization and cancel support
- **EventCard**: Event listener with start/stop and event log

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `apps/desktop/src/main/services/RpcDebugService.ts` |
| Modify | `apps/desktop/src/main/services/index.ts` |
| Modify | `apps/desktop/src/main/index.ts` |
| Modify | `apps/desktop/src/preload/index.ts` |
| Modify | `apps/desktop/src/preload/preload.d.ts` |
| Create | `apps/desktop/src/renderer/src/routes/rpc-debug.tsx` |

## Initialization Flow

1. `main/index.ts` imports `RpcDebugService`
2. `RpcDebugService` constructor receives `ElectronRpcServer` instance
3. On construction, handlers are registered immediately
4. Renderer navigates to `/rpc-debug` and uses `window.api.rpc` to call handlers
