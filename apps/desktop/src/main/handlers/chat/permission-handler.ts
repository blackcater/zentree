import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'
import type { EngineInstance } from './chat-handler'
import { sharedEngines } from './chat-handler'

export class PermissionHandler {
	readonly #rpcServer: ElectronRpcServer

	constructor() {
		this.#rpcServer = Container.inject(ElectronRpcServer)
	}

	register(): void {
		const router = this.#rpcServer.router('chat/permission')

		router.handle(
			'respond',
			(
				sessionId: string,
				requestId: string,
				approved: boolean,
				alwaysPattern?: string
			) => this.respond(sessionId, requestId, approved, alwaysPattern)
		)
	}

	private async respond(
		sessionId: string,
		requestId: string,
		approved: boolean,
		alwaysPattern?: string
	): Promise<void> {
		const instance: EngineInstance | undefined = sharedEngines.get(sessionId)
		if (instance) {
			await instance.engine.respondPermission(requestId, approved, alwaysPattern)
		}
	}
}
