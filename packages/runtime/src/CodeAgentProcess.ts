import { spawn, ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'

import { log } from './lib/logger'
import type { AgentProcessOptions } from './types'

export interface ProcessMessage {
	type: 'stdout' | 'stderr' | 'exit' | 'error'
	data?: string
	code?: number
}

export class CodeAgentProcess extends EventEmitter {
	readonly agentId: string
	readonly threadId: string

	#process: ChildProcess | null = null
	#running = false

	constructor(agentId: string, threadId: string) {
		super()
		this.agentId = agentId
		this.threadId = threadId
	}

	isRunning(): boolean {
		return this.#running && this.#process !== null
	}

	start(
		command: string,
		args: string[],
		options: AgentProcessOptions = {}
	): boolean {
		if (this.#running) {
			log.warn('Agent process already running', { agentId: this.agentId })
			return false
		}

		try {
			log.info('Starting agent process', {
				agentId: this.agentId,
				threadId: this.threadId,
				command,
			})

			this.#process = spawn(command, args, {
				cwd: options.cwd,
				env: { ...process.env, ...options.env },
				stdio: ['pipe', 'pipe', 'pipe'],
			})

			this.#process.stdout?.on('data', (data: Buffer) => {
				this.emit('message', {
					type: 'stdout',
					data: data.toString(),
				} as ProcessMessage)
			})

			this.#process.stderr?.on('data', (data: Buffer) => {
				this.emit('message', {
					type: 'stderr',
					data: data.toString(),
				} as ProcessMessage)
			})

			this.#process.on('error', (error) => {
				log.error('Agent process error', {
					agentId: this.agentId,
					error,
				})
				this.#running = false
				this.emit('message', {
					type: 'error',
					data: error.message,
				} as ProcessMessage)
				this.emit('exit', { code: -1 })
			})

			this.#process.on('exit', (code) => {
				log.info('Agent process exited', {
					agentId: this.agentId,
					code,
				})
				this.#running = false
				this.emit('message', {
					type: 'exit',
					code: code ?? 0,
				} as ProcessMessage)
				this.emit('exit', { code: code ?? 0 })
			})

			this.#running = true
			return true
		} catch (error) {
			log.error('Failed to start agent process', {
				agentId: this.agentId,
				error,
			})
			return false
		}
	}

	sendMessage(content: string): boolean {
		if (!this.#running || !this.#process || !this.#process.stdin) {
			log.warn('Cannot send message: process not running', {
				agentId: this.agentId,
			})
			return false
		}

		try {
			this.#process.stdin.write(content + '\n')
			return true
		} catch (error) {
			log.error('Failed to send message to agent', {
				agentId: this.agentId,
				error,
			})
			return false
		}
	}

	stop(): boolean {
		if (!this.#running || !this.#process) {
			log.warn('Cannot stop: process not running', {
				agentId: this.agentId,
			})
			return false
		}

		try {
			log.info('Stopping agent process', { agentId: this.agentId })

			// Try graceful termination first
			this.#process.kill('SIGTERM')

			// Force kill after timeout
			setTimeout(() => {
				if (this.#process && !this.#process.killed) {
					this.#process.kill('SIGKILL')
				}
			}, 5000)

			return true
		} catch (error) {
			log.error('Failed to stop agent process', {
				agentId: this.agentId,
				error,
			})
			return false
		}
	}
}
