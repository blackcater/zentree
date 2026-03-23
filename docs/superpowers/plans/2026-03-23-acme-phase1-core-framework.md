# Acme Phase 1: Core Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core framework for Acme - Electron app with IPC infrastructure, AgentRuntime, and basic UI shell matching the design spec.

**Architecture:** Main process runs AgentRuntime manager; each Code Agent runs as a child process. Renderer communicates via MessageChannel-based IPC. Data stored in JSONL format in `~/.acme/vaults/`.

**Tech Stack:** Electron 40, React 19, TypeScript, TanStack Router, Tailwind CSS v4, Zod, node-pty

---

## File Structure

```
apps/desktop/src/
├── main/
│   ├── index.ts                    # Main entry, initialize router
│   ├── ipc/
│   │   ├── router.ts               # MessageChannelRouter
│   │   ├── handlers/
│   │   │   ├── agent.ts            # Agent IPC handlers
│   │   │   ├── vault.ts            # Vault IPC handlers
│   │   │   └── thread.ts           # Thread IPC handlers
│   │   └── index.ts                # Export handlers
│   └── services/
│       └── WindowManager.ts        # Existing window manager
├── preload/
│   └── index.ts                    # MessageChannel + expose api
├── shared/
│   └── ipc/
│       ├── contracts.ts            # Zod schemas
│       └── types.ts                # Shared types
└── renderer/
    └── src/
        ├── api.ts                   # Type-safe API wrapper
        ├── routes/
        │   ├── __root.tsx          # Root layout
        │   ├── chat.tsx            # Chat view
        │   └── index.tsx           # Redirect to /chat
        └── components/
            ├── sidebar/
            │   ├── VaultSelector.tsx
            │   ├── ProjectTree.tsx
            │   └── ThreadItem.tsx
            ├── chat/
            │   ├── ChatHeader.tsx
            │   ├── ChatMessages.tsx
            │   └── ChatInput.tsx
            └── toolbar/
                └── Toolbar.tsx

packages/runtime/src/
├── index.ts                        # Runtime exports
├── lib/
│   └── logger.ts                   # Shared logger
├── AgentRuntime.ts                 # AgentRuntime class
├── CodeAgentProcess.ts             # Child process management
└── stores/
    ├── ThreadStore.ts             # Thread metadata
    ├── MessageStore.ts            # JSONL message storage
    └── FolderStore.ts             # Folder (thread grouping)
```

---

## Tasks

### Task 1: IPC Contracts and Types

**Files:**
- Create: `apps/desktop/src/shared/ipc/types.ts`
- Create: `apps/desktop/src/shared/ipc/contracts.ts`
- Create: `apps/desktop/src/shared/ipc/index.ts`

- [ ] **Step 1: Create shared IPC types**

```typescript
// apps/desktop/src/shared/ipc/types.ts
import { z } from 'zod'

export const VaultSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  createdAt: z.string(),
})

export const ProjectSchema = z.object({
  id: z.string(),
  vaultId: z.string(),
  name: z.string(),
  path: z.string(),
  createdAt: z.string(),
})

export const ThreadSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  folderId: z.string().optional(),
  agentId: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const MessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: z.enum(['user', 'agent']),
  content: z.string(),
  timestamp: z.string(),
})

export const AgentConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['claude-code', 'codex', 'acmex']),
  name: z.string(),
  config: z.record(z.unknown()),
})

export type Vault = z.infer<typeof VaultSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Thread = z.infer<typeof ThreadSchema>
export type Message = z.infer<typeof MessageSchema>
export type AgentConfig = z.infer<typeof AgentConfigSchema>
```

- [ ] **Step 2: Create IPC contracts**

```typescript
// apps/desktop/src/shared/ipc/contracts.ts
import { z } from 'zod'
import { VaultSchema, ProjectSchema, ThreadSchema, MessageSchema } from './types'

export const vaultContracts = {
  list: {
    input: z.undefined(),
    output: z.array(VaultSchema),
  },
  create: {
    input: z.object({ name: z.string(), path: z.string() }),
    output: VaultSchema,
  },
  get: {
    input: z.object({ vaultId: z.string() }),
    output: VaultSchema,
  },
}

export const projectContracts = {
  list: {
    input: z.object({ vaultId: z.string() }),
    output: z.array(ProjectSchema),
  },
  create: {
    input: z.object({ vaultId: z.string(), name: z.string(), path: z.string() }),
    output: ProjectSchema,
  },
}

export const threadContracts = {
  list: {
    input: z.object({ projectId: z.string() }),
    output: z.array(ThreadSchema),
  },
  create: {
    input: z.object({ projectId: z.string(), agentId: z.string(), title: z.string(), folderId: z.string().optional() }),
    output: ThreadSchema,
  },
  get: {
    input: z.object({ threadId: z.string() }),
    output: ThreadSchema,
  },
  delete: {
    input: z.object({ threadId: z.string() }),
    output: z.boolean(),
  },
}

export const messageContracts = {
  list: {
    input: z.object({ threadId: z.string(), limit: z.number().optional() }),
    output: z.array(MessageSchema),
  },
  send: {
    input: z.object({ threadId: z.string(), content: z.string() }),
    output: MessageSchema,
  },
}

export const agentContracts = {
  start: {
    input: z.object({ agentId: z.string(), threadId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  stop: {
    input: z.object({ agentId: z.string() }),
    output: z.object({ success: z.boolean() }),
  },
  getStatus: {
    input: z.undefined(),
    output: z.object({
      running: z.array(z.string()),
      available: z.array(z.string()),
    }),
  },
}
```

