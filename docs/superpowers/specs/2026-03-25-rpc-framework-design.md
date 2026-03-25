# RPC 框架设计

## 1. 概述

设计一个跨进程的 RPC 框架，支持：
1. Electron 应用中主进程与渲染进程通信，以及多窗口信息推送
2. 跨设备的两个进程之间通信

## 2. 核心接口

核心接口定义在 `apps/desktop/src/shared/rpc/types.ts`，包括：

### 2.1 RpcServer

```typescript
export interface RpcServer {
    // 注册同步或异步 handler
    handle(event: string, handler: Rpc.HandlerFn): void
    handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void

    // 创建命名空间路由，用于代码组织
    router(namespace: string): RpcRouter

    // 向指定目标推送事件
    push(event: string, target: Rpc.Target, ...args: unknown[]): void
}
```

**Event 命名规范**：使用 `/` 分隔层级，如 `conversation/create`、`filesystem/read`

**代码组织**：有两种注册方式，效果等价：
```typescript
// 方式 1：直接注册
server.handle('filesystem/read', handler)

// 方式 2：通过 router 组织（等价）
server.router('filesystem').handle('read', handler)
```

### 2.2 RpcClient

```typescript
export interface RpcClient {
    readonly clientId: string
    readonly groupId?: string

    // 单次调用，event 使用 / 分隔路径
    call<T>(event: string, ...args: unknown[]): Promise<T>

    // 流式调用
    stream<T>(event: string, ...args: unknown[]): Rpc.StreamResult<T>

    // 事件监听
    onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn

    // 中止请求
    abort(): void
}
```

### 2.3 关键类型

```typescript
export namespace Rpc {
    // Handler 函数类型，支持同步、异步、流式返回
    export type HandlerFn<T = unknown> = (
        ctx: RequestContext,
        ...args: unknown[]
    ) => T | Promise<T> | AsyncIterator<T>

    // 取消函数
    export type CancelFn = () => void

    // 事件目标
    export type Target =
        | { type: 'broadcast' }           // 广播所有客户端
        | { type: 'group'; groupId: string }  // 群组内广播
        | { type: 'client'; clientId: string } // 单客户端推送

    // 请求上下文
    export interface RequestContext {
        readonly clientId: string
        readonly vaultId?: string
    }

    // 流式结果
    export type StreamResult<T> = {
        [Symbol.asyncIterator](): AsyncIterator<T>
        cancel(): void
    }
}
```

### 2.4 错误处理

```typescript
export interface IRpcErrorDefinition<Data = unknown> {
    readonly code: string
    readonly message: string
    readonly data?: Data
}

export class RpcError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly data?: unknown
    ) { ... }

    toJSON(): IRpcErrorDefinition { ... }
    static from(error: unknown): RpcError { ... }
    static fromJSON(json: IRpcErrorDefinition): RpcError { ... }

    static INTERNAL_ERROR = 'INTERNAL_ERROR'
    static UNKNOWN_ERROR = 'UNKNOWN_ERROR'
    static NOT_FOUND = 'NOT_FOUND'
    static INVALID_PARAMS = 'INVALID_PARAMS'
    static ABORTED = 'ABORTED'
    static TIMEOUT = 'TIMEOUT'
    static UNAUTHORIZED = 'UNAUTHORIZED'
    static FORBIDDEN = 'FORBIDDEN'
}
```

### 2.3 RpcRouter

命名空间路由接口，用于代码组织：

```typescript
export interface RpcRouter {
    // event 为相对路径，会与 namespace 拼接
    handle(event: string, handler: Rpc.HandlerFn): void
    handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void
    router(namespace: string): RpcRouter
}
```

## 3. 目录结构

```
apps/desktop/src/shared/rpc/
├── types.ts           # 核心接口定义
├── RpcError.ts       # 错误类
├── utils.ts          # 工具函数
├── electron/
│   ├── ElectronRpcServer.ts   # 主进程 RPC 服务
│   ├── ElectronRpcClient.ts   # 渲染进程 RPC 客户端
│   └── index.ts
├── http/
│   ├── HttpRpcServer.ts       # HTTP RPC 服务端
│   ├── HttpRpcClient.ts       # HTTP RPC 客户端
│   └── index.ts
└── index.ts           # 统一导出
```

## 4. 传输层实现

### 4.1 ElectronRpcServer

**职责**：主进程使用，监听 IPC 通道，注册 handler，处理渲染进程调用

