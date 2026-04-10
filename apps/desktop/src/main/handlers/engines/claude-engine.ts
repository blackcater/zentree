import type { Rpc } from '@/shared/rpc'
import type { EngineConfig } from '@/shared/types'
import type {
  EngineBridge,
  EngineEvent,
  EngineEventListener,
  EngineState,
  EngineStatus,
} from './engine-types'

export class ClaudeEngine implements EngineBridge {
  readonly engineType = 'claude'

  #listeners = new Set<EngineEventListener>()
  #sessions = new Map<string, EngineState>()

  async initialize(_config: EngineConfig): Promise<void> {
    // TODO: Initialize Claude CLI connection
  }

  destroy(): void {
    // TODO: Clean up Claude CLI connection
    this.#listeners.clear()
    this.#sessions.clear()
  }

  async createSession(_config: EngineConfig): Promise<string> {
    // TODO: Create a new Claude CLI session
    const sessionId = crypto.randomUUID()
    this.#sessions.set(sessionId, {
      sessionId,
      status: 'idle',
    })
    return sessionId
  }

  async closeSession(sessionId: string): Promise<void> {
    // TODO: Close the Claude CLI session
    this.#sessions.delete(sessionId)
  }

  async send(sessionId: string, _input: string): Promise<void> {
    // TODO: Send input to Claude CLI
    const session = this.#sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    this.#updateStatus(sessionId, 'processing')
  }

  async interrupt(_sessionId: string): Promise<void> {
    // TODO: Interrupt the current Claude CLI operation
  }

  async respondPermission(
    _requestId: string,
    _approved: boolean,
    _alwaysPattern?: string
  ): Promise<void> {
    // TODO: Respond to permission request from Claude CLI
  }

  onEvent(listener: EngineEventListener): Rpc.CancelFn {
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
