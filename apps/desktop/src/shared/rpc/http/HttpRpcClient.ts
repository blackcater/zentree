import { RpcError } from '../RpcError'
import type { RpcClient, RpcRequest, RpcResponse } from '../types'

interface ClientOptions {
	url: string
	groupId: string
}

export class HttpRpcClient implements RpcClient {
	readonly groupId: string
	private readonly baseUrl: string
	private eventSource: EventSource | null = null
	private eventListeners = new Set<
		(event: string, ...args: unknown[]) => void
	>()

	constructor(options: ClientOptions) {
		this.groupId = options.groupId
		this.baseUrl = options.url
	}

	async call(method: string, args: unknown): Promise<unknown> {
		const id = crypto.randomUUID()
		const request: RpcRequest = { id, method, args }

		const response = await fetch(`${this.baseUrl}/rpc`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
		})

		const data: RpcResponse = await response.json()

		if (data.error) {
			throw new RpcError(
				data.error.code,
				data.error.message,
				data.error.data
			)
		}

		return data.result
	}

	stream(
		_method: string,
		_args: unknown
	): AsyncIterator<unknown, unknown, unknown> {
		// For streaming, we use SSE connection
		// This is a simplified implementation that returns an empty iterator
		const chunks = {
			[Symbol.asyncIterator]() {
				return {
					async next(): Promise<{ value: unknown; done: boolean }> {
						return { value: undefined, done: true }
					},
				}
			},
		}

		return chunks[Symbol.asyncIterator]() as AsyncIterator<
			unknown,
			unknown,
			unknown
		>
	}

	onEvent(listener: (event: string, ...args: unknown[]) => void): void {
		this.eventListeners.add(listener)

		if (!this.eventSource) {
			this.eventSource = new EventSource(
				`${this.baseUrl}/rpc/events?groupId=${encodeURIComponent(this.groupId)}`
			)

			this.eventSource.onmessage = (event) => {
				const data = JSON.parse(event.data)
				this.eventListeners.forEach((l) => l(data.event, ...data.args))
			}
		}
	}

	[Symbol.dispose](): void {
		this.eventSource?.close()
		this.eventSource = null
	}
}
