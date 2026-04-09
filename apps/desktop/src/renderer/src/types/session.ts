export interface UIMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | unknown[]
  timestamp?: number
  isStreaming?: boolean
  attachments?: unknown[]
  tool_calls?: Array<{ id?: string; name?: string; [key: string]: unknown }>
}
