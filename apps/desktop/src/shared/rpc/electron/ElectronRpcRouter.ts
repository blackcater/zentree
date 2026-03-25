import type { Rpc, RpcRouter, RpcServer } from '../types'

export class ElectronRpcRouter implements RpcRouter {
	constructor(
		private readonly server: RpcServer,
		private readonly prefix: string
	) {}

	group(namespace: string): RpcRouter {
		return new ElectronRpcRouter(this.server, `${this.prefix}/${namespace}`)
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
		const fullPath = `${this.prefix}/${event}`
		if (typeof optionsOrHandler === 'function') {
			this.server.handle(fullPath, optionsOrHandler)
		} else {
			this.server.handle(fullPath, optionsOrHandler, maybeHandler!)
		}
	}
}