- [ ] **Step 3: Create index export**

```typescript
// apps/desktop/src/shared/ipc/index.ts
export * from './types'
export * from './contracts'
```

---

### Task 2: MessageChannelRouter

**Files:**
- Create: `apps/desktop/src/main/ipc/router.ts`
- Create: `apps/desktop/src/main/ipc/index.ts`

- [ ] **Step 1: Create MessageChannelRouter**

```typescript
// apps/desktop/src/main/ipc/router.ts
import { ipcMain, BrowserWindow, MessageChannelMain } from 'electron'
import { log } from '../lib/logger'

type Handler = (input: unknown, windowId: string) => Promise<unknown> | unknown

interface Contract {
  input: unknown
  output: unknown
}

class MessageChannelRouter {
  private handlers = new Map<string, Handler>()
  private ports = new Map<string, Electron.MessagePortMain>()
  private windowIds = new Map<Electron.MessagePortMain, string>()

  register<TInput, TOutput>(
    channel: string,
    handler: (input: TInput, windowId: string) => Promise<TOutput>
  ) {
    this.handlers.set(channel, handler as Handler)
    log.info(`[Router] Registered handler for channel: ${channel}`)
  }

  setupWindow(window: BrowserWindow) {
    const { port1, port2 } = new MessageChannelMain()

    const windowId = `window_${Date.now()}_${Math.random().toString(36).slice(2)}`
    this.ports.set(windowId, port1)
    this.windowIds.set(port1, windowId)

    port1.start()
    port1.on('message', async (event) => {
      const { id, channel, data } = event.data
      const handler = this.handlers.get(channel)

      if (!handler) {
        log.warn(`[Router] No handler for channel: ${channel}`)
        port1.postMessage({ id, error: 'Handler not found' })
        return
      }

      try {
        const result = await handler(data, windowId)
        port1.postMessage({ id, result })
      } catch (error) {
        log.error(`[Router] Handler error for ${channel}:`, error)
        port1.postMessage({ id, error: String(error) })
      }
    })

    window.webContents.postMessage('port', null, [port2])
    log.info(`[Router] Setup MessageChannel for ${windowId}`)
    return windowId
  }

  sendToWindow(windowId: string, channel: string, data: unknown) {
    const port = this.ports.get(windowId)
    if (port) {
      port.postMessage({ channel, data })
    }
  }

  removeWindow(windowId: string) {
    const port = this.ports.get(windowId)
    if (port) {
      this.windowIds.delete(port)
      port.close()
      this.ports.delete(windowId)
    }
  }
}

export const router = new MessageChannelRouter()
```

- [ ] **Step 2: Create handlers index**

```typescript
// apps/desktop/src/main/ipc/index.ts
export { router } from './router'
```

---

### Task 3: AgentRuntime Core

**Files:**
- Create: `packages/runtime/src/index.ts`
- Create: `packages/runtime/src/AgentRuntime.ts`
- Create: `packages/runtime/src/CodeAgentProcess.ts`
- Create: `packages/runtime/src/stores/ThreadStore.ts`
- Create: `packages/runtime/src/stores/MessageStore.ts`

- [ ] **Step 1: Create ThreadStore**

```typescript
// packages/runtime/src/stores/ThreadStore.ts
import * as fs from 'fs'
import * as path from 'path'
import { z } from 'zod'
import type { Thread } from '../types'

const ThreadConfigSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  folderId: z.string().optional(),
  agentId: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export class ThreadStore {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
  }

  private getThreadPath(threadId: string): string {
    return path.join(this.basePath, 'threads', threadId, 'config.json')
  }

  private getMessagesPath(threadId: string): string {
    return path.join(this.basePath, 'threads', threadId, 'messages.jsonl')
  }

  async create(data: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>): Promise<Thread> {
    const thread: Thread = {
      ...data,
      id: `thread_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const threadDir = path.join(this.basePath, 'threads', thread.id)
    fs.mkdirSync(threadDir, { recursive: true })
    fs.writeFileSync(this.getThreadPath(thread.id), JSON.stringify(thread, null, 2))
    fs.writeFileSync(this.getMessagesPath(thread.id), '')

    return thread
  }

  async get(threadId: string): Promise<Thread | null> {
    const configPath = this.getThreadPath(threadId)
    if (!fs.existsSync(configPath)) return null

    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return ThreadConfigSchema.parse(data)
  }

  async listByProject(projectId: string): Promise<Thread[]> {
    const threadsDir = path.join(this.basePath, 'threads')
    if (!fs.existsSync(threadsDir)) return []

    const threads: Thread[] = []
    for (const dir of fs.readdirSync(threadsDir)) {
      const configPath = path.join(threadsDir, dir, 'config.json')
      if (fs.existsSync(configPath)) {
        const thread = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        if (thread.projectId === projectId) {
          threads.push(ThreadConfigSchema.parse(thread))
        }
      }
    }
    return threads
  }

  async delete(threadId: string): Promise<boolean> {
    const threadDir = path.join(this.basePath, 'threads', threadId)
    if (fs.existsSync(threadDir)) {
      fs.rmSync(threadDir, { recursive: true })
      return true
    }
    return false
  }
}
```

- [ ] **Step 2: Create runtime types**

```typescript
// packages/runtime/src/types.ts
export interface Vault {
  id: string
  name: string
  path: string
  createdAt: string
}

