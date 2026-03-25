import type { Context, Hono } from 'hono'

import { RpcError } from '../RpcError'
import type { RpcServer, RpcRouter, Rpc } from '../types'
import { HttpRpcRouter } from './HttpRpcRouter'

interface RegisteredHandler {
	handler: Rpc.HandlerFn
	options?: Rpc.HandleOptions
}

export class HttpRpcServer implements RpcServer {
	private readonly handlers = new Map<string, RegisteredHandler>()

	constructor(private readonly app: Hono) {
		this._setupRoutes()
	}

	private _setupRoutes() {
		// POST /rpc/** - RPC invocation (wildcard catches all paths under /rpc/)
		this.app.post('/rpc/**', async (c: Context) => {
			// Extract path after /rpc/ using the full path
			const fullPath = c.req.path
			const rpcIndex = fullPath.indexOf('/rpc/')
			const path = rpcIndex >= 0 ? fullPath.slice(rpcIndex + 5) : fullPath
			const args = await c.req.json().catch(() => [])

			const handler = this.handlers.get(path)
			if (!handler) {
				return c.json(
					{
						error: {
							code: 'NOT_FOUND',
							message: `Handler not found: ${path}`,
						},
					},
					404
				)
			}

			const ctx: Rpc.RequestContext = {
				clientId: this._getClientId(c),
			}

			try {
				const result = await handler.handler(ctx, ...args)

				// Handle async iterator (streaming) - collect all chunks
				if (
					result &&
					typeof result === 'object' &&
					Symbol.asyncIterator in result
				) {
					const chunks: unknown[] = []
					for await (const chunk of result as unknown as AsyncIterable<unknown>) {
						chunks.push(chunk)
					}
					return c.json(chunks)
				}

				return c.json(result)
			} catch (err) {
				const rpcError = RpcError.from(err)
				return c.json(rpcError.toJSON(), 500)
			}
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
			this.handlers.set(eventPath, { handler: optionsOrHandler })
		} else {
			this.handlers.set(eventPath, {
				handler: maybeHandler!,
				options: optionsOrHandler,
			})
		}
	}

	push(_event: string, _target: Rpc.Target, ..._args: unknown[]): void {
		// HTTP push is deferred - would require SSE or WebSocket
		console.warn('HttpRpcServer: push() is not implemented (deferred)')
	}

	private _getClientId(c: Context): string {
		return c.req.header('x-rpc-client-id') || 'anonymous'
	}

	private _normalizeEvent(event: string): string {
		return event.replaceAll(/\/+/g, '/').replaceAll(/^\/|\/$/g, '')
	}
}
