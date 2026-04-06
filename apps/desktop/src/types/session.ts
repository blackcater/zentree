export interface Session {
  id: string
  name?: string
  vaultId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments?: FileAttachment[]
  timestamp: number
  isStreaming?: boolean
}

export interface FileAttachment {
  id: string
  name: string
  type: string
  url: string
}

export type SessionEvent =
  | { type: 'text_delta'; sessionId: string; content: string; turnId?: string }
  | { type: 'text_complete'; sessionId: string; content: string; turnId?: string }
  | { type: 'complete'; sessionId: string }
  | { type: 'error'; sessionId: string; message: string }
