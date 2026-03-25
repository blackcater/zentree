import type { WebContents } from 'electron'

import { RpcError, type IRpcErrorDefinition } from '../RpcError'
import type { RpcClient, Rpc } from '../types'

export class ElectronRpcClient implements RpcClient {
	readonly clientId: string
	readonly groupId?: string

	private webContents: WebContents
	private pendingCalls = new Map<
		string,
		{ resolve: Function; reject: Function }
	>()
	private eventListeners = new Map<
		string,
		Set<(...args: unknown[]) => void>
	>()
	private streamHandlers = new Map<
		string,
		{ onChunk: Function; onDone: Function; cancel: Function }
	>()
	private invokeCounter = 0

	constructor(webContents: WebContents, groupId?: string) {
		this.webContents = webContents
		this.clientId = `client-${webContents.id}`
		if (groupId !== undefined) {
			this.groupId = groupId
		}

		// Listen for RPC responses
		webContents.on(
			'ipc-message' as any,
			((channel: string, ...args: unknown[]) => {
				if (channel.startsWith('rpc:response:')) {
					const invokeId = channel.replace('rpc:response:', '')
					const pending = this.pendingCalls.get(invokeId)
					if (pending) {
						const payload = args[0] as {
							result?: unknown
							error?: IRpcErrorDefinition
						}
						if (payload.error) {
							pending.reject(RpcError.fromJSON(payload.error))
						} else {
							pending.resolve(payload.result)
						}
						this.pendingCalls.delete(invokeId)
					}
				} else if (channel.startsWith('rpc:event:')) {
					const eventName = channel.replace('rpc:event:', '')
					const listeners = this.eventListeners.get(eventName)
					if (listeners) {
						for (const listener of listeners) {
							listener(...args)
						}
					}
				} else if (channel.startsWith('rpc:stream:')) {
					// Format: rpc:stream:eventPath:invokeId
					const parts = channel.split(':')
					const invokeId = parts[parts.length - 1]
					const payload = args[0] as { chunk: unknown; done: boolean }
					const handler = this.streamHandlers.get(invokeId)
					if (handler) {
						if (payload.done) {
							handler.onDone()
						} else {
							handler.onChunk(payload.chunk)
						}
					}
				}
			}) as any
		)
	}

	async call<T>(event: string, ...args: unknown[]): Promise<T> {
		const invokeId = `invoke-${++this.invokeCounter}`
		const eventPath = event.replace(/^\/|\/$/g, '')

		return new Promise((resolve, reject) => {
			this.pendingCalls.set(invokeId, { resolve, reject })

			// Send invoke message: rpc:invoke:eventPath with { invokeId, args }
			this.webContents.send(`rpc:invoke:${eventPath}`, { invokeId, args })

			// Timeout: 30 seconds default
			setTimeout(() => {
				if (this.pendingCalls.has(invokeId)) {
					this.pendingCalls.delete(invokeId)
					reject(
						new RpcError(
							RpcError.TIMEOUT,
							`RPC call ${event} timed out`
						)
					)
				}
			}, 30000)
		})
	}

	stream<T>(event: string, ...args: unknown[]): Rpc.StreamResult<T> {
		const invokeId = `invoke-${++this.invokeCounter}`
		const eventPath = event.replace(/^\/|\/$/g, '')
		const chunks: T[] = []

		// Send cancel message to server
		const cancelStream = () => {
			this.webContents.send(`rpc:cancel:${eventPath}:${invokeId}`)
		}

		// Set up stream handlers before sending
		this.streamHandlers.set(invokeId, {
			onChunk: (chunk: unknown) => {
				chunks.push(chunk as T)
			},
			onDone: () => {
				this.streamHandlers.delete(invokeId)
			},
			cancel: cancelStream,
		})

		// Send invoke message
		this.webContents.send(`rpc:invoke:${eventPath}`, { invokeId, args })

		const iterator: AsyncIterator<T> = {
			next: async () => {
				if (chunks.length > 0) {
					return { done: false, value: chunks.shift()! }
				}
				// Wait for more chunks
				await new Promise<void>((resolve) => {
					const check = () => {
						if (chunks.length > 0) {
							resolve()
						} else if (!this.streamHandlers.has(invokeId)) {
							resolve() // Stream ended
						} else {
							setTimeout(check, 10)
						}
					}
					check()
				})
				if (chunks.length > 0) {
					return { done: false, value: chunks.shift()! }
				}
				return { done: true, value: undefined }
			},
		}

		return {
			[Symbol.asyncIterator]: () => iterator,
			cancel: () => {
				const handler = this.streamHandlers.get(invokeId)
				if (handler?.cancel) {
					handler.cancel()
				}
				this.streamHandlers.delete(invokeId)
			},
		}
	}

	onEvent(
		event: string,
		listener: (...args: unknown[]) => void
	): Rpc.CancelFn {
		const channel = `rpc:event:${event}`

		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set())
			this.webContents.on(
				channel as any,
				((...listenerArgs: unknown[]) => {
					const listeners = this.eventListeners.get(event)
					if (listeners) {
						for (const l of listeners) {
							l(...listenerArgs)
						}
					}
				}) as any
			)
		}

		this.eventListeners.get(event)!.add(listener)

		return () => {
			const listeners = this.eventListeners.get(event)
			if (listeners) {
				listeners.delete(listener)
			}
		}
	}
}
