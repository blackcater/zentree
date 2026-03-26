import type { Context, Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import type { SSEStreamingApi } from 'hono/streaming'

import { RpcError } from '../RpcError'
import type { RpcServer, RpcRouter, Rpc } from '../types'
import { HttpRpcRouter } from './HttpRpcRouter'

interface RegisteredHandler {
	handler: Rpc.HandlerFn
	options?: Rpc.HandleOptions
}

export class HttpRpcServer implements RpcServer {
	private readonly _handlers = new Map<string, RegisteredHandler>()
	private readonly _sseClients = new Map<string, Set<{ stream: SSEStreamingApi; clientId: string }>>()

	constructor(private readonly app: Hono) {
		this._setupRoutes()
		this._setupSSERoutes()
	}

	private async _handleRPC(path: string, args: unknown[], ctx: Rpc.RequestContext) {
		const handler = this._handlers.get(path)

		if (!handler) {
			throw new RpcError('NOT_FOUND', `Handler not found: ${path}`)
		}

		// Schema validation
		if (handler.options?.schema) {
			const schema = handler.options.schema
			const result = await schema['~standard'].validate(args)

			if ('issues' in result) {
				throw new RpcError('INVALID_PARAMS', 'Schema validation failed', result.issues)
			}

			// result.value is the standardized output, use it directly as args
			return handler.handler(ctx, ...(Array.isArray(result.value) ? result.value : [result.value]))
		}

		return handler.handler(ctx, ...args)
	}

	private _setupRoutes() {
		// POST /rpc/** - RPC invocation (wildcard catches all paths under /rpc/)
		this.app.post('/rpc/**', async (c: Context) => {
			const fullPath = c.req.path
			const rpcIndex = fullPath.indexOf('/rpc/')
			const path = rpcIndex >= 0 ? fullPath.slice(rpcIndex + 5) : fullPath
			const args = await c.req.json().catch(() => [])

			const ctx: Rpc.RequestContext = {
				clientId: this._getClientId(c),
			}

			try {
				const result = await this._handleRPC(path, args, ctx)

				// Handle async iterator (streaming)
				if (result && typeof result === 'object' && Symbol.asyncIterator in result) {
					const chunks: unknown[] = []
					for await (const chunk of result as unknown as AsyncIterable<unknown>) {
						chunks.push(chunk)
					}
					return c.json({ result: chunks })
				}

				return c.json({ result })
			} catch (err) {
				const rpcError = RpcError.from(err)
				return c.json({ error: rpcError.toJSON() }, rpcError.code === 'NOT_FOUND' ? 404 : 500)
			}
		})
	}

	private _setupSSERoutes() {
		// GET /rpc/events - SSE event stream
		this.app.get('/rpc/events', (c: Context) => {
			const clientId = this._getClientId(c)

			return streamSSE(c, async (stream) => {
				const controller = { stream, clientId }
				if (!this._sseClients.has(clientId)) {
					this._sseClients.set(clientId, new Set())
				}
				this._sseClients.get(clientId)!.add(controller)

				await stream.writeSSE({ event: 'connected', data: JSON.stringify({ clientId }) })

				stream.onAbort(() => {
					this._sseClients.get(clientId)?.delete(controller)
					if (this._sseClients.get(clientId)?.size === 0) {
						this._sseClients.delete(clientId)
					}
				})
			})
		})
	}

	router(namespace: string): RpcRouter {
		const prefix = this._normalizeEvent(namespace)
		return new HttpRpcRouter(this, prefix)
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
		if (typeof optionsOrHandler === 'function') {
			this._handlers.set(eventPath, { handler: optionsOrHandler })
		} else {
			this._handlers.set(eventPath, {
				handler: maybeHandler!,
				options: optionsOrHandler,
			})
		}
	}

	push(event: string, target: Rpc.Target, ...args: unknown[]): void {
		const eventData = JSON.stringify({ event, args })

		if (target.type === 'broadcast') {
			this._broadcastSSE('push', eventData)
		} else if (target.type === 'client' && target.clientId) {
			this._sendSSEToClient(target.clientId, 'push', eventData)
		} else if (target.type === 'group' && target.groupId) {
			this._sendSSEToGroup(target.groupId, 'push', eventData)
		}
	}

	private _broadcastSSE(event: string, data: string) {
		for (const [, controllers] of this._sseClients) {
			for (const controller of controllers) {
				controller.stream.writeSSE({ event, data })
			}
		}
	}

	private _sendSSEToClient(clientId: string, event: string, data: string) {
		const controllers = this._sseClients.get(clientId)
		if (controllers) {
			for (const controller of controllers) {
				controller.stream.writeSSE({ event, data })
			}
		}
	}

	private _sendSSEToGroup(_groupId: string, event: string, data: string) {
		// HTTP has no group concept, broadcast directly
		this._broadcastSSE(event, data)
	}

	private _getClientId(c: Context): string {
		return c.req.header('x-rpc-client-id') || 'anonymous'
	}

	private _normalizeEvent(event: string): string {
		return event.replaceAll(/\/+/g, '/').replaceAll(/^\/|\/$/g, '')
	}
}
