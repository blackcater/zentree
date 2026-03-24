export interface IRpcErrorDefinition {
	readonly code: string
	readonly message: string
	readonly data?: unknown
}

export interface RpcServer {
	handle(
		event: string,
		handler: <T = unknown>(
			args: unknown
		) => T | AsyncIterator<T, unknown, unknown>
	): void

	push(event: string, target: RpcTarget, ...args: unknown[]): void

	onEvent(
		listener: (client: RpcClient, event: string, ...args: unknown[]) => void
	): void
}

export interface RpcClient {
	groupId: string

	call(method: string, args: unknown): Promise<unknown>

	stream(
		method: string,
		args: unknown
	): AsyncIterator<unknown, unknown, unknown>

	onEvent(listener: (event: string, ...args: unknown[]) => void): void

	/** @deprecated Only needed for Electron. HTTP uses SSE connections directly. */
	send?(event: string, ...args: unknown[]): void
}

export type RpcTarget =
	| { type: 'broadcast' }
	| { type: 'group'; groupId: string }

export interface RpcRequest {
	id: string
	method: string
	args: unknown
}

export interface RpcResponse {
	id: string
	result?: unknown
	error?: IRpcErrorDefinition
}

export interface RpcStreamChunk {
	id: string
	chunk: unknown
	done?: boolean
}

export interface RpcPushMessage {
	event: string
	target: RpcTarget
	args: unknown[]
}
