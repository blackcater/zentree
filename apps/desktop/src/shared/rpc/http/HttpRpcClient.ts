import { RpcError, type IRpcErrorDefinition } from '../RpcError'
import type { RpcClient, Rpc } from '../types'

export class HttpRpcClient implements RpcClient {
	readonly clientId: string
	readonly groupId?: string

	private baseUrl: string

	constructor(baseUrl: string, clientId?: string, groupId?: string) {
		this.baseUrl = baseUrl.replace(/\/$/, '')
		this.clientId = clientId || `http-client-${Date.now()}`
		if (groupId !== undefined) {
			this.groupId = groupId
		}
	}

	async call<T>(event: string, ...args: unknown[]): Promise<T> {
		const normalizedEvent = event.replace(/^\/|\/$/g, '')

		const response = await fetch(`${this.baseUrl}/rpc/${normalizedEvent}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-rpc-client-id': this.clientId,
				...(this.groupId && { 'x-rpc-group-id': this.groupId }),
			},
			body: JSON.stringify(args),
		})

		if (!response.ok) {
			throw new RpcError(
				'HTTP_ERROR',
				`HTTP ${response.status}: ${response.statusText}`
			)
		}

		const payload = await response.json()

		if (payload.error) {
			throw RpcError.fromJSON(payload.error as IRpcErrorDefinition)
		}

		return payload.result as T
	}

	stream<T>(_event: string, ..._args: unknown[]): Rpc.StreamResult<T> {
		// HTTP streaming deferred - would use fetch with ReadableStream
		// For now, return an empty async iterator
		const chunks: T[] = []

		const iterator: AsyncIterator<T> = {
			next: async () => {
				if (chunks.length > 0) {
					return { done: false, value: chunks.shift()! }
				}
				return { done: true, value: undefined }
			},
		}

		return {
			[Symbol.asyncIterator]: () => iterator,
			cancel: () => {
				// Cancel pending stream
			},
		}
	}

	onEvent(
		_event: string,
		_listener: (...args: unknown[]) => void
	): Rpc.CancelFn {
		// HTTP long-polling or SSE for events - deferred
		return () => {}
	}
}
