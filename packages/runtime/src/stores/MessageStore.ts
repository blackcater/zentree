import { existsSync } from 'node:fs'
import { mkdir, appendFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { createId } from '@paralleldrive/cuid2'

import { log } from '../lib/logger'
import type { Message } from '../types'

export class MessageStore {
	readonly #basePath: string

	constructor(basePath: string) {
		this.#basePath = basePath
	}

	private getMessagesPath(threadId: string): string {
		return join(this.#basePath, 'threads', threadId, 'messages.jsonl')
	}

	private getThreadDir(threadId: string): string {
		return join(this.#basePath, 'threads', threadId)
	}

	async append(data: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
		const message: Message = {
			...data,
			id: createId(),
			timestamp: new Date(),
		}

		const messagesPath = this.getMessagesPath(data.threadId)
		const threadDir = this.getThreadDir(data.threadId)

		if (!existsSync(threadDir)) {
			await mkdir(threadDir, { recursive: true })
		}

		const line = JSON.stringify(message) + '\n'
		await appendFile(messagesPath, line, 'utf-8')

		log.info('Message appended', {
			messageId: message.id,
			threadId: message.threadId,
		})
		return message
	}

	async list(threadId: string, limit?: number): Promise<Message[]> {
		const messagesPath = this.getMessagesPath(threadId)

		if (!existsSync(messagesPath)) {
			return []
		}

		try {
			const content = await readFile(messagesPath, 'utf-8')
			const lines = content
				.split('\n')
				.filter((line) => line.trim() !== '')
			const messages = lines.map((line) => JSON.parse(line) as Message)

			if (limit !== undefined && limit > 0) {
				return messages.slice(-limit)
			}

			return messages
		} catch (error) {
			log.error('Failed to read messages', { threadId, error })
			return []
		}
	}
}
