import { EventEmitter } from 'node:events'

import { CodeAgentProcess } from './CodeAgentProcess'
import { log } from './lib/logger'
import { MessageStore } from './stores/MessageStore'
import { ThreadStore } from './stores/ThreadStore'
import type { AgentStatus, AgentProcessOptions } from './types'

export interface RuntimeConfig {
	basePath: string
	agentCommand?: string
	agentArgs?: string[]
}

export class AgentRuntime extends EventEmitter {
	readonly #config: RuntimeConfig
	readonly #threadStore: ThreadStore
	readonly #messageStore: MessageStore
	readonly #processes: Map<string, CodeAgentProcess> = new Map()
	readonly #threadAgentMap: Map<string, string> = new Map()

	constructor(config: RuntimeConfig) {
		super()
		this.#config = config
		this.#threadStore = new ThreadStore(config.basePath)
		this.#messageStore = new MessageStore(config.basePath)
	}

	get threadStore(): ThreadStore {
		return this.#threadStore
	}

	get messageStore(): MessageStore {
		return this.#messageStore
	}

	startAgent(
		agentId: string,
		threadId: string,
		options: AgentProcessOptions = {}
	): boolean {
		if (this.#processes.has(agentId)) {
			log.warn('Agent already running', { agentId })
			return false
		}

		log.info('Starting agent', { agentId, threadId })

		const process = new CodeAgentProcess(agentId, threadId)

		process.on('message', (message) => {
			this.emit('agentMessage', { agentId, threadId, message })
		})

		process.on('exit', (info) => {
			this.#processes.delete(agentId)
			this.#threadAgentMap.delete(threadId)
			this.emit('agentExit', { agentId, threadId, ...info })
		})

		const command = this.#config.agentCommand || 'claude'
		const args = this.#config.agentArgs || []

		const success = process.start(command, args, {
			...options,
			env: {
				...options.env,
				THREAD_ID: threadId,
				AGENT_ID: agentId,
			},
		})

		if (success) {
			this.#processes.set(agentId, process)
			this.#threadAgentMap.set(threadId, agentId)
		}

		return success
	}

	stopAgent(agentId: string): boolean {
		const process = this.#processes.get(agentId)
		if (!process) {
			log.warn('Agent not found', { agentId })
			return false
		}

		const success = process.stop()
		if (success) {
			this.#processes.delete(agentId)
			// Find and remove thread mapping
			for (const [threadId, agId] of this.#threadAgentMap.entries()) {
				if (agId === agentId) {
					this.#threadAgentMap.delete(threadId)
					break
				}
			}
		}

		return success
	}

	stopAllAgents(): void {
		for (const agentId of this.#processes.keys()) {
			this.stopAgent(agentId)
		}
	}

	async sendMessage(
		threadId: string,
		content: string
	): Promise<string | null> {
		const agentId = this.#threadAgentMap.get(threadId)
		if (!agentId) {
			log.warn('No agent running for thread', { threadId })
			return null
		}

		const process = this.#processes.get(agentId)
		if (!process || !process.isRunning()) {
			log.warn('Agent process not running', { agentId, threadId })
			return null
		}

		// Append user message to store
		const userMessage = await this.#messageStore.append({
			threadId,
			role: 'user',
			content,
		})

		// Send to agent process
		const sent = process.sendMessage(content)
		if (!sent) {
			log.error('Failed to send message to agent', { agentId, threadId })
			return null
		}

		return userMessage.id
	}

	getStatus(): AgentStatus {
		const running: string[] = []
		const available: string[] = []

		for (const [agentId, process] of this.#processes.entries()) {
			if (process.isRunning()) {
				running.push(agentId)
			}
		}

		// For available, we could check installed agents
		// For now, just return empty array
		return { running, available }
	}

	getAgentProcess(agentId: string): CodeAgentProcess | undefined {
		return this.#processes.get(agentId)
	}

	getThreadAgentMap(): ReadonlyMap<string, string> {
		return this.#threadAgentMap
	}
}