export interface Project {
  id: string
  vaultId: string
  name: string
  path: string
  createdAt: string
}

export interface Folder {
  id: string
  projectId: string
  name: string
  createdAt: string
}

export interface Thread {
  id: string
  projectId: string
  folderId?: string
  agentId: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  threadId: string
  role: 'user' | 'agent'
  content: string
  timestamp: string
}
```

- [ ] **Step 3: Create runtime logger**

```typescript
// packages/runtime/src/lib/logger.ts
const isDev = process.env.NODE_ENV !== 'production'

export const log = {
  info: (...args: unknown[]) => {
    if (isDev) console.log('[Runtime]', ...args)
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[Runtime]', ...args)
  },
  error: (...args: unknown[]) => {
    console.error('[Runtime]', ...args)
  },
}
```

- [ ] **Step 4: Create MessageStore**

```typescript
// packages/runtime/src/stores/MessageStore.ts
import * as fs from 'fs'
import * as path from 'path'
import type { Message } from '../types'

const MessageSchema = z.object({
  id: z.string(),
  threadId: z.string(),
  role: z.enum(['user', 'agent']),
  content: z.string(),
  timestamp: z.string(),
})

export class MessageStore {
  constructor(private basePath: string) {}

  private getMessagesPath(threadId: string): string {
    return path.join(this.basePath, 'threads', threadId, 'messages.jsonl')
  }

  async append(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    const fullMessage: Message = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
    }

    const messagesPath = this.getMessagesPath(message.threadId)
    const line = JSON.stringify(fullMessage) + '\n'
    fs.appendFileSync(messagesPath, line)

    return fullMessage
  }

  async list(threadId: string, limit?: number): Promise<Message[]> {
    const messagesPath = this.getMessagesPath(threadId)
    if (!fs.existsSync(messagesPath)) return []

    const content = fs.readFileSync(messagesPath, 'utf-8')
    const lines = content.split('\n').filter(Boolean)

    const messages = lines.map(line => MessageSchema.parse(JSON.parse(line)))

    if (limit) {
      return messages.slice(-limit)
    }
    return messages
  }
}
```

- [ ] **Step 3: Create CodeAgentProcess**

```typescript
// packages/runtime/src/CodeAgentProcess.ts
import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { log } from './lib/logger'

export interface AgentProcessOptions {
  type: 'claude-code' | 'codex' | 'acmex'
  workingDirectory?: string
}

export class CodeAgentProcess extends EventEmitter {
  private process: ChildProcess | null = null
  private readonly options: AgentProcessOptions

  constructor(options: AgentProcessOptions) {
    super()
    this.options = options
  }

  start(): void {
    if (this.process) {
      log.warn(`[AgentProcess] Process already running for ${this.options.type}`)
      return
    }

    // TODO: Launch actual agent process based on type
    // For now, this is a placeholder
    log.info(`[AgentProcess] Starting ${this.options.type} in ${this.options.workingDirectory}`)

    // Placeholder: spawn a dummy process
    this.process = spawn('echo', ['Agent running...'], {
      cwd: this.options.workingDirectory,
    })

    this.process.stdout?.on('data', (data) => {
      this.emit('output', data.toString())
    })

    this.process.stderr?.on('data', (data) => {
      this.emit('error', data.toString())
    })

    this.process.on('exit', (code) => {
      log.info(`[AgentProcess] ${this.options.type} exited with code ${code}`)
      this.process = null
      this.emit('exit', code)
    })
  }

  sendMessage(content: string): void {
    if (!this.process) {
      this.emit('error', 'Process not running')
      return
    }
    // TODO: Send message to agent process
    this.emit('output', `Agent received: ${content}`)
  }

  stop(): void {
    if (this.process) {
      this.process.kill()
      this.process = null
    }
  }

  isRunning(): boolean {
    return this.process !== null
  }
}
```

- [ ] **Step 4: Create AgentRuntime**

```typescript
// packages/runtime/src/AgentRuntime.ts
import { EventEmitter } from 'events'
import { CodeAgentProcess, AgentProcessOptions } from './CodeAgentProcess'
import { ThreadStore } from './stores/ThreadStore'
import { MessageStore } from './stores/MessageStore'
import { FolderStore } from './stores/FolderStore'
import { log } from './lib/logger'

