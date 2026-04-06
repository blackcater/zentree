import { useCallback, useRef } from 'react'
import { useStore } from 'jotai'
import { ipc } from '@/services/ipc'
import {
  sessionAtomFamily,
  sessionMetaMapAtom,
  appendMessageAtom,
  updateStreamingContentAtom,
  extractSessionMeta,
} from '@/stores/atoms/session'
import type { SessionEvent } from '@/types/session'

/**
 * Hook to manage multiple Session streaming connections
 * Each Session's stream is processed in an independent async context
 */
export function useSessionStreams() {
  const store = useStore()
  const streamsRef = useRef<Map<string, Rpc.StreamResult<SessionEvent>>>(new Map())

  /**
   * Start streaming for a specific Session
   */
  const startStream = useCallback((sessionId: string) => {
    // Avoid duplicate starts
    if (streamsRef.current.has(sessionId)) return

    const stream = ipc.streamSession(sessionId)
    streamsRef.current.set(sessionId, stream)

    // Independent async processing, doesn't block other Sessions
    ;(async () => {
      try {
        for await (const event of stream) {
          handleSessionEvent(store, sessionId, event)
        }
      } catch (error) {
        console.error(`Stream error for session ${sessionId}:`, error)
      } finally {
        streamsRef.current.delete(sessionId)
      }
    })()
  }, [store])

  /**
   * Stop streaming for a specific Session
   */
  const stopStream = useCallback((sessionId: string) => {
    const stream = streamsRef.current.get(sessionId)
    if (stream) {
      stream.cancel()
      streamsRef.current.delete(sessionId)
    }
  }, [])

  /**
   * Stop all streams
   */
  const stopAllStreams = useCallback(() => {
    streamsRef.current.forEach((stream) => stream.cancel())
    streamsRef.current.clear()
  }, [])

  return {
    startStream,
    stopStream,
    stopAllStreams,
  }
}

/**
 * Handle Session event, update corresponding atom
 */
function handleSessionEvent(
  store: ReturnType<typeof useStore>,
  sessionId: string,
  event: SessionEvent
) {
  switch (event.type) {
    case 'text_delta':
      // Streaming update
      store.set(updateStreamingContentAtom, sessionId, event.content)
      break

    case 'text_complete':
      // Message complete
      store.set(appendMessageAtom, sessionId, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: event.content,
        timestamp: Date.now(),
      })
      break

    case 'complete':
      // Session complete, update metadata
      updateSessionMetadata(store, sessionId)
      break

    case 'error':
      // Error handling
      console.error(`Session ${sessionId} error:`, event.message)
      break
  }
}

/**
 * Update Session metadata
 */
function updateSessionMetadata(
  store: ReturnType<typeof useStore>,
  sessionId: string
) {
  const sessionAtom = sessionAtomFamily(sessionId)
  const session = store.get(sessionAtom)
  if (!session) return

  const metaMap = store.get(sessionMetaMapAtom)
  const newMetaMap = new Map(metaMap)
  newMetaMap.set(sessionId, extractSessionMeta(session))
  store.set(sessionMetaMapAtom, newMetaMap)
}