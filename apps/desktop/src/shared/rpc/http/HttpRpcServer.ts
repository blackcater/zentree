import type { Context, Hono } from 'hono'

import { RpcError } from '../RpcError'
import type { RpcServer, RpcRouter, Rpc } from '../types'
import { HttpRpcRouter } from './HttpRpcRouter'

interface RegisteredHandler {
	handler: Rpc.HandlerFn
	options?: Rpc.HandleOptions
}

export class HttpRpcServer implements RpcServer {
	private readonly _handlers = new Map<string, RegisteredHandler>()

	constructor(private readonly app: Hono) {
		this._setupRoutes()
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
			return handler.handler(ctx, result.value as unknown[])
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
