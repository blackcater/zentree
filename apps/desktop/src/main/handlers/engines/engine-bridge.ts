import type { EngineConfig } from '@/shared/types'
import type {
  EngineBridge,
  EngineEvent,
  EngineEventListener,
  EngineState,
  EngineStatus,
} from './engine-types'

export class MockEngine implements EngineBridge {
  readonly engineType = 'mock'

  #listeners = new Set<EngineEventListener>()
  #sessions = new Map<string, EngineState>()

  async initialize(_config: EngineConfig): Promise<void> {
    // No initialization needed for mock
  }

  destroy(): void {
    this.#listeners.clear()
    this.#sessions.clear()
  }

  async createSession(_config: EngineConfig): Promise<string> {
    const sessionId = crypto.randomUUID()
    this.#sessions.set(sessionId, {
      sessionId,
      status: 'idle',
    })
    return sessionId
  }

  async closeSession(sessionId: string): Promise<void> {
    this.#sessions.delete(sessionId)
  }

  async send(sessionId: string, input: string): Promise<void> {
    const session = this.#sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    // Update status to processing
    this.#updateStatus(sessionId, 'processing')

    // Simulate typing delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Check if permission request is needed
    if (input.includes('rm') || input.includes('delete')) {
      this.#emit({
        type: 'permission_request',
        sessionId,
        data: {
          id: crypto.randomUUID(),
          type: 'execute',
          resource: input,
          reason: 'Permission required to execute command',
          created_at: Date.now(),
        },
      })
      this.#updateStatus(sessionId, 'waiting_permission')
    } else {
      // Emit text delta
      this.#emit({
        type: 'delta',
        sessionId,
        data: {
          type: 'text',
          content: `Mock response to: ${input}`,
        },
      })

      // Emit turn complete
      this.#emit({
        type: 'turn_complete',
        sessionId,
        data: {
          id: crypto.randomUUID(),
          messages: [],
          created_at: Date.now(),
        },
      })

      this.#updateStatus(sessionId, 'idle')
    }
  }

  async interrupt(_sessionId: string): Promise<void> {
    // Mock implementation - no actual interruption
  }

  async respondPermission(
    _requestId: string,
    _approved: boolean,
    _alwaysPattern?: string
  ): Promise<void> {
    // Mock implementation - just acknowledge
  }

  onEvent(listener: EngineEventListener): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  #emit(event: EngineEvent): void {
    for (const listener of this.#listeners) {
      listener(event)
    }
  }

  #updateStatus(sessionId: string, status: EngineStatus): void {
    const session = this.#sessions.get(sessionId)
    if (session) {
      session.status = status
      this.#emit({
        type: 'status_change',
        sessionId,
        data: { status },
      })
    }
  }
}
