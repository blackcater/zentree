import type { Message } from '@acme-ai/core'

/**
 * Agent event types
 */
export type AgentEvent =
	| { type: 'agent_start' }
	| { type: 'agent_end'; messages?: AgentMessage[] }
	| { type: 'agent_error'; error: string }
	| { type: 'turn_start' }
	| { type: 'turn_end'; message: AgentMessage; toolResults?: ToolResultMessage[] }
	| { type: 'message_start'; message: AgentMessage }
	| { type: 'message_update'; message: AgentMessage; delta?: string }
	| { type: 'message_end'; message: AgentMessage }
	| { type: 'tool_execution_start'; toolCallId: string; toolName: string; args: unknown }
	| { type: 'tool_execution_update'; toolCallId: string; partialResult: unknown }
	| { type: 'tool_execution_end'; toolCallId: string; result: unknown; isError: boolean }

/**
 * Agent message
 */
export interface AgentMessage {
	id: string
	role: 'user' | 'assistant' | 'system' | 'toolResult'
	content: Array<{ type: 'text'; text: string } | { type: 'toolCall'; id: string; name: string; args: unknown } | { type: 'toolResult'; toolCallId: string; result: unknown }>
	timestamp: number
	stopReason?: 'stop' | 'tool_use' | 'error' | 'abort'
}

/**
 * Tool result message
 */
export interface ToolResultMessage extends AgentMessage {
	role: 'toolResult'
	toolCallId: string
	toolName: string
	result: unknown
	isError?: boolean
}

/**
 * Agent tool interface
 */
export interface AgentTool {
	name: string
	description?: string
	inputSchema: Record<string, unknown>
	execute: (id: string, args: unknown, signal?: AbortSignal, onUpdate?: (result: unknown) => void) => Promise<unknown>
}

/**
 * Agent context
 */
export interface AgentContext {
	systemPrompt: string
	messages: AgentMessage[]
	tools?: AgentTool[]
}

/**
 * Agent loop configuration
 */
export interface AgentLoopConfig {
	convertToLlm?: (messages: AgentMessage[]) => Message[]
	transformContext?: (messages: AgentMessage[], signal?: AbortSignal) => Promise<AgentMessage[]>
	beforeToolCall?: (context: BeforeToolCallContext) => Promise<BeforeToolCallResult | undefined>
	afterToolCall?: (context: AfterToolCallContext) => Promise<AfterToolCallResult | undefined>
	getSteeringMessages?: () => Promise<AgentMessage[]>
	getFollowUpMessages?: () => Promise<AgentMessage[]>
}

/**
 * Before tool call context
 */
export interface BeforeToolCallContext {
	assistantMessage: AgentMessage
	toolCall: { id: string; name: string; args: unknown }
	args: unknown
	context: AgentContext
}

/**
 * Before tool call result
 */
export interface BeforeToolCallResult {
	block?: boolean
	reason?: string
}

/**
 * After tool call context
 */
export interface AfterToolCallContext extends BeforeToolCallContext {
	result: unknown
	isError?: boolean
}

/**
 * After tool call result
 */
export interface AfterToolCallResult {
	content?: unknown
	isError?: boolean
}

export type AgentEventSink = (event: AgentEvent) => Promise<void> | void