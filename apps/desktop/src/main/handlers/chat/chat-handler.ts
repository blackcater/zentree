import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'
import type { Rpc } from '@/shared/rpc'
import type { Session, SessionSummary, Turn, EngineConfig, EngineType } from '@/shared/types'
import type { EngineBridge, EngineEvent } from '../engines'
import { engineRegistry } from '../engines'
import type { SessionStore } from '../session-store'
import { SESSION_STORE_TOKEN } from '../session-store'
import { createSessionSchema, sendMessageSchema } from './chat.schema'

export interface EngineInstance {
	engine: EngineBridge
	sessionId: string
}

export class ChatHandler {
	readonly #rpcServer: ElectronRpcServer
	readonly #sessionStore: SessionStore
	readonly #cancelFns: Map<string, () => void> = new Map()

	constructor() {
		this.#rpcServer = Container.inject(ElectronRpcServer)
		this.#sessionStore = Container.inject(SESSION_STORE_TOKEN)
	}

	register(): void {
		const router = this.#rpcServer.router('chat')

		// Session handlers
		router.handle(
			'session/create',
			{ schema: createSessionSchema },
			(engineType: string, engineConfig: Record<string, unknown>) =>
				this.createSession(engineType, engineConfig)
		)
		router.handle('session/list', (filter?: { engineType?: EngineType; status?: string }) =>
			this.listSessions(filter)
		)
		router.handle('session/get', (id: string) => this.getSession(id))
		router.handle('session/delete', (id: string) => this.deleteSession(id))
		router.handle('session/fork', (baseId: string, fromTurnId?: string) =>
			this.forkSession(baseId, fromTurnId)
		)
		router.handle('session/archive', (id: string) => this.archiveSession(id))
		router.handle('session/rollback', (id: string, turnCount: number) =>
			this.rollbackSession(id, turnCount)
		)

		// Message handlers
		router.handle(
			'send',
			{ schema: sendMessageSchema },
			(sessionId: string, input: string) => this.sendMessage(sessionId, input)
		)
		router.handle('interrupt', (sessionId: string) => this.interrupt(sessionId))
	}

	private async createSession(
		engineType: string,
		engineConfig: Record<string, unknown>
	): Promise<Session> {
		const EngineClass = engineRegistry.get(engineType)
		if (!EngineClass) {
			throw new Error(`Unknown engine type: ${engineType}`)
		}

		const engine = new EngineClass()
		const config: EngineConfig = {
			engine: engineType as EngineType,
			...engineConfig,
		}

		await engine.initialize(config)
		const engineSessionId = await engine.createSession(config)

		// Register event listener
		const cancelFn = engine.onEvent((event) => this.#handleEngineEvent(event))

		const session = await this.#sessionStore.create({
			engine: engineType as EngineType,
			config,
		})

		sharedEngines.set(session.id, { engine, sessionId: engineSessionId })
		this.#cancelFns.set(session.id, cancelFn)

		return session
	}

	async listSessions(
		filter?: { engineType?: EngineType; status?: string }
	): Promise<SessionSummary[]> {
		return this.#sessionStore.list(filter)
	}

	async getSession(id: string): Promise<Session | null> {
		return this.#sessionStore.get(id)
	}

	async deleteSession(id: string): Promise<void> {
		const instance = sharedEngines.get(id)
		if (instance) {
			await instance.engine.closeSession(instance.sessionId)
			instance.engine.destroy()
			sharedEngines.delete(id)
		}

		const cancelFn = this.#cancelFns.get(id)
		if (cancelFn) {
			cancelFn()
			this.#cancelFns.delete(id)
		}

		await this.#sessionStore.delete(id)
	}

	async forkSession(baseId: string, fromTurnId?: string): Promise<Session> {
		return this.#sessionStore.fork(baseId, fromTurnId)
	}

	async archiveSession(id: string): Promise<void> {
		await this.#sessionStore.archive(id)
	}

	async rollbackSession(id: string, turnCount: number): Promise<void> {
		await this.#sessionStore.rollback(id, turnCount)
	}

	async sendMessage(sessionId: string, input: string): Promise<void> {
		const instance = sharedEngines.get(sessionId)
		if (!instance) {
			throw new Error(`No engine found for session: ${sessionId}`)
		}

		// Create a new turn
		const turn: Turn = {
			id: crypto.randomUUID(),
			messages: [
				{
					id: crypto.randomUUID(),
					role: 'user',
					parts: [{ type: 'text', text: input }],
				},
			],
			created_at: Date.now(),
		}

		await this.#sessionStore.addTurn(sessionId, turn)

		// Send to engine
		await instance.engine.send(instance.sessionId, input)
	}

	async interrupt(sessionId: string): Promise<void> {
		const instance = sharedEngines.get(sessionId)
		if (instance) {
			await instance.engine.interrupt(instance.sessionId)
		}
	}

	#handleEngineEvent(event: EngineEvent): void {
		const target: Rpc.Target = { type: 'broadcast' }

		switch (event.type) {
			case 'status_change':
				this.#rpcServer.push('chat/status', target, event.sessionId, event.data)
				break
			case 'delta':
				this.#rpcServer.push('chat/delta', target, event.sessionId, event.data)
				break
			case 'permission_request':
				this.#rpcServer.push('chat/permission', target, event.sessionId, event.data)
				break
			case 'turn_complete':
				this.#rpcServer.push('chat/turn_complete', target, event.sessionId, event.data)
				break
			case 'error':
				this.#rpcServer.push('chat/error', target, event.sessionId, event.data)
				break
		}
	}
}

// Shared engines map for permission handler
export const sharedEngines = new Map<string, EngineInstance>()
