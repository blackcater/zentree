import type { StandardSchemaV1 } from '@standard-schema/spec'

export namespace Rpc {
	export type HandlerFn<T = unknown> = (
		ctx: RequestContext,
		...args: unknown[]
	) => T | Promise<T> | AsyncIterator<T>

	export interface HandleOptions {
		schema?: StandardSchemaV1
	}

	export type CancelFn = () => void

	export type Target =
		| { type: 'broadcast' }
		| { type: 'group'; groupId: string }
		| { type: 'client'; clientId: string }

	export interface RequestContext {
		readonly clientId: string
		readonly vaultId?: string
	}

	export type StreamResult<T> = {
		[Symbol.asyncIterator](): AsyncIterator<T>
		cancel(): void
	}
}

export interface RpcServer {
	router(namespace: string): RpcRouter

	handle(event: string, handler: Rpc.HandlerFn): void
	handle(
		event: string,
		options: Rpc.HandleOptions,
		handler: Rpc.HandlerFn
	): void

	push(event: string, target: Rpc.Target, ...args: unknown[]): void
}

export interface RpcRouter {
	group(namespace: string): RpcRouter

	handle(event: string, handler: Rpc.HandlerFn): void
	handle(
		event: string,
		options: Rpc.HandleOptions,
		handler: Rpc.HandlerFn
	): void
}

export interface RpcClient {
	readonly clientId: string
	readonly groupId?: string

	call<T>(event: string, ...args: unknown[]): Promise<T>
	stream<T>(event: string, ...args: unknown[]): Rpc.StreamResult<T>
	onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn
}
