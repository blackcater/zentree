import type { IpcRenderer } from 'electron'

import { RpcError, type IRpcErrorDefinition } from '../RpcError'
import type { Rpc, RpcClient } from '../types'

export class IpcRendererRpcClient implements RpcClient {
	readonly clientId: string
	readonly groupId?: string

	private readonly _ipcRenderer: IpcRenderer
	private readonly _pendingCalls = new Map<string, { resolve: Function; reject: Function }>()
	private readonly _eventListeners = new Map<string, Set<(...args: unknown[]) => void>>()
	private readonly _streamHandlers = new Map<string, { onChunk: Function; onDone: Function; cancel: Function }>()
	private _invokeCounter = 0

	constructor(ipcRenderer: IpcRenderer, groupId?: string) {
		this._ipcRenderer = ipcRenderer
		this.clientId = 'ipc-renderer-client'
		this.groupId = groupId

		// Listen for generic rpc:response channel
		// Server sends to this channel with full channel info in payload
		ipcRenderer.on('rpc:response', (...args: unknown[]) => {
			// args[0] is the event (unused), args[1] is the payload
			const payload = args[1] as { channel: string; result?: unknown; error?: IRpcErrorDefinition }
			if (!payload?.channel) return

			// Extract invokeId from channel like "rpc:response:invoke-1"
			const invokeId = payload.channel.split(':').slice(2).join(':')
			const pending = this._pendingCalls.get(invokeId)
			if (pending) {
				if (payload.error) {
					pending.reject(RpcError.fromJSON(payload.error))
				} else {
					pending.resolve(payload.result)
				}
				this._pendingCalls.delete(invokeId)
			}
		})

		// Listen for generic rpc:event channel
		ipcRenderer.on('rpc:event', (...args: unknown[]) => {
			const payload = args[1] as { channel: string; data?: unknown[] }
			if (!payload?.channel) return
			// channel format: "rpc:event:eventName"
			const eventName = payload.channel.split(':').slice(2).join(':')
			const listeners = this._eventListeners.get(eventName)
			if (listeners) {
				for (const listener of listeners) {
					listener(...(payload.data || []))
				}
			}
		})

		// Listen for generic rpc:stream channel
		ipcRenderer.on('rpc:stream', (...args: unknown[]) => {
			const payload = args[1] as { channel: string; chunk?: unknown; done?: boolean }
			if (!payload?.channel) return
			// channel format: "rpc:stream:eventPath:invokeId"
			const parts = payload.channel.split(':')
			const invokeId = parts.at(-1)!
			const handler = this._streamHandlers.get(invokeId)
			if (handler) {
				if (payload.done) {
					handler.onDone()
				} else {
					handler.onChunk(payload.chunk)
				}
			}
		})
	}

	async call<T>(event: string, options: Rpc.CallOptions = {}, ...args: unknown[]): Promise<T> {
		const { signal } = options
		const invokeId = `invoke-${++this._invokeCounter}`
		const eventPath = event.replaceAll(/^\/|\/$/g, '')

		return new Promise((resolve, reject) => {
			if (signal?.aborted) {
				reject(new RpcError(RpcError.ABORTED, 'Request was aborted'))
				return
			}

			const abortHandler = () => {
				this._pendingCalls.delete(invokeId)
				if (signal?.reason?.name === 'TimeoutError') {
					reject(new RpcError(RpcError.TIMEOUT, `RPC call ${event} timed out`))
				} else {
					reject(new RpcError(RpcError.ABORTED, 'Request was aborted'))
				}
			}

			signal?.addEventListener('abort', abortHandler)

			this._pendingCalls.set(invokeId, {
				resolve: (...resolveArgs: unknown[]) => {
					signal?.removeEventListener('abort', abortHandler)
					resolve(resolveArgs[0] as T)
				},
				reject: (...rejectArgs: unknown[]) => {
					signal?.removeEventListener('abort', abortHandler)
					reject(rejectArgs[0])
				},
			})

			this._ipcRenderer.send(`rpc:invoke:${eventPath}`, { invokeId, args })
		})
	}

	stream<T>(event: string, _options: Rpc.CallOptions = {}, ...args: unknown[]): Rpc.StreamResult<T> {
		const invokeId = `invoke-${++this._invokeCounter}`
		const eventPath = event.replaceAll(/^\/|\/$/g, '')
		const chunks: T[] = []

		const cancelStream = () => {
			this._ipcRenderer.send(`rpc:cancel:${eventPath}:${invokeId}`)
		}

		this._streamHandlers.set(invokeId, {
			onChunk: (chunk: unknown) => {
				chunks.push(chunk as T)
			},
			onDone: () => {
				this._streamHandlers.delete(invokeId)
			},
			cancel: cancelStream,
		})

		this._ipcRenderer.send(`rpc:invoke:${eventPath}`, { invokeId, args })

		const iterator: AsyncIterator<T> = {
			next: async () => {
				if (chunks.length > 0) {
					return { done: false, value: chunks.shift()! }
				}
				await new Promise<void>((resolve) => {
					const check = () => {
						if (chunks.length > 0) {
							resolve()
						} else if (this._streamHandlers.has(invokeId)) {
							setTimeout(check, 10)
						} else {
							resolve()
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
				const handler = this._streamHandlers.get(invokeId)
				if (handler?.cancel) {
					handler.cancel()
				}
				this._streamHandlers.delete(invokeId)
			},
		}
	}

	onEvent(event: string, listener: (...args: unknown[]) => void): Rpc.CancelFn {
		if (!this._eventListeners.has(event)) {
			this._eventListeners.set(event, new Set())
		}
		this._eventListeners.get(event)!.add(listener)

		return () => {
			const listeners = this._eventListeners.get(event)
			if (listeners) {
				listeners.delete(listener)
				if (listeners.size === 0) {
					this._eventListeners.delete(event)
				}
			}
		}
	}
}
