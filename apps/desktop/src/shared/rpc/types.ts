import type { BrowserWindow, WebContents } from 'electron'

import type { StandardSchemaV1 } from '@standard-schema/spec'

export namespace Rpc {
	export type HandlerFn<T = any> = (
		...args: any[]
	) => T | Promise<T> | AsyncIterator<T>

	export interface HandleOptions {
		schema?: StandardSchemaV1
	}

	export type CancelFn = () => void

	export type Target =
		| { type: 'broadcast' }
		| { type: 'group'; groupId: string }
		| { type: 'client'; clientId: string }

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

	push(event: string, target: Rpc.Target, ...args: any[]): void
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

	call<T>(event: string, ...args: any[]): Promise<T>
	stream<T>(event: string, ...args: any[]): Rpc.StreamResult<T>
	onEvent(event: string, listener: (...args: any[]) => void): Rpc.CancelFn
}

export interface IWindowRegistry {
	registerWindow(window: BrowserWindow, group?: string): string
	unregisterWindow(window: BrowserWindow): void

	joinGroup(clientId: string, groupId: string): void
	leaveGroup(clientId: string, groupId: string): void

	sendToClient(clientId: string, channel: string, ...args: any[]): void
	sendToGroup(groupId: string, channel: string, ...args: any[]): void
	sendToAll(channel: string, ...args: any[]): void

	getWebContentsByClientId(clientId: string): WebContents | null
	getClientIdByWebContents(webContents: WebContents): string | null
	getGroupsByClientId(clientId: string): string[]
}

/**
 * Extracts method names from Handler where return type is T | Promise<T> (not AsyncIterator).
 */
export type CallMethodNames<Handler extends object> = {
	[K in keyof Handler]: Handler[K] extends (...args: any) => infer R
		? R extends AsyncIterator<unknown, unknown, unknown>
			? never
			: K
		: never
}[keyof Handler]

/**
 * Extracts method names from Handler where return type is AsyncIterator<T>.
 */
export type StreamMethodNames<Handler extends object> = {
	[K in keyof Handler]: Handler[K] extends (
		...args: any
	) => AsyncIterator<unknown, unknown, unknown>
		? K
		: never
}[keyof Handler]