export class AgentRuntime extends EventEmitter {
  private agents = new Map<string, CodeAgentProcess>()
  private threadStores = new Map<string, ThreadStore>()
  private messageStores = new Map<string, MessageStore>()
  private folderStores = new Map<string, FolderStore>()
  private threadAgentMap = new Map<string, string>() // threadId -> agentId

  constructor() {
    super()
    log.info('[AgentRuntime] Initialized')
  }

  getOrCreateThreadStore(vaultPath: string): ThreadStore {
    if (!this.threadStores.has(vaultPath)) {
      this.threadStores.set(vaultPath, new ThreadStore(vaultPath))
    }
    return this.threadStores.get(vaultPath)!
  }

  getOrCreateMessageStore(vaultPath: string): MessageStore {
    if (!this.messageStores.has(vaultPath)) {
      this.messageStores.set(vaultPath, new MessageStore(vaultPath))
    }
    return this.messageStores.get(vaultPath)!
  }

  async startAgent(agentId: string, threadId: string, options: AgentProcessOptions): Promise<boolean> {
    try {
      if (this.agents.has(agentId)) {
        log.warn(`[AgentRuntime] Agent ${agentId} already running`)
        return true
      }

      const agent = new CodeAgentProcess(options)
      this.agents.set(agentId, agent)
      this.threadAgentMap.set(threadId, agentId)

      agent.on('output', (data) => {
        this.emit('agent:output', { agentId, data })
      })

      agent.on('error', (error) => {
        this.emit('agent:error', { agentId, error })
      })

      agent.on('exit', (code) => {
        this.agents.delete(agentId)
        this.threadAgentMap.delete(threadId)
        this.emit('agent:exit', { agentId, code })
      })

      agent.start()
      log.info(`[AgentRuntime] Started agent ${agentId} for thread ${threadId}`)
      return true
    } catch (error) {
      log.error(`[AgentRuntime] Failed to start agent ${agentId}:`, error)
      return false
    }
  }

  async stopAgent(agentId: string): Promise<boolean> {
    const agent = this.agents.get(agentId)
    if (!agent) {
      return false
    }

    agent.stop()
    return true
  }

  async sendMessage(threadId: string, content: string): Promise<string | null> {
    const agentId = this.threadAgentMap.get(threadId)
    if (!agentId) {
      log.warn(`[AgentRuntime] No agent running for thread ${threadId}`)
      return null
    }

    const agent = this.agents.get(agentId)
    if (!agent) {
      return null
    }

    agent.sendMessage(content)
    return `msg_${Date.now()}`
  }

  getStatus(): { running: string[]; available: string[] } {
    return {
      running: Array.from(this.agents.keys()),
      available: ['claude-code', 'codex', 'acmex'],
    }
  }
}
```

- [ ] **Step 5: Create FolderStore**

```typescript
// packages/runtime/src/stores/FolderStore.ts
import * as fs from 'fs'
import * as path from 'path'
import type { Folder } from '../types'
import { z } from 'zod'

const FolderConfigSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  createdAt: z.string(),
})

export class FolderStore {
  private basePath: string

  constructor(basePath: string) {
    this.basePath = basePath
  }

  private getFolderPath(folderId: string): string {
    return path.join(this.basePath, 'folders', folderId, 'config.json')
  }

