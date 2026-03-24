import { RpcError } from '../RpcError'
import type { RpcClient, RpcResponse, RpcStreamChunk } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpcListener = (...args: any[]) => void

interface IpcRendererLike {
	send(channel: string, ...args: unknown[]): void
	on(channel: string, listener: IpcListener): void
	off(channel: string, listener: IpcListener): void
}

interface ClientOptions {
	groupId: string
	ipcRenderer?: IpcRendererLike
}

export class ElectronRpcClient implements RpcClient {
	readonly groupId: string

	private pendingCalls = new Map<
		string,
		{
			resolve: (value: unknown) => void
			reject: (error: Error) => void
		}
	>()
	private eventListeners = new Set<
		(event: string, ...args: unknown[]) => void
	>()
	private streamListeners = new Map<string, (chunk: unknown) => void>()
	private ipc: IpcRendererLike

	constructor(options: ClientOptions) {
		this.groupId = options.groupId
		this.ipc = options.ipcRenderer ?? this.getIpcRenderer()

		// Listen for responses
		this.ipc.on('rpc:response', this.handleResponse.bind(this))

		// Listen for push events from server
		this.ipc.on('rpc:push', this.handlePush.bind(this))

		// Listen for stream chunks
		this.ipc.on('rpc:stream', this.handleStream.bind(this))
	}

	private getIpcRenderer(): IpcRendererLike {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { ipcRenderer } = require('electron')
		return ipcRenderer
	}

	async call(method: string, args: unknown): Promise<unknown> {
		const id = crypto.randomUUID()

		return new Promise((resolve, reject) => {
			this.pendingCalls.set(id, { resolve, reject })

			this.ipc.send('rpc:call', id, method, args)
		})
	}

	stream(method: string, args: unknown): AsyncIterator<unknown> {
		const id = crypto.randomUUID()

		// Return an async iterator that waits for chunks
		const iterator = {
			async next(): Promise<{ value: unknown; done: boolean }> {
				// This is a simplified implementation
				// Real implementation would need proper async iteration support
				return { value: undefined, done: true }
			},
		}

		this.ipc.send('rpc:call', id, method, args)

		return iterator
	}

	onEvent(listener: (event: string, ...args: unknown[]) => void): void {
		this.eventListeners.add(listener)
	}

	send(event: string, ...args: unknown[]): void {
		this.ipc.send('rpc:push', event, ...args)
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private handleResponse(_event: any, response: RpcResponse): void {
		const pending = this.pendingCalls.get(response.id)
		if (!pending) return

		this.pendingCalls.delete(response.id)

		if (response.error) {
			pending.reject(
				new RpcError(
					response.error.code,
					response.error.message,
					response.error.data
				)
			)
		} else {
			pending.resolve(response.result)
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private handlePush(
		_event: any,
		data: { event: string; args: unknown[] }
	): void {
		this.eventListeners.forEach((listener) => {
			listener(data.event, ...data.args)
		})
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private handleStream(_event: any, data: RpcStreamChunk): void {
		const listener = this.streamListeners.get(data.id)
		if (listener && !data.done) {
			listener(data.chunk)
		}
	}

	[Symbol.dispose](): void {
		this.ipc.off('rpc:response', this.handleResponse)
		this.ipc.off('rpc:push', this.handlePush)
		this.ipc.off('rpc:stream', this.handleStream)
	}
}
