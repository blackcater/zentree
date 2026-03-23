import type { AgentRuntime } from '@acme-ai/runtime'
import { getRouter } from '@main/ipc/router'
import { agentContracts } from '@/shared/ipc/contracts'
import { handlerLog } from '@main/lib/logger'

// Track which windowId owns which agent for authorization
const agentOwnership = new Map<string, string>()

export function initAgentHandlers(runtime: AgentRuntime): void {
	const router = getRouter()

	// agent:start
	router.register('agent:start', async (input, windowId) => {
		const params = agentContracts.start.input.parse(input)
		handlerLog.debug('agent:start called', { params })

		const success = runtime.startAgent(params.agentId, params.threadId)

		// Track ownership: this windowId owns this agent
		if (success) {
			agentOwnership.set(params.agentId, windowId)
		}

		return agentContracts.start.output.parse({ success })
	})

	// agent:stop
	router.register('agent:stop', async (input, windowId) => {
		const params = agentContracts.stop.input.parse(input)
		handlerLog.debug('agent:stop called', { params })

		// Authorization check: verify the caller owns this agent
		const ownerWindowId = agentOwnership.get(params.agentId)
		if (ownerWindowId !== windowId) {
			throw new Error(`Unauthorized: window ${windowId} cannot stop agent ${params.agentId}`)
		}

		const success = runtime.stopAgent(params.agentId)

		// Clean up ownership tracking
		if (success) {
			agentOwnership.delete(params.agentId)
		}

		return agentContracts.stop.output.parse({ success })
	})

	// agent:status
	router.register('agent:status', async (input, _windowId) => {
		agentContracts.getStatus.input.parse(input)
		handlerLog.debug('agent:status called')

		const status = runtime.getStatus()

		return agentContracts.getStatus.output.parse(status)
	})

	// agent:send
	router.register('agent:send', async (input, windowId) => {
		const params = agentContracts.sendMessage.input.parse(input)
		handlerLog.debug('agent:send called', { params })

		// Authorization check: verify the caller owns this agent
		const ownerWindowId = agentOwnership.get(params.agentId)
		if (ownerWindowId !== windowId) {
			throw new Error(`Unauthorized: window ${windowId} cannot send messages for agent ${params.agentId}`)
		}

		// Find threadId from agentId via threadAgentMap
		const threadAgentMap = runtime.getThreadAgentMap()
		let threadId: string | undefined

		for (const [tid, agId] of threadAgentMap.entries()) {
			if (agId === params.agentId) {
				threadId = tid
				break
			}
		}

		if (!threadId) {
			throw new Error(`No thread found for agentId: ${params.agentId}`)
		}

		const messageId = await runtime.sendMessage(threadId, params.content)

		if (!messageId) {
			throw new Error('Failed to send message')
		}

		return agentContracts.sendMessage.output.parse({ messageId })
	})

	handlerLog.info('Agent handlers initialized')
}
