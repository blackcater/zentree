import { ElectronRpcServer, RpcError } from '../../shared/rpc'
import type { Rpc } from '../../shared/rpc'

export class RpcDebugService {
	constructor(private readonly server: ElectronRpcServer) {
		this.registerHandlers()
	}

	private registerHandlers() {
		const router = this.server.router('debug')

		// Basic call - echo back the input
		router.handle('echo', ((_, text: string) => text) as Rpc.HandlerFn)

		// Basic call - add two numbers
		router.handle(
			'add',
			((_, a: number, b: number) => a + b) as Rpc.HandlerFn
		)

		// Stream - yield numbers 1 to 5
		router.handle('stream-numbers', async function* () {
			for (let i = 1; i <= 5; i++) {
				await new Promise((r) => setTimeout(r, 200))
				yield i
			}
		} as Rpc.HandlerFn)

		// Context - return server time and clientId
		router.handle('server-time', ((ctx) => ({
			clientId: ctx.clientId,
			time: new Date().toISOString(),
		})) as Rpc.HandlerFn)

		// Push - trigger an event to the calling client
		router.handle('trigger-event', ((ctx, eventName: string) => {
			this.server.push(
				eventName,
				{ type: 'client', clientId: ctx.clientId },
				'Hello from server!'
			)
			return { triggered: true }
		}) as Rpc.HandlerFn)

		// AbortSignal test - slow response that respects timeout
		router.handle('slow-echo', (async (
			_,
			text: string,
			options: Rpc.CallOptions
		) => {
			const { signal } = options

			if (signal?.aborted) {
				throw new RpcError(
					RpcError.ABORTED,
					'Request was aborted before starting'
				)
			}

			// Wait 3 seconds (will be interrupted if signal aborts)
			await new Promise((resolve) => setTimeout(resolve, 3000))

			// Check if aborted during wait
			if (signal?.aborted) {
				throw new RpcError(
					RpcError.ABORTED,
					'Request was aborted during wait'
				)
			}

			return { text, completed: true }
		}) as Rpc.HandlerFn)
	}
}
