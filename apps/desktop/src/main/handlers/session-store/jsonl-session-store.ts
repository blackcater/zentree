import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import type { Session, SessionSummary, Turn, EngineType } from '@/shared/types'

import type { SessionStore } from './session-store'

const SESSIONS_DIR = path.join(os.homedir(), '.acme', 'sessions')

interface SessionMeta {
	id: string
	engine: EngineType
	config: Session['config']
	title?: string
	created_at: number
	updated_at: number
	archived?: boolean
}

export class JsonlSessionStore implements SessionStore {
	async #ensureSessionDir(sessionId: string): Promise<string> {
		const sessionDir = path.join(SESSIONS_DIR, sessionId)
		await fs.mkdir(sessionDir, { recursive: true })
		return sessionDir
	}

	#getMetaPath(sessionId: string): string {
		return path.join(SESSIONS_DIR, sessionId, 'meta.json')
	}

	#getTurnsPath(sessionId: string): string {
		return path.join(SESSIONS_DIR, sessionId, 'turns.jsonl')
	}

	async #readMeta(sessionId: string): Promise<SessionMeta | null> {
		const metaPath = this.#getMetaPath(sessionId)
		try {
			const content = await fs.readFile(metaPath, 'utf-8')
			return JSON.parse(content) as SessionMeta
		} catch {
			return null
		}
	}

	async #writeMeta(sessionId: string, meta: SessionMeta): Promise<void> {
		const metaPath = this.#getMetaPath(sessionId)
		await this.#ensureSessionDir(sessionId)
		await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8')
	}

	async #readTurns(sessionId: string): Promise<Turn[]> {
		const turnsPath = this.#getTurnsPath(sessionId)
		try {
			const content = await fs.readFile(turnsPath, 'utf-8')
			return content
				.split('\n')
				.filter((line) => line.trim())
				.map((line) => JSON.parse(line) as Turn)
		} catch {
			return []
		}
	}

	async #appendTurn(sessionId: string, turn: Turn): Promise<void> {
		const sessionDir = await this.#ensureSessionDir(sessionId)
		const fullPath = path.join(sessionDir, 'turns.jsonl')
		await fs.appendFile(fullPath, JSON.stringify(turn) + '\n', 'utf-8')
	}

	async #writeTurns(sessionId: string, turns: Turn[]): Promise<void> {
		const turnsPath = this.#getTurnsPath(sessionId)
		const content = turns.map((turn) => JSON.stringify(turn)).join('\n') + '\n'
		await fs.writeFile(turnsPath, content, 'utf-8')
	}

	async #listSessionIds(): Promise<string[]> {
		try {
			const entries = await fs.readdir(SESSIONS_DIR, { withFileTypes: true })
			return entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name)
		} catch {
			return []
		}
	}

	async create(
		session: Omit<Session, 'id' | 'created_at' | 'updated_at'>
	): Promise<Session> {
		const id = randomUUID()
		const now = Date.now()
		const meta: SessionMeta = {
			id,
			engine: session['engine'],
			config: session['config'],
			created_at: now,
			updated_at: now,
		}
		await this.#writeMeta(id, meta)

		const fullSession: Session = {
			...meta,
			created_at: now,
			updated_at: now,
		}
		return fullSession
	}

	async get(id: string): Promise<Session | null> {
		const meta = await this.#readMeta(id)
		if (!meta) return null

		return {
			id: meta.id,
			engine: meta.engine,
			config: meta.config,
			created_at: meta.created_at,
			updated_at: meta.updated_at,
		}
	}

	async list(
		filter?: { engineType?: EngineType; status?: string }
	): Promise<SessionSummary[]> {
		const sessionIds = await this.#listSessionIds()
		const summaries: SessionSummary[] = []

		for (const id of sessionIds) {
			const meta = await this.#readMeta(id)
			if (!meta) continue

			// Apply filters
			if (filter?.engineType && meta.engine !== filter.engineType) continue
			if (filter?.status === 'archived' && !meta.archived) continue
			if (filter?.status === 'active' && meta.archived) continue

			const turns = await this.#readTurns(id)
			const summary: SessionSummary = {
				id: meta.id,
				engine: meta.engine,
				...(meta.title !== undefined && { title: meta.title }),
				message_count: turns.reduce(
					(acc, turn) => acc + turn.messages.length,
					0
				),
				created_at: meta.created_at,
				updated_at: meta.updated_at,
			}
			summaries.push(summary)
		}

		// Sort by updated_at descending
		summaries.sort((a, b) => b.updated_at - a.updated_at)
		return summaries
	}

	async update(id: string, patch: Partial<Session>): Promise<void> {
		const meta = await this.#readMeta(id)
		if (!meta) return

		const updatedMeta: SessionMeta = {
			...meta,
			...patch,
			id: meta.id, // Prevent id override
			created_at: meta.created_at, // Prevent created_at override
			updated_at: Date.now(),
		}
		await this.#writeMeta(id, updatedMeta)
	}

	async delete(id: string): Promise<void> {
		const sessionDir = path.join(SESSIONS_DIR, id)
		await fs.rm(sessionDir, { recursive: true, force: true })
	}

	async fork(baseId: string, fromTurnId?: string): Promise<Session> {
		const baseMeta = await this.#readMeta(baseId)
		if (!baseMeta) {
			throw new Error(`Base session ${baseId} not found`)
		}

		const baseTurns = await this.#readTurns(baseId)

		// Find the turn index to fork from
		let forkIndex = 0
		if (fromTurnId) {
			const idx = baseTurns.findIndex((t) => t.id === fromTurnId)
			if (idx !== -1) forkIndex = idx + 1
		}

		// Create new session
		const newSession = await this.create({
			engine: baseMeta.engine,
			config: baseMeta.config,
		})

		// Copy turns up to fork point
		const turnsToFork = baseTurns.slice(0, forkIndex)
		for (const turn of turnsToFork) {
			await this.addTurn(newSession.id, turn)
		}

		return newSession
	}

	async archive(id: string): Promise<void> {
		const meta = await this.#readMeta(id)
		if (!meta) return
		meta.archived = true
		meta.updated_at = Date.now()
		await this.#writeMeta(id, meta)
	}

	async unarchive(id: string): Promise<void> {
		const meta = await this.#readMeta(id)
		if (!meta) return
		meta.archived = false
		meta.updated_at = Date.now()
		await this.#writeMeta(id, meta)
	}

	async rollback(id: string, turnCount: number): Promise<void> {
		const turns = await this.#readTurns(id)
		if (turnCount >= turns.length) {
			throw new Error('Cannot rollback more turns than exist')
		}
		const newTurns = turns.slice(0, turns.length - turnCount)
		await this.#writeTurns(id, newTurns)

		const meta = await this.#readMeta(id)
		if (meta) {
			meta.updated_at = Date.now()
			await this.#writeMeta(id, meta)
		}
	}

	async addTurn(sessionId: string, turn: Turn): Promise<void> {
		await this.#appendTurn(sessionId, turn)

		const meta = await this.#readMeta(sessionId)
		if (meta) {
			meta.updated_at = Date.now()
			await this.#writeMeta(sessionId, meta)
		}
	}

	async updateTurn(
		sessionId: string,
		turnId: string,
		patch: Partial<Turn>
	): Promise<void> {
		const turns = await this.#readTurns(sessionId)
		const index = turns.findIndex((t) => t.id === turnId)
		if (index === -1) return

		turns[index] = { ...turns[index], ...patch }
		await this.#writeTurns(sessionId, turns)

		const meta = await this.#readMeta(sessionId)
		if (meta) {
			meta.updated_at = Date.now()
			await this.#writeMeta(sessionId, meta)
		}
	}

	async getTurn(sessionId: string, turnId: string): Promise<Turn | null> {
		const turns = await this.#readTurns(sessionId)
		return turns.find((t) => t.id === turnId) ?? null
	}
}
