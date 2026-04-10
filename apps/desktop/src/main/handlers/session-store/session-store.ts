import type { Session, SessionSummary, Turn, EngineType } from '@/shared/types'

export interface SessionStore {
	// CRUD
	create(session: Omit<Session, 'id' | 'created_at' | 'updated_at'>): Promise<Session>
	get(id: string): Promise<Session | null>
	list(filter?: { engineType?: EngineType; status?: string }): Promise<SessionSummary[]>
	update(id: string, patch: Partial<Session>): Promise<void>
	delete(id: string): Promise<void>

	// Lifecycle
	fork(baseId: string, fromTurnId?: string): Promise<Session>
	archive(id: string): Promise<void>
	unarchive(id: string): Promise<void>
	rollback(id: string, turnCount: number): Promise<void>

	// Turn operations
	addTurn(sessionId: string, turn: Turn): Promise<void>
	updateTurn(sessionId: string, turnId: string, patch: Partial<Turn>): Promise<void>
	getTurn(sessionId: string, turnId: string): Promise<Turn | null>
}
