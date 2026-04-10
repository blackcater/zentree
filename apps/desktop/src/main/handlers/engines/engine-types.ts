import type { Rpc } from '@/shared/rpc'
import type { Turn, EngineConfig } from '@/shared/types'

export type EngineStatus = 'idle' | 'processing' | 'error' | 'waiting_permission'

export interface EngineState {
  sessionId: string
  status: EngineStatus
  error?: string
  currentTurn?: Turn
}

export interface EngineEvent {
  type: 'status_change' | 'delta' | 'permission_request' | 'turn_complete' | 'error'
  sessionId: string
  data: unknown
}

export type EngineEventListener = (event: EngineEvent) => void

export interface EngineBridge {
  readonly engineType: string
  initialize(config: EngineConfig): Promise<void>
  destroy(): void
  createSession(config: EngineConfig): Promise<string>
  closeSession(sessionId: string): Promise<void>
  send(sessionId: string, input: string): Promise<void>
  interrupt(sessionId: string): Promise<void>
  respondPermission(requestId: string, approved: boolean, alwaysPattern?: string): Promise<void>
  onEvent(listener: EngineEventListener): Rpc.CancelFn
}

export type EngineBridgeClass = new () => EngineBridge
