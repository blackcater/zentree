// Part types
export type PartType =
	| 'text'
	| 'tool_use'
	| 'tool_result'
	| 'reasoning'
	| 'compaction'
	| 'file'
	| 'agent'

// Base part interface
export interface BasePart {
	type: PartType
}

// Text part
export interface TextPart extends BasePart {
	type: 'text'
	text: string
}

// Tool part (tool_use)
export interface ToolUsePart extends BasePart {
	type: 'tool_use'
	id: string
	name: string
	input: Record<string, unknown>
}

// Tool result part
export interface ToolResultPart extends BasePart {
	type: 'tool_result'
	tool_use_id: string
	content: string
}

// Reasoning part
export interface ReasoningPart extends BasePart {
	type: 'reasoning'
	reasoning: string
}

// Compaction part
export interface CompactionPart extends BasePart {
	type: 'compaction'
	summary: string
}

// File part
export interface FilePart extends BasePart {
	type: 'file'
	file_id: string
	filename: string
	mime_type?: string
}

// Agent part
export interface AgentPart extends BasePart {
	type: 'agent'
	agent_id: string
	name?: string
}

// Union of all part types
export type Part =
	| TextPart
	| ToolUsePart
	| ToolResultPart
	| ReasoningPart
	| CompactionPart
	| FilePart
	| AgentPart

// Message types
export interface Message {
	id: string
	role: 'user' | 'assistant' | 'system'
	parts: Part[]
	created_at?: number
	updated_at?: number
}

export interface Turn {
	id: string
	messages: Message[]
	created_at?: number
}

// File diff
export interface FileDiff {
	file_id: string
	filename: string
	diff: string
	language?: string
}

// Token usage
export interface TokenUsage {
	input_tokens: number
	output_tokens: number
	total_tokens: number
	reasoning_tokens?: number
}

// Engine types
export type EngineType = 'anthropic' | 'openai' | 'google' | 'local' | 'custom'

// Session
export interface Session {
	id: string
	engine: EngineType
	config: EngineConfig
	created_at: number
	updated_at: number
}

export interface SessionSummary {
	id: string
	engine: EngineType
	title?: string
	message_count: number
	created_at: number
	updated_at: number
}

export interface EngineConfig {
	engine: EngineType
	model?: string
	temperature?: number
	max_tokens?: number
	top_p?: number
	top_k?: number
	system_prompt?: string
}

// Permission request
export interface PermissionRequest {
	id: string
	type: 'file_read' | 'file_write' | 'network' | 'execute' | 'other'
	resource: string
	reason?: string
	granted?: boolean
	created_at: number
}

// Stream delta
export interface StreamDelta {
	type: 'text' | 'reasoning' | 'tool_use' | 'content_block' | 'message_delta'
	content?: string
	name?: string
	index?: number
	delta?: unknown
}
