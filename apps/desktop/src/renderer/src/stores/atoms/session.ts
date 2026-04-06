import { atom } from 'jotai'
import { atomFamily } from 'jotai/utils'
import type { Session, Message } from '@/types/session'

/**
 * Session atom family - each session has its own isolated atom
 * Uses atomFamily for isolation, updates to one session don't affect others
 */
export const sessionAtomFamily = atomFamily(
  (_sessionId: string) => atom<Session | null>(null),
  (a, b) => a === b
)

/**
 * Session metadata map - for list display
 */
export const sessionMetaMapAtom = atom<Map<string, SessionMeta>>(new Map())

/**
 * Session ID list - for ordering
 */
export const sessionIdsAtom = atom<string[]>([])

/**
 * Currently active Session ID
 */
export const activeSessionIdAtom = atom<string | null>(null)

/**
 * Loaded sessions set - for lazy loading
 */
export const loadedSessionsAtom = atom<Set<string>>(new Set<string>())

/**
 * Session metadata interface
 */
export interface SessionMeta {
  id: string
  name?: string
  preview?: string
  vaultId: string
  lastMessageAt?: number
  isProcessing?: boolean
  isFlagged?: boolean
  hasUnread?: boolean
}

/**
 * Update Session
 */
export const updateSessionAtom = atom(
  null,
  (get, set, sessionId: string, updater: (prev: Session | null) => Session | null) => {
    const sessionAtom = sessionAtomFamily(sessionId)
    const currentSession = get(sessionAtom)
    const newSession = updater(currentSession)
    set(sessionAtom, newSession)
  }
)

/**
 * Append message to Session
 */
export const appendMessageAtom = atom(
  null,
  (get, set, sessionId: string, message: Message) => {
    const sessionAtom = sessionAtomFamily(sessionId)
    const session = get(sessionAtom)
    if (session) {
      set(sessionAtom, {
        ...session,
        messages: [...session.messages, message],
      })
    }
  }
)

/**
 * Update streaming content
 */
export const updateStreamingContentAtom = atom(
  null,
  (get, set, sessionId: string, content: string) => {
    const sessionAtom = sessionAtomFamily(sessionId)
    const session = get(sessionAtom)
    if (!session) return

    const messages = [...session.messages]
    const lastMsg = messages[messages.length - 1]

    if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
      messages[messages.length - 1] = {
        ...lastMsg,
        content: lastMsg.content + content,
      }
      set(sessionAtom, { ...session, messages })
    }
  }
)

/**
 * Extract session metadata from session
 */
export function extractSessionMeta(session: Session): SessionMeta {
  const preview = session.messages[0]?.content?.substring(0, 50)
  return {
    id: session.id,
    vaultId: session.vaultId,
    lastMessageAt: session.updatedAt,
    isProcessing: false,
    isFlagged: false,
    hasUnread: false,
    ...(session.name !== undefined && { name: session.name }),
    ...(preview !== undefined && { preview }),
  }
}
