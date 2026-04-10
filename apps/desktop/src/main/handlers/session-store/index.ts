import { Container } from '@/shared/di'

import type { SessionStore } from './session-store'
import { JsonlSessionStore } from './jsonl-session-store'

// Token for SessionStore DI
export const SESSION_STORE_TOKEN = Container.createToken<SessionStore>('SessionStore')

// Register SessionStore as singleton
Container.singleton(SESSION_STORE_TOKEN, () => new JsonlSessionStore())

// Export interface and implementation
export type { SessionStore }
export { JsonlSessionStore }
