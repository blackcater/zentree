import type { IpcMain, WebContents, IpcMainEvent } from 'electron'

import { RpcError } from '../RpcError'
import type { RpcServer, RpcRouter, Rpc, HandleOptions } from '../types'

// 用于应用层注入 webContents 管理器
export interface WebContentsManager {
	send(clientId: string, channel: string, ...args: unknown[]): void
	getWebContents(clientId: string): WebContents | null
}

class ElectronRpcRouterImpl implements RpcRouter {
	constructor(
		private server: ElectronRpcServer,
		private prefix: string
	) {}

	handle(event: string, handler: Rpc.HandlerFn): void
	handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void
	handle(
		event: string,
		optionsOrHandler: HandleOptions | Rpc.HandlerFn,
		maybeHandler?: Rpc.HandlerFn
	): void {
		const fullPath = `${this.prefix}/${event}`
		if (typeof optionsOrHandler === 'function') {
			this.server.handle(fullPath, optionsOrHandler)
		} else {
			this.server.handle(fullPath, optionsOrHandler, maybeHandler!)
		}
	}

	router(namespace: string): RpcRouter {
		return new ElectronRpcRouterImpl(
			this.server,
			`${this.prefix}/${namespace}`
		)
	}
}

export class ElectronRpcServer implements RpcServer {
	private ipcMain: IpcMain
	private webContentsManager: WebContentsManager | null = null

	constructor(ipcMain: IpcMain) {
		this.ipcMain = ipcMain
	}

	// 设置 WebContents 管理器，用于 push 和事件发送
	setWebContentsManager(manager: WebContentsManager): void {
		this.webContentsManager = manager
	}

	handle(event: string, handler: Rpc.HandlerFn): void
	handle(event: string, options: HandleOptions, handler: Rpc.HandlerFn): void
	handle(
		event: string,
		optionsOrHandler: HandleOptions | Rpc.HandlerFn,
		maybeHandler?: Rpc.HandlerFn
	): void {
		const eventPath = this.normalizeEvent(event)
		const handlerFn =
			typeof optionsOrHandler === 'function'
				? optionsOrHandler
				: maybeHandler!

		// 监听 invoke:xxx 通道，接收客户端调用
		this.ipcMain.on(
			`rpc:invoke:${eventPath}`,
			async (
				e: IpcMainEvent,
				payload: { invokeId: string; args: unknown[] }
			) => {
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

	router(namespace: string): RpcRouter {
		const prefix = this.normalizeEvent(namespace)
		return new ElectronRpcRouterImpl(this, prefix)
	}

	push(event: string, target: Rpc.Target, ...args: unknown[]): void {
		if (!this.webContentsManager) {
			console.warn(
				'ElectronRpcServer: WebContentsManager not set, push() will not work'
			)
			return
		}

		const eventPath = this.normalizeEvent(event)

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

	private normalizeEvent(event: string): string {
		return event.replace(/\/+/g, '/').replace(/^\/|\/$/g, '')
	}
}
