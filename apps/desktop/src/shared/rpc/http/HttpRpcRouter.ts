import type { Rpc, RpcRouter, RpcServer } from '../types'

export class HttpRpcRouter implements RpcRouter {
	constructor(
		private readonly server: RpcServer,
		private readonly prefix: string
	) {}

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
		if (typeof optionsOrHandler === 'function') {
			this.server.handle(`${this.prefix}/${event}`, optionsOrHandler)
		} else {
			this.server.handle(
				`${this.prefix}/${event}`,
				optionsOrHandler,
				maybeHandler!
			)
		}
	}

	group(ns: string): RpcRouter {
		return new HttpRpcRouter(this.server, `${this.prefix}/${ns}`)
	}
}
