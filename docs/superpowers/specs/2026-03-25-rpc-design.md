# RPC Framework Design

## Overview

A unified RPC framework for desktop applications with two transport implementations:
- **Electron IPC** - For communication between main and renderer processes
- **HTTP + SSE** - For communication between processes on different machines

## Directory Structure

```
desktop/src/shared/rpc/
├── types.ts           # Core type definitions
├── RpcError.ts       # Unified error structure
├── RpcServer.ts      # Server class (abstract)
├── RpcClient.ts      # Client class (abstract)
├── electron/         # Electron IPC implementation
│   ├── ElectronRpcServer.ts
│   └── ElectronRpcClient.ts
└── http/            # HTTP + SSE implementation
    ├── HttpRpcServer.ts
    └── HttpRpcClient.ts
```

## Core Interfaces

### RpcServer

```typescript
abstract class RpcServer {
  // Register event handler (supports sync and streaming responses)
  abstract handle(event: string, handler: (args: unknown) => unknown | AsyncIterator): void

  // Push event to clients
  abstract push(event: string, target: Target, ...args: unknown[]): void

  // Listen for client events
  abstract onEvent(listener: (client: RpcClient, event: string, ...args: unknown[]) => void): void
}
```

### RpcClient

```typescript
abstract class RpcClient {
  abstract readonly groupId: string

  // Request-response call
  abstract call(method: string, args: unknown): Promise<unknown>

  // Streaming call (returns AsyncIterator)
  abstract stream(method: string, args: unknown): AsyncIterator

  // Listen for server pushes
  abstract onEvent(listener: (event: string, ...args: unknown[]) => void): void
}
```

### Target

```typescript
type Target =
  | { type: 'broadcast' }              // Push to all connected clients
  | { type: 'group'; groupId: string } // Push to clients in the same group
```

### RpcError

```typescript
interface RpcError {
  code: string      // Error code, e.g., 'NOT_FOUND', 'INTERNAL_ERROR'
  message: string    // Human-readable message
  data?: unknown     // Optional additional data
}
```

## Design Decisions

### 1. Unified Error Structure

Electron IPC does not automatically propagate errors across process boundaries. Therefore, the framework defines a unified `RpcError` structure that all transports must use to serialize and transmit errors back to the client.

### 2. Separate Implementation Classes

Each transport has its own concrete `RpcServer` and `RpcClient` implementation:

```typescript
// Electron scenario
const server = new ElectronRpcServer()
const client = new ElectronRpcClient({ groupId: 'agents' })

// HTTP scenario
const server = new HttpRpcServer({ port: 4096 })
const client = new HttpRpcClient({ url: 'http://localhost:4096', groupId: 'agents' })
```

### 3. Streaming with AsyncIterator

For streaming responses, server handlers return an `AsyncIterator`. This is the modern JavaScript standard for streaming and works well in both Node.js and browser environments.

Server:
```typescript
server.handle('streamOutput', async function* (args) {
  while (hasData) {
    yield { chunk: data }
    await delay(100)
  }
})
```

Client:
```typescript
for await (const chunk of client.stream('streamOutput', { taskId })) {
  console.log(chunk)
}
```

### 4. Separate HTTP and SSE

- **HTTP POST** - For request-response calls (`call`)
- **SSE (Server-Sent Events)** - For server-to-client pushes (`push`) and streaming responses (`stream`)
- **WebSocket** - Not used; SSE is sufficient for unidirectional streaming

### 5. Client Identity via groupId

Clients identify themselves by `groupId` during construction. This allows the server to route pushes to specific groups without requiring explicit window IDs.

```typescript
const client = new ElectronRpcClient({ groupId: 'agents' })
```

### 6. Multi-Window Support

For Electron multi-window scenarios:
- **Broadcast** - `push(event, { type: 'broadcast' }, ...args)` notifies all windows
- **Group multicast** - `push(event, { type: 'group', groupId: 'agents' }, ...args)` notifies windows in the same group

## Implementation Details

### Electron Transport

- Uses Electron's built-in `ipcMain`/`ipcRenderer` for communication
- Main process acts as the message broker
- Windows communicate via the main process

### HTTP + SSE Transport

- HTTP POST endpoint `/rpc` for incoming calls
- SSE endpoint `/rpc/events` for server pushes and streaming responses
- HTTP is used for request-response; SSE is used for server-to-client streaming

## Testing Strategy (TDD)

1. Write interface tests against `RpcServer` and `RpcClient` abstract classes
2. Implement `ElectronRpcServer` and `ElectronRpcClient` with mock IPC
3. Implement `HttpRpcServer` and `HttpRpcClient` with mock HTTP/SSE
4. All tests run with `bun test`

## Usage Examples

### Electron Main Process

```typescript
const server = new ElectronRpcServer()

server.handle('getStatus', async () => {
  return { status: 'ok' }
})

server.handle('streamLogs', async function* (args) {
  for await (const log of logStream) {
    yield { log }
  }
})

server.onEvent((client, event, ...args) => {
  console.log('Client event:', event, args)
})
```

### Electron Renderer Process

```typescript
const client = new ElectronRpcClient({ groupId: 'renderer' })

const status = await client.call('getStatus', {})
console.log(status) // { status: 'ok' }

for await (const { log } of client.stream('streamLogs', {})) {
  console.log(log)
}

client.onEvent((event, ...args) => {
  console.log('Server push:', event, args)
})
```

### Cross-Machine HTTP Server

```typescript
const server = new HttpRpcServer({ port: 4096 })

server.handle('getInfo', async () => {
  return { version: '1.0.0' }
})
```

### Cross-Machine HTTP Client

```typescript
const client = new HttpRpcClient({ url: 'http://192.168.1.100:4096', groupId: 'remote-agent' })

const result = await client.call('getInfo', {})
```
