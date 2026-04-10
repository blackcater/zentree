export type {
  EngineStatus,
  EngineState,
  EngineEvent,
  EngineEventListener,
  EngineBridge,
  EngineBridgeClass,
} from './engine-types'

import { MockEngine } from './engine-bridge'
import type { EngineBridgeClass } from './engine-types'

export { MockEngine }

export const engineRegistry = new Map<string, EngineBridgeClass>()

export function registerEngine(type: string, cls: EngineBridgeClass): void {
  engineRegistry.set(type, cls)
}

export function registerBuiltinEngines(): void {
  registerEngine('mock', MockEngine)
}