```typescript
export class ElectronRpcServer implements RpcServer {
    constructor(ipcMain: IpcMain)

    handle(event: string, handler: Rpc.HandlerFn): void
    handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void

    router(namespace: string): RpcRouter

    // 向渲染进程推送事件
    push(event: string, target: Rpc.Target, ...args: unknown[]): void
}
```

### 4.2 ElectronRpcClient

**职责**：渲染进程使用，通过 preload 暴露的 API 调用主进程

```typescript
export class ElectronRpcClient implements RpcClient {
    constructor(webContents: WebContents)

    readonly clientId: string
    readonly groupId?: string

    call<T>(event: string, ...args: unknown[]): Promise<T>
    stream<T>(event: string, ...args: unknown[]): Rpc.StreamResult<T>
    onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn
    abort(): void
}
```

### 4.3 HttpRpcServer

**职责**：提供 HTTP 接口，供外部进程调用

```typescript
export class HttpRpcServer implements RpcServer {
    constructor(app: Hono | Express)

    handle(event: string, handler: Rpc.HandlerFn): void
    handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void

    router(namespace: string): RpcRouter
    push(event: string, target: Rpc.Target, ...args: unknown[]): void
}
```

### 4.4 HttpRpcClient

**职责**：HTTP 客户端，用于跨设备通信

```typescript
export class HttpRpcClient implements RpcClient {
    constructor(baseUrl: string, options?: HttpClientOptions)

    readonly clientId: string
    readonly groupId?: string

    call<T>(event: string, ...args: unknown[]): Promise<T>
    stream<T>(event: string, ...args: unknown[]): Rpc.StreamResult<T>
    onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn
    abort(): void
}
```

## 5. 设计原则

1. **接口驱动**：核心接口 (RpcServer/RpcClient) 定义传输抽象，具体实现负责通信细节
2. **命名空间路径**：event 使用 `/` 分隔层级，如 `conversation/create`、`filesystem/read`
3. **流式支持**：通过 `AsyncIterator` 接口支持流式响应
4. **目标推送**：`push()` 支持广播、群组、单客户端三种推送目标
5. **错误封装**：所有错误通过 `RpcError` 统一封装

## 6. 使用示例

### 6.1 主进程注册服务

```typescript
const server = new ElectronRpcServer(ipcMain)

server.handle('conversation/create', async (ctx, params) => {
    return { id: 'conv-1', ... }
})

server.handle('conversation/send', async (ctx, convId, message) => {
    // 返回异步迭代器实现流式
    return async function* () {
        for (const token of streamTokens(message)) {
            yield { token }
        }
    }
})

// 向所有窗口推送事件
server.push('notification', { type: 'broadcast' }, { msg: 'hello' })
```

### 6.2 渲染进程调用

```typescript
const client = new ElectronRpcClient(webContents)

// 单次调用
const conv = await client.call('conversation/create', { title: 'Test' })

// 流式调用
for await (const chunk of client.stream('conversation/send', 'conv-1', 'hello')) {
    console.log(chunk)
}

// 监听事件
const cancel = client.onEvent('notification', (data) => {
    console.log('Notification:', data)
})
```

### 6.3 跨设备 HTTP 调用

```typescript
const client = new HttpRpcClient('http://192.168.1.100:8080')

const result = await client.call('filesystem/read', '/path/to/file')
```

## 7. 未解决的问题

以下问题留待实现阶段决定：

1. **协议格式**：消息编码格式（JSON-RPC 2.0 / 自定义 Envelope）由实现方决定
2. **认证机制**：跨设备通信的认证暂不设计
3. **多窗口 Session 管理**：窗口与 clientId 的映射关系由应用层决定
4. **流式传输实现**：HTTP 下流式响应使用 SSE 或 chunked transfer
5. **客户端生命周期**：连接/断开感知、断线重连机制（第一期暂不实现）
6. **背压机制**：流式响应中客户端消费慢于服务端产生速度的处理（第一期暂不实现）
7. **超时机制**：请求级别超时的配置方式（第一期使用默认超时）

## 8. 参考竞品

- **AionUi**：Provider-Emitter 模式，双层架构
- **craft-agents-oss**：WebSocket RPC + MessageEnvelope
- **harnss**：Electron IPC + Codex JSON-RPC 2.0
- **superset**：tRPC 分层架构
- **opencode**：Worker RPC + HTTP REST + SSE
