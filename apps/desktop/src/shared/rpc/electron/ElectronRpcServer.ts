import type { IpcMain, WebContents } from 'electron'

import { RpcError } from '../RpcError'
import type { RpcServer, RpcRouter, Rpc } from '../types'
import { ElectronRpcRouter } from './ElectronRpcRouter'

// Injected by app layer to manage webContents
export interface WebContentsManager {
	send(clientId: string, channel: string, ...args: unknown[]): void
	getWebContents(clientId: string): WebContents | null
}

export class ElectronRpcServer implements RpcServer {
	constructor(
		private readonly ipcMain: IpcMain,
		private readonly webContentsManager: WebContentsManager
	) {}

	router(namespace: string): RpcRouter {
		const prefix = this._normalizeEvent(namespace)
		return new ElectronRpcRouter(this, prefix)
	}

	handle(event: string, handler: Rpc.HandlerFn): void
	handle(
		event: string,
		options: Rpc.HandleOptions,
		handler: Rpc.HandlerFn
	): void
	handle(
		event: string,
		optionsOrHandler: Rpc.HandleOptions | Rpc.HandlerFn,
		maybeHandler?: Rpc.HandlerFn
	): void {
		const eventPath = this._normalizeEvent(event)
		const handlerFn =
			typeof optionsOrHandler === 'function'
				? optionsOrHandler
				: maybeHandler!

		// Listen on invoke:xxx channel for client calls
		this.ipcMain.on(
			`rpc:invoke:${eventPath}`,
			async (e, payload: { invokeId: string; args: unknown[] }) => {
				const { invokeId, args } = payload
				const clientId = `client-${e.sender.id}`

				try {
					const result = await handlerFn({ clientId }, ...args)

					// Handle async iterator (streaming)
					if (result && typeof result === 'object') {
						const asyncIterator = (result as any)[
							Symbol.asyncIterator
						]
						if (typeof asyncIterator === 'function') {
							const iterator = asyncIterator.call(result)
							let cancel = false

							// Store cancel function on the event for abort
							;(e as any)._rpcCancel = () => {
								cancel = true
							}

							for await (const chunk of iterator) {
								if (cancel) break
								// Send streaming chunk back
								e.sender.send(
									`rpc:stream:${eventPath}:${invokeId}`,
									{ chunk, done: false }
								)
							}

							// Streaming completion - no separate rpc:response needed
							e.sender.send(
								`rpc:stream:${eventPath}:${invokeId}`,
								{ chunk: null, done: true }
							)
							return
						}
					}

					e.sender.send(`rpc:response:${invokeId}`, { result })
				} catch (err) {
					const rpcError = RpcError.from(err)
					e.sender.send(`rpc:response:${invokeId}`, {
						error: rpcError.toJSON(),
					})
				}
			}
		)
	}

	push(event: string, target: Rpc.Target, ...args: unknown[]): void {
		const eventPath = this._normalizeEvent(event)

		if (target.type === 'broadcast') {
			this.webContentsManager.send('*', `rpc:event:${eventPath}`, ...args)
		} else if (target.type === 'client' && target.clientId) {
			this.webContentsManager.send(
				target.clientId,
				`rpc:event:${eventPath}`,
				...args
			)
		} else if (target.type === 'group' && target.groupId) {
			this.webContentsManager.send(
				`group:${target.groupId}`,
				`rpc:event:${eventPath}`,
				...args
			)
		}
	}

	private _normalizeEvent(event: string): string {
		return event.replaceAll(/\/+/g, '/').replaceAll(/^\/|\/$/g, '')
	}
}
