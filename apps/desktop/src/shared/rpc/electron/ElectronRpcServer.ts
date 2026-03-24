import type { IpcMainEvent } from 'electron'

import { RpcError } from '../RpcError'
import type {
	RpcTarget,
	RpcResponse,
	RpcStreamChunk,
	RpcServer,
	RpcClient,
} from '../types'

type Handler = (
	args: unknown
) => unknown | AsyncIterator<unknown, unknown, unknown>

interface IpcMainLike {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	on(channel: string, listener: (...args: any[]) => void): void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	off(channel: string, listener: (...args: any[]) => void): void
}

async function getIpcMain(): Promise<IpcMainLike | undefined> {
	try {
		const electron = await import('electron')
		return electron.ipcMain
	} catch {
		return undefined
	}
}

export class ElectronRpcServer implements RpcServer {
	private handlers = new Map<string, Handler>()
	private clients = new Set<RpcClient>()
	private eventListeners = new Set<
		(client: RpcClient, event: string, ...args: unknown[]) => void
	>()
	private ipcMain: IpcMainLike | undefined

	constructor(ipcMainLike?: IpcMainLike) {
		this.ipcMain = ipcMainLike

		if (this.ipcMain) {
			// Listen for incoming calls from clients
			this.ipcMain.on('rpc:call', this.handleCall.bind(this))

			// Listen for client events (notifications)
			this.ipcMain.on('rpc:event', this.handleClientEvent.bind(this))
		}
	}

	async initialize(): Promise<void> {
		if (!this.ipcMain) {
			this.ipcMain = await getIpcMain()
		}

		if (this.ipcMain) {
			// Listen for incoming calls from clients
			this.ipcMain.on('rpc:call', this.handleCall.bind(this))

			// Listen for client events (notifications)
			this.ipcMain.on('rpc:event', this.handleClientEvent.bind(this))
		}
	}

	handle(event: string, handler: Handler): void {
		this.handlers.set(event, handler)
	}

	push(event: string, target: RpcTarget, ...args: unknown[]): void {
		if (target.type === 'broadcast') {
			// Send to all clients
			this.clients.forEach((client) => {
				client.send?.('rpc:push', event, ...args)
			})
		} else if (target.type === 'group') {
			// Send to clients in the same group
			this.clients.forEach((client) => {
				if (client.groupId === target.groupId) {
					client.send?.('rpc:push', event, ...args)
				}
			})
		}
	}

	onEvent(
		listener: (client: RpcClient, event: string, ...args: unknown[]) => void
	): void {
		this.eventListeners.add(listener)
	}

	/** @internal */
	registerClient(client: RpcClient): void {
		this.clients.add(client)
	}

	/** @internal */
	unregisterClient(client: RpcClient): void {
		this.clients.delete(client)
	}

	private async handleCall(
		event: { reply: (channel: string, response: RpcResponse) => void },
		id: string,
		method: string,
		args: unknown
	): Promise<void> {
		const handler = this.handlers.get(method)

		if (!handler) {
			const rpcError = new RpcError(
				'NOT_FOUND',
				`Method ${method} not found`
			)
			const response: RpcResponse = {
				id,
				error: rpcError,
			}
			event.reply('rpc:response', response)
			return
		}

		try {
			const result = await handler(args)

			// Check if result is an AsyncIterator (streaming)
			if (
				result &&
				typeof result === 'object' &&
				typeof (
					result as unknown as { [Symbol.asyncIterator]: unknown }
				)[Symbol.asyncIterator] === 'function'
			) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const iterator = result as any
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				for await (const chunk of iterator) {
					const chunkMessage: RpcStreamChunk = {
						id,
						chunk,
						done: false,
					}
					event.reply('rpc:stream', chunkMessage)
				}
				const doneMessage: RpcStreamChunk = {
					id,
					chunk: null,
					done: true,
				}
				event.reply('rpc:stream', doneMessage)
			} else {
				const response: RpcResponse = { id, result }
				event.reply('rpc:response', response)
			}
		} catch (err) {
			const error = RpcError.from(err)
			const response: RpcResponse = { id, error }
			event.reply('rpc:response', response)
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private handleClientEvent(
		_event: IpcMainEvent,
		event: string,
		...args: any[]
	): void {
		// Find the client that sent this event
		// Note: In real implementation, we'd need to track which ipcConnection belongs to which client
		this.eventListeners.forEach((listener) => {
			// We don't have the actual client reference here
			// This is a limitation of the Electron IPC model
			listener(null as unknown as RpcClient, event, ...args)
		})
	}

	[Symbol.dispose](): void {
		if (this.ipcMain) {
			this.ipcMain.off('rpc:call', this.handleCall)
			this.ipcMain.off('rpc:event', this.handleClientEvent)
		}
	}
}
