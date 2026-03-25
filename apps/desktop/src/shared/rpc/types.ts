export interface IRpcErrorDefinition {
	readonly code: string
	readonly message: string
	readonly data?: unknown
}

export namespace Rpc {
	export type HandlerFn = <T>(
		ctx: RequestContext,
		...args: any[]
	) => T | Promise<T> | AsyncIterator<T>

	export type CancelFn = () => void

	export interface RequestContext {
		clientId: string
		vaultId?: string
	}

	export type Target =
		| { type: 'broadcast' }
		| { type: 'group'; groupId: string }
}

export interface RpcServer {
	handle(event: string, handler: Rpc.HandlerFn): void

	push(event: string, target: Rpc.Target, ...args: unknown[]): void
}

export interface RpcClient {
	call<T>(event: string, ...args: any[]): Promise<T>

	stream<T>(event: string, ...args: any[]): AsyncIterator<T>

	onEvent(event: string, listener: (...args: any[]) => void): Rpc.CancelFn
}