  async create(data: Omit<Folder, 'id' | 'createdAt'>): Promise<Folder> {
    const folder: Folder = {
      ...data,
      id: `folder_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
    }

    const folderDir = path.join(this.basePath, 'folders', folder.id)
    fs.mkdirSync(folderDir, { recursive: true })
    fs.writeFileSync(this.getFolderPath(folder.id), JSON.stringify(folder, null, 2))

    return folder
  }

  async get(folderId: string): Promise<Folder | null> {
    const configPath = this.getFolderPath(folderId)
    if (!fs.existsSync(configPath)) return null

    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
    return FolderConfigSchema.parse(data)
  }

  async listByProject(projectId: string): Promise<Folder[]> {
    const foldersDir = path.join(this.basePath, 'folders')
    if (!fs.existsSync(foldersDir)) return []

    const folders: Folder[] = []
    for (const dir of fs.readdirSync(foldersDir)) {
      const configPath = path.join(foldersDir, dir, 'config.json')
      if (fs.existsSync(configPath)) {
        const folder = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        if (folder.projectId === projectId) {
          folders.push(FolderConfigSchema.parse(folder))
        }
      }
    }
    return folders
  }

  async delete(folderId: string): Promise<boolean> {
    const folderDir = path.join(this.basePath, 'folders', folderId)
    if (fs.existsSync(folderDir)) {
      fs.rmSync(folderDir, { recursive: true })
      return true
    }
    return false
  }
}
```

- [ ] **Step 6: Export runtime package**

```typescript
// packages/runtime/src/index.ts
export { AgentRuntime } from './AgentRuntime'
export { CodeAgentProcess } from './CodeAgentProcess'
export { ThreadStore } from './stores/ThreadStore'
export { MessageStore } from './stores/MessageStore'
export { FolderStore } from './stores/FolderStore'

export type { AgentProcessOptions } from './CodeAgentProcess'
export type { Vault, Project, Folder, Thread, Message } from './types'
```

---

### Task 4: IPC Handlers

**Files:**
- Create: `apps/desktop/src/main/ipc/handlers/agent.ts`
- Create: `apps/desktop/src/main/ipc/handlers/vault.ts`
- Create: `apps/desktop/src/main/ipc/handlers/thread.ts`

- [ ] **Step 1: Create agent handlers**

```typescript
// apps/desktop/src/main/ipc/handlers/agent.ts
import { router } from '../router'
import { agentContracts } from '@acme-ai-desktop/shared/ipc'
import { AgentRuntime } from '@acme-ai/runtime'

let agentRuntime: AgentRuntime | null = null

export function initAgentHandlers(runtime: AgentRuntime) {
  agentRuntime = runtime

  router.register('agent:start', async (input) => {
    const { agentId, threadId } = agentContracts.start.input.parse(input)
    const success = await agentRuntime!.startAgent(agentId, threadId, {
      type: agentId as 'claude-code' | 'codex' | 'acmex',
    })
    return { success }
  })

  router.register('agent:stop', async (input) => {
    const { agentId } = agentContracts.stop.input.parse(input)
    const success = await agentRuntime!.stopAgent(agentId)
    return { success }
  })

  router.register('agent:status', async () => {
    return agentRuntime!.getStatus()
  })

  router.register('agent:send', async (input) => {
    const { threadId, content } = input as { threadId: string; content: string }
    const messageId = await agentRuntime!.sendMessage(threadId, content)
    return { messageId }
  })

  log.info('[AgentHandlers] Initialized')
}
```

- [ ] **Step 2: Create vault handlers**

```typescript
// apps/desktop/src/main/ipc/handlers/vault.ts
import { router } from '../router'
import { vaultContracts, projectContracts, threadContracts, messageContracts } from '@acme-ai-desktop/shared/ipc'
import * as fs from 'fs'
import * as path from 'path'

const VAULT_BASE = path.join(process.env.HOME || '', '.acme', 'vaults')

export function initVaultHandlers() {
  // Vault handlers
  router.register('vault:list', async () => {
    if (!fs.existsSync(VAULT_BASE)) {
      return []
    }
    const vaults = []
    for (const dir of fs.readdirSync(VAULT_BASE)) {
      const configPath = path.join(VAULT_BASE, dir, 'config.json')
      if (fs.existsSync(configPath)) {
        vaults.push(JSON.parse(fs.readFileSync(configPath, 'utf-8')))
      }
    }
    return vaults
  })

  router.register('vault:create', async (input) => {
    const { name, vaultPath } = vaultContracts.create.input.parse(input)
    const vaultId = `vault_${Date.now()}`
    const vaultDir = path.join(VAULT_BASE, vaultId)

    fs.mkdirSync(vaultDir, { recursive: true })
    fs.mkdirSync(path.join(vaultDir, 'projects'), { recursive: true })

    const vault = {
      id: vaultId,
      name,
      path: vaultPath || vaultDir,
      createdAt: new Date().toISOString(),
    }

    fs.writeFileSync(path.join(vaultDir, 'config.json'), JSON.stringify(vault, null, 2))
    return vault
  })

  // Project handlers
  router.register('project:list', async (input) => {
    const { vaultId } = projectContracts.list.input.parse(input)
    const projectsDir = path.join(VAULT_BASE, vaultId, 'projects')

    if (!fs.existsSync(projectsDir)) {
      return []
    }

    const projects = []
    for (const dir of fs.readdirSync(projectsDir)) {
      const configPath = path.join(projectsDir, dir, 'config.json')
      if (fs.existsSync(configPath)) {
        projects.push(JSON.parse(fs.readFileSync(configPath, 'utf-8')))
      }
    }
    return projects
  })

  // Thread handlers
  router.register('thread:list', async (input) => {
    const { projectId } = threadContracts.list.input.parse(input)
    // Implementation would use ThreadStore
    return []
  })

  router.register('thread:create', async (input) => {
    const { projectId, agentId, title, folderId } = threadContracts.create.input.parse(input)
    const threadId = `thread_${Date.now()}`
    const threadDir = path.join(VAULT_BASE, 'projects', projectId, 'threads', threadId)

    fs.mkdirSync(threadDir, { recursive: true })

    const thread = {
      id: threadId,
      projectId,
      folderId,
      agentId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    fs.writeFileSync(path.join(threadDir, 'config.json'), JSON.stringify(thread, null, 2))
    fs.writeFileSync(path.join(threadDir, 'messages.jsonl'), '')

    return thread
  })

  log.info('[VaultHandlers] Initialized')
}
```

- [ ] **Step 3: Create thread handlers**

```typescript
// apps/desktop/src/main/ipc/handlers/thread.ts
import { router } from '../router'
import { threadContracts, messageContracts } from '@acme-ai-desktop/shared/ipc'
import * as fs from 'fs'
import * as path from 'path'

const VAULT_BASE = path.join(process.env.HOME || '', '.acme', 'vaults')

export function initThreadHandlers() {
  router.register('thread:list', async (input) => {
    const { projectId } = threadContracts.list.input.parse(input)
    const threadsDir = path.join(VAULT_BASE, 'projects', projectId, 'threads')

    if (!fs.existsSync(threadsDir)) {
      return []
    }

    const threads = []
    for (const dir of fs.readdirSync(threadsDir)) {
      const configPath = path.join(threadsDir, dir, 'config.json')
      if (fs.existsSync(configPath)) {
        threads.push(JSON.parse(fs.readFileSync(configPath, 'utf-8')))
      }
    }
    return threads
  })

  router.register('thread:create', async (input) => {
    const { projectId, agentId, title, folderId } = threadContracts.create.input.parse(input)
    const threadId = `thread_${Date.now()}`
    const threadDir = path.join(VAULT_BASE, 'projects', projectId, 'threads', threadId)

    fs.mkdirSync(threadDir, { recursive: true })

    const thread = {
      id: threadId,
      projectId,
      folderId,
      agentId,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    fs.writeFileSync(path.join(threadDir, 'config.json'), JSON.stringify(thread, null, 2))
    fs.writeFileSync(path.join(threadDir, 'messages.jsonl'), '')

    return thread
  })

  router.register('thread:get', async (input) => {
    const { threadId } = threadContracts.get.input.parse(input)
    const configPath = path.join(VAULT_BASE, 'threads', threadId, 'config.json')
    if (!fs.existsSync(configPath)) {
      return null
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'))
  })

  router.register('thread:delete', async (input) => {
    const { threadId } = threadContracts.delete.input.parse(input)
    const threadDir = path.join(VAULT_BASE, 'threads', threadId)
    if (fs.existsSync(threadDir)) {
      fs.rmSync(threadDir, { recursive: true })
      return true
    }
    return false
  })

  router.register('message:list', async (input) => {
    const { threadId, limit } = messageContracts.list.input.parse(input)
    const messagesPath = path.join(VAULT_BASE, 'threads', threadId, 'messages.jsonl')

    if (!fs.existsSync(messagesPath)) {
      return []
    }

    const content = fs.readFileSync(messagesPath, 'utf-8')
    const lines = content.split('\n').filter(Boolean)
    const messages = lines.map(line => JSON.parse(line))

    return limit ? messages.slice(-limit) : messages
  })

  router.register('message:send', async (input) => {
    const { threadId, content } = messageContracts.send.input.parse(input)
    const messageId = `msg_${Date.now()}`
    const messagesPath = path.join(VAULT_BASE, 'threads', threadId, 'messages.jsonl')

    const message = {
      id: messageId,
      threadId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    fs.appendFileSync(messagesPath, JSON.stringify(message) + '\n')
    return message
  })

  log.info('[ThreadHandlers] Initialized')
}
```

---

### Task 5: Preload API

**Files:**
- Modify: `apps/desktop/src/preload/index.ts`

- [ ] **Step 1: Update preload to use MessageChannel**

```typescript
// apps/desktop/src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron'

let port: MessagePort | null = null
let pendingRequests = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

// Setup MessageChannel connection
ipcRenderer.on('port', (event) => {
  port = event.ports[0]
  port.onmessage = (event) => {
    const { id, result, error } = event.data
    const pending = pendingRequests.get(id)
    if (pending) {
      if (error) {
        pending.reject(new Error(error))
      } else {
        pending.resolve(result)
      }
      pendingRequests.delete(id)
    }
  }
  port.start()
})

const api = {
  invoke: async <T>(channel: string, data?: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!port) {
        reject(new Error('Not connected'))
        return
      }

      const id = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
      pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject })

      port.postMessage({ id, channel, data })
    })
  },

  send: (channel: string, data?: unknown): void => {
    if (port) {
      port.postMessage({ channel, data })
    }
  },

  on: (channel: string, handler: (data: unknown) => void): (() => void) => {
    const listener = (event: MessageEvent) => {
      if (event.data.channel === channel) {
        handler(event.data.data)
      }
    }
    port?.addEventListener('message', listener)
    return () => port?.removeEventListener('message', listener)
  },
}

contextBridge.exposeInMainWorld('api', api)

// Type declaration
export type Api = typeof api
```

---

### Task 6: UI Components

**Files:**
- Modify: `apps/desktop/src/renderer/src/routes/__root.tsx`
- Create: `apps/desktop/src/renderer/src/components/sidebar/VaultSelector.tsx`
- Create: `apps/desktop/src/renderer/src/components/sidebar/ProjectTree.tsx`
- Create: `apps/desktop/src/renderer/src/components/sidebar/ThreadItem.tsx`
- Create: `apps/desktop/src/renderer/src/components/chat/ChatHeader.tsx`
- Create: `apps/desktop/src/renderer/src/components/chat/ChatMessages.tsx`
- Create: `apps/desktop/src/renderer/src/components/chat/ChatInput.tsx`
- Create: `apps/desktop/src/renderer/src/components/toolbar/Toolbar.tsx`

- [ ] **Step 1: Create VaultSelector component**

```typescript
// apps/desktop/src/renderer/src/components/sidebar/VaultSelector.tsx
import { useState, useEffect } from 'react'

interface Vault {
  id: string
  name: string
}

interface VaultSelectorProps {
  onSelect?: (vaultId: string) => void
}

export function VaultSelector({ onSelect }: VaultSelectorProps) {
  const [vaults, setVaults] = useState<Vault[]>([])
  const [selected, setSelected] = useState<Vault | null>(null)

  useEffect(() => {
    window.api.invoke<Vault[]>('vault:list').then(setVaults)
  }, [])

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
      <div className="text-xs px-1.5 py-0.5 bg-violet-500 text-white rounded font-semibold">
        VAULT
      </div>
      <select
        className="flex-1 text-sm bg-transparent border-none outline-none"
        value={selected?.id || ''}
        onChange={(e) => {
          const vault = vaults.find(v => v.id === e.target.value)
          setSelected(vault || null)
          onSelect?.(e.target.value)
        }}
      >
        <option value="">{vaults.length > 0 ? '选择 Vault' : '无 Vault'}</option>
        {vaults.map(vault => (
          <option key={vault.id} value={vault.id}>{vault.name}</option>
        ))}
      </select>
    </div>
  )
}
```

- [ ] **Step 2: Create ThreadItem component**

```typescript
// apps/desktop/src/renderer/src/components/sidebar/ThreadItem.tsx
import { Thread } from '@acme-ai-desktop/shared/ipc'

interface ThreadItemProps {
  thread: Thread
  isActive?: boolean
  onClick?: () => void
}

export function ThreadItem({ thread, isActive, onClick }: ThreadItemProps) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm ${
        isActive ? 'bg-blue-100' : 'hover:bg-gray-100'
      }`}
      onClick={onClick}
    >
      <span className="text-gray-400 text-xs">💬</span>
      <span className="text-gray-800 truncate">{thread.title}</span>
    </div>
  )
}
```

- [ ] **Step 3: Create ProjectTree component**

```typescript
// apps/desktop/src/renderer/src/components/sidebar/ProjectTree.tsx
import { useState, useEffect } from 'react'
import { Project, Thread } from '@acme-ai-desktop/shared/ipc'
import { ThreadItem } from './ThreadItem'

