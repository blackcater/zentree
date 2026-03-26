# RPC Debug Multi-Window Testing Design

## Overview

Extend the rpc-debug page to support multi-window broadcast testing. Create multiple BrowserWindow instances that join different groups, then test sendToAll / sendToGroup / sendToClient message broadcasting.

## Core Features

### 1. Window Creation

- **Group Selection**: Dropdown to select group-a, group-b, or no group
- **Spawn Button**: Calls `api.createWindow(groupId)` to create a new BrowserWindow via IPC to main process
- **New Window**: Opens `rpc-debug` route, displays its own `clientId` and `groupId`

### 2. Current Window Info Display

- Show current window's `clientId` and `groupId` at the top of rpc-debug page

### 3. Broadcast Testing

| Action | Description |
|--------|-------------|
| `sendToAll` | Broadcast event to ALL registered windows |
| `sendToGroup` | Send event to all windows in group-a or group-b |
| `sendToClient` | Send event to specific clientId |
| `trigger-event` | Trigger a named event, simulating push message |

### 4. Event Listener

- Subscribe to events and display received broadcast messages

## Data Flow

```
[WindowA-group-a] ─┐
[WindowB-group-a] ─┼── sendToGroup("group-a") ─→ These windows receive
[WindowC-group-b] ─┘

[WindowA] ─┐
[WindowB] ─┼── sendToAll() ─→ All windows receive
[WindowC] ─┘
```

## Implementation

### New RPC Handlers (main process)

| Handler | Description |
|---------|-------------|
| `POST /debug/window/create` | Create new BrowserWindow with optional group |
| `POST /debug/window/info` | Return current window's clientId and groupId |
| `POST /debug/push/send-to-all` | Push event to all windows |
| `POST /debug/push/send-to-group` | Push event to specific group |
| `POST /debug/push/send-to-client` | Push event to specific clientId |
| `POST /debug/push/trigger-event` | Trigger a named event, simulating push message (used by sendToX to test event delivery) |

### UI Components

1. **WindowInfoCard** — Displays clientId and groupId (fetched from `/debug/window/info`)
2. **WindowManagerCard** — Group selection + spawn button
3. **BroadcastCard** — sendToAll, sendToGroup (with group selector), sendToClient (with clientId input)
4. **EventListenerCard** — Enhanced to show received event with metadata: event name, args, sender clientId (passed via event payload `{ eventName, args, senderClientId }`)

### API Shape

```typescript
// createWindow
// groupId: string | null (null = no group)
api.createWindow(groupId: string | null): Promise<{ clientId: string; windowId: number }>

// window info
client.call<{ clientId: string; groupId: string | null }>('/debug/window/info')

// sendToAll: args are sent as separate positional arguments
client.call('/debug/push/send-to-all', eventName: string, ...args: unknown[])

// sendToGroup
client.call('/debug/push/send-to-group', groupId: string, eventName: string, ...args: unknown[])

// sendToClient
client.call('/debug/push/send-to-client', clientId: string, eventName: string, ...args: unknown[])
```

## Files to Modify

- `apps/desktop/src/renderer/src/routes/rpc-debug.tsx` — Add new UI components
- `apps/desktop/src/main/services/RpcDebugService.ts` — Add new handlers (or create if not exists)
- `apps/desktop/src/preload/index.ts` — Expose `api.createWindow`

## Testing Scenarios

1. Open 3 windows: 2 in group-a, 1 in group-b
2. Send to group-a → only 2 windows receive
3. Send to all → all 3 windows receive
4. Send to specific clientId → only that window receives

**Edge cases:**
- Sending to non-existent group → no-op (silently ignored)
- Sending to non-existent clientId → no-op (silently ignored)
- `createWindow(null)` → window created with no group
