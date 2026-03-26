import { ElectronRpcServer } from '../../shared/rpc'
import type { Rpc, WindowRegistry } from '../../shared/rpc'
import { WindowManager } from './WindowManager'

export class RpcDebugService {
	constructor(
		private readonly server: ElectronRpcServer,
		private readonly registry: WindowRegistry,
		private readonly windowManager: WindowManager
	) {
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

		// Slow echo - waits 3 seconds then returns
		router.handle('slow-echo', (async (_, text: string) => {
			// Wait 3 seconds
			await new Promise((resolve) => setTimeout(resolve, 3000))

			return { text, completed: true }
		}) as Rpc.HandlerFn)

		// window/create - create a new BrowserWindow
		router.handle('window/create', ((_ctx, groupId: string | null) => {
			const { window, clientId } = this.windowManager.createDebugWindow(
				groupId ?? undefined
			)
			this.registry.registerWindow(window, groupId ?? undefined)
			return { clientId, windowId: window.id }
		}) as Rpc.HandlerFn)

		// window/info - return current window's clientId and groups
		router.handle('window/info', ((ctx) => {
			const groups = this.registry.getGroupsByClientId(ctx.clientId)
			return { clientId: ctx.clientId, groupId: groups[0] ?? null }
		}) as Rpc.HandlerFn)

		// push/send-to-all - broadcast to all windows
		router.handle('push/send-to-all', ((
			ctx,
			eventName: string,
			...args: unknown[]
		) => {
			this.server.push(
				eventName,
				{ type: 'broadcast' },
				ctx.clientId,
				eventName,
				args
			)
			return { ok: true }
		}) as Rpc.HandlerFn)

		// push/send-to-group - send to specific group
		router.handle('push/send-to-group', ((
			ctx,
			groupId: string,
			eventName: string,
			...args: unknown[]
		) => {
			this.server.push(
				eventName,
				{ type: 'group', groupId },
				ctx.clientId,
				eventName,
				args
			)
			return { ok: true }
		}) as Rpc.HandlerFn)

		// push/send-to-client - send to specific clientId
		router.handle('push/send-to-client', ((
			ctx,
			clientId: string,
			eventName: string,
			...args: unknown[]
		) => {
			this.server.push(
				eventName,
				{ type: 'client', clientId },
				ctx.clientId,
				eventName,
				args
			)
			return { ok: true }
		}) as Rpc.HandlerFn)
	}
}
