import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { createId } from '@paralleldrive/cuid2'

import { log } from '../lib/logger'
import type { Thread } from '../types'

export class ThreadStore {
	readonly #basePath: string

	constructor(basePath: string) {
		this.#basePath = basePath
	}

	private getThreadDir(threadId: string): string {
		return join(this.#basePath, 'threads', threadId)
	}

	private getConfigPath(threadId: string): string {
		return join(this.getThreadDir(threadId), 'config.json')
	}

	async create(
		data: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<Thread> {
		const now = new Date()
		const thread: Thread = {
			...data,
			id: createId(),
			createdAt: now,
			updatedAt: now,
		}

		const threadDir = this.getThreadDir(thread.id)
		if (!existsSync(threadDir)) {
			await mkdir(threadDir, { recursive: true })
		}

		const configPath = this.getConfigPath(thread.id)
		await writeFile(configPath, JSON.stringify(thread, null, 2), 'utf-8')

		log.info('Thread created', { threadId: thread.id })
		return thread
	}

	async get(threadId: string): Promise<Thread | null> {
		const configPath = this.getConfigPath(threadId)

		if (!existsSync(configPath)) {
			return null
		}

		try {
			const content = await readFile(configPath, 'utf-8')
			return JSON.parse(content) as Thread
		} catch (error) {
			log.error('Failed to read thread', { threadId, error })
			return null
		}
	}

	async listByProject(projectId: string): Promise<Thread[]> {
		const threadsDir = join(this.#basePath, 'threads')

		if (!existsSync(threadsDir)) {
			return []
		}

		try {
			const entries = await readdir(threadsDir, { withFileTypes: true })
			const threadIds = entries
				.filter((entry) => entry.isDirectory())
				.map((entry) => entry.name)

			const threads: Thread[] = []
			for (const threadId of threadIds) {
				const thread = await this.get(threadId)
				if (thread && thread.projectId === projectId) {
					threads.push(thread)
				}
			}

			return threads.sort(
				(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
			)
		} catch (error) {
			log.error('Failed to list threads by project', { projectId, error })
			return []
		}
	}

	async update(
		threadId: string,
		data: Partial<Omit<Thread, 'id' | 'createdAt'>>
	): Promise<Thread | null> {
		const existing = await this.get(threadId)
		if (!existing) {
			return null
		}

		const updated: Thread = {
			...existing,
			...data,
			updatedAt: new Date(),
		}

		const configPath = this.getConfigPath(threadId)
		await writeFile(configPath, JSON.stringify(updated, null, 2), 'utf-8')

		log.info('Thread updated', { threadId })
		return updated
	}

	async delete(threadId: string): Promise<boolean> {
		const threadDir = this.getThreadDir(threadId)

		if (!existsSync(threadDir)) {
			return false
		}

		try {
			await rm(threadDir, { recursive: true })
			log.info('Thread deleted', { threadId })
			return true
		} catch (error) {
			log.error('Failed to delete thread', { threadId, error })
			return false
		}
	}
}