interface ProjectTreeProps {
  vaultId: string
  onSelectThread: (thread: Thread) => void
  selectedThreadId?: string
}

export function ProjectTree({ vaultId, onSelectThread, selectedThreadId }: ProjectTreeProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [threads, setThreads] = useState<Record<string, Thread[]>>({})
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (vaultId) {
      window.api.invoke<Project[]>('project:list', { vaultId }).then(setProjects)
    }
  }, [vaultId])

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
      // Load threads for project
      if (!threads[projectId]) {
        window.api.invoke<Thread[]>('thread:list', { projectId }).then((data) => {
          setThreads(prev => ({ ...prev, [projectId]: data }))
        })
      }
    }
    setExpandedProjects(newExpanded)
  }

  return (
    <div className="flex-1 overflow-y-auto py-2">
      {projects.map(project => (
        <div key={project.id}>
          <div
            className="flex items-center gap-1 px-2 py-1.5 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => toggleProject(project.id)}
          >
            <span className="text-gray-400">{expandedProjects.has(project.id) ? '📂' : '📁'}</span>
            <span>{project.name}</span>
          </div>

          {expandedProjects.has(project.id) && threads[project.id] && (
            <div className="pl-4">
              {threads[project.id].map(thread => (
                <ThreadItem
                  key={thread.id}
                  thread={thread}
                  isActive={thread.id === selectedThreadId}
                  onClick={() => onSelectThread(thread)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create ChatHeader component**

```typescript
// apps/desktop/src/renderer/src/components/chat/ChatHeader.tsx
import { Thread, AgentConfig } from '@acme-ai-desktop/shared/ipc'

interface ChatHeaderProps {
  thread: Thread
  agent?: AgentConfig
  onStop?: () => void
}

export function ChatHeader({ thread, agent, onStop }: ChatHeaderProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200">
      <span className="font-semibold text-gray-900">{thread.title}</span>
      {agent && (
        <span className="text-xs px-2 py-0.5 bg-emerald-500 text-white rounded font-medium">
          {agent.name}
        </span>
      )}
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          运行中
        </div>
        <button
          className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={onStop}
        >
          停止
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create ChatMessages component**

```typescript
// apps/desktop/src/renderer/src/components/chat/ChatMessages.tsx
import { useEffect, useRef } from 'react'
import { Message } from '@acme-ai-desktop/shared/ipc'

interface ChatMessagesProps {
  messages: Message[]
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
      {messages.map(message => (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[70%] ${
              message.role === 'user'
                ? 'bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-3'
                : 'bg-green-50 border border-green-200 text-gray-800 rounded-2xl rounded-bl-sm px-4 py-3'
            }`}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
            <div
              className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100 text-right' : 'text-gray-400'
              }`}
            >
              {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Create ChatInput component**

```typescript
// apps/desktop/src/renderer/src/components/chat/ChatInput.tsx
import { useState } from 'react'

interface ChatInputProps {
  onSend: (content: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (value.trim() && !disabled) {
      onSend(value.trim())
      setValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-gray-50">
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="输入消息... (输入 / 打开命令面板)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={disabled || !value.trim()}
        >
          发送
        </button>
      </div>
    </form>
  )
}
```

- [ ] **Step 7: Create Toolbar component**

```typescript
// apps/desktop/src/renderer/src/components/toolbar/Toolbar.tsx
import { useState } from 'react'

type Tool = 'files' | 'git' | 'browser' | 'preview' | 'settings'

interface ToolbarProps {
  activeTool?: Tool
  onToolChange?: (tool: Tool) => void
}

const tools: { id: Tool; icon: string; title: string }[] = [
  { id: 'files', icon: '📁', title: '文件浏览器' },
  { id: 'git', icon: '⎇', title: 'Git' },
  { id: 'browser', icon: '🌐', title: '浏览器' },
  { id: 'preview', icon: '👁', title: '预览' },
  { id: 'settings', icon: '⚙', title: '设置' },
]

export function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="w-12 bg-gray-800 flex flex-col py-2">
      <div className="flex-1 flex flex-col gap-1 items-center pt-2">
        {tools.slice(0, 4).map(tool => (
          <button
            key={tool.id}
            title={tool.title}
            className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
              activeTool === tool.id
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            onClick={() => onToolChange?.(tool.id)}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-1 items-center pb-2">
        <button
          key={tools[4].id}
          title={tools[4].title}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
            activeTool === tools[4].id
              ? 'bg-blue-500 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          onClick={() => onToolChange?.(tools[4].id)}
        >
          {tools[4].icon}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Update root layout**

```typescript
// apps/desktop/src/renderer/src/routes/__root.tsx
import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { VaultSelector } from './components/sidebar/VaultSelector'
import { ProjectTree } from './components/sidebar/ProjectTree'
import { Toolbar } from './components/toolbar/Toolbar'

export default function RootLayout() {
  const [vaultId, setVaultId] = useState<string>('')

  return (
    <div className="flex h-screen bg-white">
      {/* Left Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        <VaultSelector onSelect={(id) => setVaultId(id)} />
        <ProjectTree vaultId={vaultId} onSelectThread={(t) => console.log(t)} />
        <div className="p-2.5 border-t border-gray-200">
          <button className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600">
            + 新建线程
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>

      {/* Right Toolbar */}
      <Toolbar />
    </div>
  )
}
```

- [ ] **Step 9: Update chat route**

```typescript
// apps/desktop/src/renderer/src/routes/chat.tsx
import { useState, useEffect } from 'react'
import { ChatHeader } from '../components/chat/ChatHeader'
import { ChatMessages } from '../components/chat/ChatMessages'
import { ChatInput } from '../components/chat/ChatInput'
import { Message } from '@acme-ai-desktop/shared/ipc'

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const handleSend = async (content: string) => {
    // Send message
    const result = await window.api.invoke<{ messageId: string }>('agent:send', {
      threadId: 'current', // TODO: get from context
      content,
    })
    console.log('Message sent:', result)
  }

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        thread={{ id: '1', title: '新对话', agentId: 'claude-code', projectId: '', createdAt: '', updatedAt: '' }}
        onStop={() => setIsRunning(false)}
      />
      <ChatMessages messages={messages} />
      <ChatInput onSend={handleSend} disabled={!isRunning} />
    </div>
  )
}
```

---

### Task 7: Main Process Integration

**Files:**
- Modify: `apps/desktop/src/main/index.ts`

- [ ] **Step 1: Update main process to initialize IPC router and AgentRuntime**

```typescript
// apps/desktop/src/main/index.ts
import { app } from 'electron'
import { electronApp, is, platform } from '@electron-toolkit/utils'
import { log, mainLog } from './lib/logger'
import { WindowManager } from './services/WindowManager'
import { router } from './ipc/router'
import { initAgentHandlers } from './ipc/handlers/agent'
import { initVaultHandlers } from './ipc/handlers/vault'
import { AgentRuntime } from '@acme-ai/runtime'

log.initialize()

let windowManager: WindowManager | null = null
let agentRuntime: AgentRuntime | null = null

app.on('open-url', (event, url) => {
  event.preventDefault()
  mainLog.info('Received deeplink:', url)
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('dev.blackcater.acme')

  if (platform.isMacOS && app.dock && is.dev) {
    // app.dock.setIcon(icon)
  }

  // Initialize AgentRuntime
  agentRuntime = new AgentRuntime()

  // Initialize IPC handlers
  initVaultHandlers()
  initAgentHandlers(agentRuntime)

  // Initialize WindowManager
  windowManager = new WindowManager()
})

app.on('window-all-closed', () => {
  app.quit()
})
```

---

## Verification

After completing all tasks, verify:

1. **Build succeeds**: `bun run --filter @acme-ai-app/desktop build`
2. **Typecheck passes**: `bunx tsc --noEmit -p apps/desktop/tsconfig.json`
3. **App launches**: `bun run dev:desktop` and verify:
   - Window opens without errors
   - Console shows "[Router] Initialized"
   - Console shows "[AgentRuntime] Initialized"
