import { useMemo } from 'react'

/**
 * Message type for UI rendering - includes tool_calls support
 * This extends the basic Message type with additional fields needed for outline
 */
export interface UIMessage {
	id: string
	role: 'user' | 'assistant' | 'system' | 'tool'
	content: string | unknown[]
	timestamp?: number
	isStreaming?: boolean
	attachments?: unknown[]
	tool_calls?: Array<{ id?: string; name?: string; [key: string]: unknown }>
}

export type OutlineNodeType = 'user' | 'assistant' | 'tool_call' | 'tool_result'

export interface OutlineNode {
	id: string
	type: OutlineNodeType
	label: string
	icon?: string
	messageId: string
	children?: OutlineNode[]
}

function getToolName(toolName: string): string {
	// Extract readable tool name from tool call
	const parts = toolName.split('_')
	return parts[parts.length - 1] || toolName
}

function buildOutlineTree(messages: UIMessage[]): OutlineNode[] {
	const nodes: OutlineNode[] = []

	for (const message of messages) {
		if (message.role === 'tool') {
			// Skip individual tool results - they are grouped with their tool_call
			continue
		}

		if (message.role === 'user') {
			// Extract first line of user message as label
			const text =
				typeof message.content === 'string'
					? message.content
					: JSON.stringify(message.content)
			const label = text.split('\n')[0].slice(0, 50)

			nodes.push({
				id: message.id,
				type: 'user',
				label: label || 'User message',
				messageId: message.id,
			})
			continue
		}

		if (message.role === 'assistant') {
			const content = message.content
			const text =
				typeof content === 'string'
					? content
					: Array.isArray(content)
						? content
							.map((c) => {
								const item = c as { text?: string }
								return 'text' in item ? item.text || '' : ''
							})
							.join('')
						: ''

			// Extract first meaningful response
			const label = text.split('\n')[0].slice(0, 50) || 'Assistant response'

			const node: OutlineNode = {
				id: message.id,
				type: 'assistant',
				label,
				messageId: message.id,
				children: [],
			}

			// Check for tool calls in the message
			if (message.tool_calls && Array.isArray(message.tool_calls)) {
				let toolCallIndex = 0
				for (const toolCall of message.tool_calls) {
					const toolName =
						typeof toolCall === 'string'
							? toolCall
							: 'name' in toolCall
								? String(toolCall.name)
								: 'unknown'

					node.children!.push({
						id: `tool-${message.id}-${toolCallIndex++}`,
						type: 'tool_call',
						label: getToolName(toolName),
						messageId: message.id,
					})
				}
			}

			nodes.push(node)
		}
	}

	return nodes
}

interface UseOutlineOptions {
	/** Messages to extract outline from */
	messages: UIMessage[]
}

interface UseOutlineResult {
	nodes: OutlineNode[]
	totalCount: number
	userMessageCount: number
	assistantMessageCount: number
	toolCallCount: number
}

export function useOutline({ messages }: UseOutlineOptions): UseOutlineResult {
	return useMemo(() => {
		const nodes = buildOutlineTree(messages)

		let userMessageCount = 0
		let assistantMessageCount = 0
		let toolCallCount = 0

		for (const node of nodes) {
			if (node.type === 'user') userMessageCount++
			if (node.type === 'assistant') assistantMessageCount++
			toolCallCount += node.children?.length || 0
		}

		return {
			nodes,
			totalCount: nodes.length,
			userMessageCount,
			assistantMessageCount,
			toolCallCount,
		}
	}, [messages])
}
