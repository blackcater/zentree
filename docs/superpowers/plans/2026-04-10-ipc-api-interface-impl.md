# IPC API Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure IPC communication layer with explicit API interfaces per handler.

**Architecture:** Define all API types in `types/api.ts` under `namespace API`. Each handler implements its corresponding API interface. Preload uses `buildCallApi<API.xxxAPI>` instead of `buildCallApi<Handler>`. Schema files are removed, types consolidated in API namespace.

**Tech Stack:** TypeScript, Electron IPC, electron-vite

---

## File Map

| File | Action |
|------|--------|
| `apps/desktop/src/types/api.ts` | Rewrite with all API interfaces |
| `apps/desktop/src/main/handlers/files.ts` | Modify - implement API.FilesAPI |
| `apps/desktop/src/main/handlers/git.ts` | Modify - implement API.GitAPI |
| `apps/desktop/src/main/handlers/browser.ts` | Modify - implement API.BrowserAPI |
| `apps/desktop/src/main/handlers/window.ts` | Create - implement API.WindowAPI |
| `apps/desktop/src/main/handlers/app.ts` | Create - implement API.AppAPI |
| `apps/desktop/src/main/handlers/index.ts` | Modify - register all handlers |
| `apps/desktop/src/main/handlers/system.ts` | Delete |
| `apps/desktop/src/main/handlers/files.schema.ts` | Delete |
| `apps/desktop/src/main/handlers/git.schema.ts` | Delete |
| `apps/desktop/src/preload/expose.ts` | Modify - use API.xxxAPI types |
| `apps/desktop/src/preload/preload.d.ts` | Modify - import API type |

---

## Task 1: Update types/api.ts

**Files:**
- Modify: `apps/desktop/src/types/api.ts:1-189`

- [ ] **Step 1: Write types/api.ts with all API interfaces**

```typescript
/**
 * Central type definitions for all IPC APIs exposed to the renderer.
 * Each API interface represents the public contract of a handler.
 * Handlers must implement their corresponding API interface.
 */

export namespace API {
  // ---------------------------------------------------------------------------
  // Files API - Types
  // ---------------------------------------------------------------------------

  /** Represents a file or directory node. */
  export interface FileNode {
    name: string
    path: string
    type: 'file' | 'directory'
    extension?: string
  }

  /** Search result for file queries. */
  export interface SearchResult {
    name: string
    path: string
    type: 'file' | 'directory'
  }

  /**
   * File system operations for browsing and searching files.
   */
  export interface FilesAPI {
    list(dirPath: string): Promise<{ files: FileNode[]; error?: string }>
    search(query: string, rootPath: string): Promise<{
      results: SearchResult[]
      skippedCount: number
    }>
  }

  // ---------------------------------------------------------------------------
  // Git API - Types
  // ---------------------------------------------------------------------------

  /** Git repository status. */
  export interface GitStatus {
    current: string | null
    tracking: string | null
    staged: string[]
    unstaged: string[]
    untracked: string[]
    conflicted: string[]
  }

  /** Git branch information. */
  export interface GitBranch {
    name: string
    current: boolean
  }

  /** Git log entry. */
  export interface GitLogEntry {
    hash: string
    date: string
    message: string
    author_name: string
    author_email: string
  }

  /**
   * Git version control operations.
   */
  export interface GitAPI {
    status(repoPath: string): Promise<GitStatus>
    branches(repoPath: string): Promise<GitBranch[]>
    currentBranch(repoPath: string): Promise<string>
    log(repoPath: string, count?: number): Promise<GitLogEntry[]>
    diffStat(repoPath: string): Promise<{ additions: number; deletions: number }>
    stage(repoPath: string, files: string[]): Promise<void>
    unstage(repoPath: string, files: string[]): Promise<void>
    stageAll(repoPath: string): Promise<void>
    unstageAll(repoPath: string): Promise<void>
    discard(repoPath: string, files: string[]): Promise<void>
    commit(repoPath: string, message: string): Promise<{ hash: string }>
    checkout(repoPath: string, branch: string): Promise<{ success: boolean }>
    createBranch(repoPath: string, name: string): Promise<void>
    push(repoPath: string): Promise<{ success: boolean; message?: string }>
    pull(repoPath: string): Promise<{ success: boolean; message?: string }>
    fetch(repoPath: string): Promise<void>
    generateCommitMessage(repoPath: string): Promise<string>
  }

  // ---------------------------------------------------------------------------
  // Browser API - Types
  // ---------------------------------------------------------------------------

  /** Information about a browser instance. */
  export interface BrowserInfo {
    id: string
    title: string
    url: string
    canGoBack: boolean
    canGoForward: boolean
  }

  /**
   * Browser view management for embedded web content.
   */
  export interface BrowserAPI {
    create(url?: string, options?: { width?: number; height?: number }): Promise<{ id: string }>
    destroy(id: string): Promise<void>
    list(): Promise<BrowserInfo[]>
    navigate(id: string, url: string): Promise<void>
    goBack(id: string): Promise<void>
    goForward(id: string): Promise<void>
    reload(id: string): Promise<void>
    stop(id: string): Promise<void>
    focus(id: string): Promise<void>
    screenshot(id: string): Promise<string>
    getAccessibilitySnapshot(id: string): Promise<Record<string, unknown> | null>
    clickElement(id: string, selector: string): Promise<void>
    fillElement(id: string, selector: string, value: string): Promise<void>
    selectOption(id: string, selector: string, value: string): Promise<void>
  }

  // ---------------------------------------------------------------------------
  // Window API
  // ---------------------------------------------------------------------------

  /**
   * Window lifecycle management.
   */
  export interface WindowAPI {
    createVault(vaultId: string): Promise<{ ok: boolean }>
    createPopup(threadId: string): Promise<{ ok: boolean }>
    close(windowName: string): Promise<{ ok: boolean }>
  }

  // ---------------------------------------------------------------------------
  // App API
  // ---------------------------------------------------------------------------

  /**
   * Application-level settings and state management.
   */
  export interface AppAPI {
    getLocale(): Promise<string>
    setLocale(locale: string): Promise<{ ok: boolean }>
    getBoolValue(key: 'firstLaunchDone'): Promise<boolean>
    setBoolValue(key: 'firstLaunchDone', value: boolean): Promise<void>
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/types/api.ts
git commit -m "feat(api): define all IPC API interfaces in namespace API"
```

---

## Task 2: Update FilesHandler

**Files:**
- Modify: `apps/desktop/src/main/handlers/files.ts`
- Delete: `apps/desktop/src/main/handlers/files.schema.ts` (deferred until end)

- [ ] **Step 1: Update FilesHandler to import from types/api.ts**

Replace the import at the top of `files.ts`:
```typescript
// Remove: import type { FileNode, SearchResult } from './files.schema'
import type { API } from '@/types/api'
```

- [ ] **Step 2: Add implements clause**

Change class declaration:
```typescript
export class FilesHandler implements API.FilesAPI {
```

- [ ] **Step 3: Update return type in list() method**

Change:
```typescript
// From:
Promise<{ files: FileNode[]; error?: string }>

// To:
Promise<{ files: API.FileNode[]; error?: string }>
```

- [ ] **Step 4: Update return type in search() method**

Change:
```typescript
// From:
Promise<{ results: SearchResult[]; skippedCount: number }>

// To:
Promise<{ results: API.SearchResult[]; skippedCount: number }>
```

- [ ] **Step 5: Update internal FileNode type usages in list()**

Inside the `list` method, the `files.map()` creates `FileNode` objects. Update to:
```typescript
const files: API.FileNode[] = entries.map((entry): API.FileNode => {
```

- [ ] **Step 6: Update internal SearchResult type usages in search()**

Inside the `search` method, update:
```typescript
const results: API.SearchResult[] = []
```

And when pushing results:
```typescript
results.push({
  name: entry.name,
  path: fullPath,
  type: entry.isDirectory() ? 'directory' : 'file',
})
```

- [ ] **Step 7: Run type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No errors in files.ts

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/main/handlers/files.ts
git commit -m "feat(files): implement API.FilesAPI interface"
```

---

## Task 3: Update GitHandler

**Files:**
- Modify: `apps/desktop/src/main/handlers/git.ts`
- Delete: `apps/desktop/src/main/handlers/git.schema.ts` (deferred until end)

- [ ] **Step 1: Update GitHandler to import from types/api.ts**

Replace the import at the top of `git.ts`:
```typescript
// Remove: import type { GitStatus, GitBranch, GitLogEntry } from './git.schema'
import type { API } from '@/types/api'
```

- [ ] **Step 2: Add implements clause**

Change class declaration:
```typescript
export class GitHandler implements API.GitAPI {
```

- [ ] **Step 3: Update return type in status()**

Change:
```typescript
// From:
Promise<GitStatus>

// To:
Promise<API.GitStatus>
```

- [ ] **Step 4: Update return type in branches()**

Change:
```typescript
// From:
Promise<GitBranch[]>

// To:
Promise<API.GitBranch[]>
```

- [ ] **Step 5: Update return type in log()**

Change:
```typescript
// From:
Promise<GitLogEntry[]>

// To:
Promise<API.GitLogEntry[]>
```

- [ ] **Step 6: Update internal type usages in status()**

Inside the `status` method, update the return object type:
```typescript
return {
  current: result.current,
  tracking: result.tracking,
  staged: result.staged,
  unstaged: result.modified,
  untracked: result.not_added,
  conflicted: result.conflicted,
} as API.GitStatus
```

Similarly update `branches()` and `log()` return types.

- [ ] **Step 7: Run type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No errors in git.ts

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/main/handlers/git.ts
git commit -m "feat(git): implement API.GitAPI interface"
```

---

## Task 4: Update BrowserHandler

**Files:**
- Modify: `apps/desktop/src/main/handlers/browser.ts`

- [ ] **Step 1: Update BrowserHandler to import from types/api.ts**

Add import at the top:
```typescript
import type { API } from '@/types/api'
```

- [ ] **Step 2: Remove local BrowserInfo interface**

Remove the local `export interface BrowserInfo` definition (it's now in API namespace).

- [ ] **Step 3: Add implements clause**

Change class declaration:
```typescript
export class BrowserHandler implements API.BrowserAPI {
```

- [ ] **Step 4: Update return type in list()**

Change:
```typescript
// From:
async list(): Promise<BrowserInfo[]> {

// To:
async list(): Promise<API.BrowserInfo[]> {
```

- [ ] **Step 5: Run type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No errors in browser.ts

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/main/handlers/browser.ts
git commit -m "feat(browser): implement API.BrowserAPI interface"
```

---

## Task 5: Create WindowHandler

**Files:**
- Create: `apps/desktop/src/main/handlers/window.ts`

- [ ] **Step 1: Create WindowHandler**

```typescript
import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'

import type { API } from '@/types/api'
import { WindowManager } from '../services'

/**
 * Window lifecycle management.
 * Implements the WindowAPI interface.
 */
export class WindowHandler implements API.WindowAPI {
  readonly #windowManager: WindowManager

  constructor() {
    this.#windowManager = Container.inject(WindowManager)
  }

  async createVault(vaultId: string): Promise<{ ok: boolean }> {
    this.#windowManager.createVaultWindow(vaultId)
    this.#windowManager.closeWindow('welcome')
    return { ok: true }
  }

  async createPopup(threadId: string): Promise<{ ok: boolean }> {
    this.#windowManager.createChatPopupWindow(threadId)
    return { ok: true }
  }

  async close(windowName: string): Promise<{ ok: boolean }> {
    this.#windowManager.closeWindow(windowName)
    return { ok: true }
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  static registerHandlers(): void {
    const server = Container.inject(ElectronRpcServer)
    const router = server.router('window')
    const handler = new WindowHandler()

    router.handle('create-vault', (vaultId) => handler.createVault(vaultId))
    router.handle('create-popup', (threadId) => handler.createPopup(threadId))
    router.handle('close', (windowName) => handler.close(windowName))
  }
}
```

- [ ] **Step 2: Run type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No errors in window.ts

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/handlers/window.ts
git commit -m "feat(window): add WindowHandler implementing API.WindowAPI"
```

---

## Task 6: Create AppHandler

**Files:**
- Create: `apps/desktop/src/main/handlers/app.ts`

- [ ] **Step 1: Create AppHandler**

```typescript
import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'

import type { API } from '@/types/api'
import { store } from '../lib/store'

/**
 * Application-level settings and state management.
 * Implements the AppAPI interface.
 */
export class AppHandler implements API.AppAPI {
  async getLocale(): Promise<string> {
    return store.get('locale') as string
  }

  async setLocale(locale: string): Promise<{ ok: boolean }> {
    store.set('locale', locale)
    return { ok: true }
  }

  async getBoolValue(key: 'firstLaunchDone'): Promise<boolean> {
    return store.get(key)
  }

  async setBoolValue(key: 'firstLaunchDone', value: boolean): Promise<void> {
    store.set(key, value)
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  static registerHandlers(): void {
    const server = Container.inject(ElectronRpcServer)
    const router = server.router('app')
    const handler = new AppHandler()

    router.handle('getLocale', () => handler.getLocale())
    router.handle('setLocale', (locale) => handler.setLocale(locale))
    router.handle('getBoolValue', (key) => handler.getBoolValue(key as 'firstLaunchDone'))
    router.handle('setBoolValue', (key, value) => handler.setBoolValue(key as 'firstLaunchDone', value))
  }
}
```

- [ ] **Step 2: Run type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No errors in app.ts

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/main/handlers/app.ts
git commit -m "feat(app): add AppHandler implementing API.AppAPI"
```

---

## Task 7: Update handlers/index.ts

**Files:**
- Modify: `apps/desktop/src/main/handlers/index.ts`

- [ ] **Step 1: Update imports and register all handlers**

```typescript
import { AppHandler } from './app'
import { BrowserHandler } from './browser'
import { FilesHandler } from './files'
import { GitHandler } from './git'
import { WindowHandler } from './window'

export function registerHandlers() {
  AppHandler.registerHandlers()
  FilesHandler.registerHandlers()
  GitHandler.registerHandlers()
  BrowserHandler.registerHandlers()
  WindowHandler.registerHandlers()
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/main/handlers/index.ts
git commit -m "refactor(handlers): register all handlers including new WindowHandler and AppHandler"
```

---

## Task 8: Update preload/expose.ts

**Files:**
- Modify: `apps/desktop/src/preload/expose.ts`

- [ ] **Step 1: Update imports**

Change from:
```typescript
import type { BrowserHandler } from '@main/handlers/browser'
import type { FilesHandler } from '@main/handlers/files'
import type { GitHandler } from '@main/handlers/git'
```

To:
```typescript
import type { API } from '@/types/api'
```

Also update the buildCallApi calls to use API types:
```typescript
import { buildCallApi, createRpc } from './utils'
```

- [ ] **Step 2: Update the api object**

Change from:
```typescript
const api: API = {
  files: buildCallApi<FilesHandler>('files', ['list', 'search'], rpc),
  git: buildCallApi<GitHandler>('git', [...], rpc),
  browser: buildCallApi<BrowserHandler>('browser', [...], rpc),
  store: { ... },
  ...
}
```

To:
```typescript
const api: API = {
  files: buildCallApi<API.FilesAPI>('files', ['list', 'search'], rpc),
  git: buildCallApi<API.GitAPI>('git', [
    'status', 'branches', 'currentBranch', 'log', 'diffStat',
    'stage', 'unstage', 'stageAll', 'unstageAll', 'discard',
    'commit', 'checkout', 'createBranch', 'push', 'pull', 'fetch',
    'generateCommitMessage',
  ], rpc),
  browser: buildCallApi<API.BrowserAPI>('browser', [
    'create', 'destroy', 'list', 'navigate', 'goBack', 'goForward',
    'reload', 'stop', 'focus', 'screenshot', 'getAccessibilitySnapshot',
    'clickElement', 'fillElement', 'selectOption',
  ], rpc),
  window: buildCallApi<API.WindowAPI>('window', [
    'createVault', 'createPopup', 'close',
  ], rpc),
  app: buildCallApi<API.AppAPI>('app', [
    'getLocale', 'setLocale', 'getBoolValue', 'setBoolValue',
  ], rpc),
  rpc,
}
```

Note: The `store` property is removed since it's now part of `app`. Update any code that uses `api.store` to use `api.app` instead.

- [ ] **Step 3: Run type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No errors. If `api.store` is used elsewhere, those files need updating.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/preload/expose.ts
git commit -m "refactor(preload): use API.xxxAPI types instead of Handler types"
```

---

## Task 9: Update preload/preload.d.ts

**Files:**
- Modify: `apps/desktop/src/preload/preload.d.ts`

- [ ] **Step 1: Update preload.d.ts**

```typescript
import type { RpcClient } from '@/shared/rpc'
import type { AppInfo } from '@/types'
import type { API } from './types/api'

export type { API }

declare global {
  interface Window {
    api: API
    __appInfo: AppInfo
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/preload/preload.d.ts
git commit -m "refactor(preload.d.ts): import API type from types/api"
```

---

## Task 10: Delete obsolete files

**Files:**
- Delete: `apps/desktop/src/main/handlers/system.ts`
- Delete: `apps/desktop/src/main/handlers/files.schema.ts`
- Delete: `apps/desktop/src/main/handlers/git.schema.ts`

- [ ] **Step 1: Delete obsolete files**

```bash
rm apps/desktop/src/main/handlers/system.ts
rm apps/desktop/src/main/handlers/files.schema.ts
rm apps/desktop/src/main/handlers/git.schema.ts
```

- [ ] **Step 2: Run type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No errors. All references should now use types/api.ts.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove obsolete system.ts and schema files
- system.ts replaced by WindowHandler and AppHandler
- files.schema.ts and git.schema.ts types moved to namespace API"
```

---

## Task 11: Final verification

**Files:**
- All modified files

- [ ] **Step 1: Run full type check**

```bash
cd apps/desktop && bunx tsc --noEmit
```

Expected: No TypeScript errors across the entire desktop app.

- [ ] **Step 2: Run linter**

```bash
cd apps/desktop && bunx oxlint && bunx oxfmt
```

Expected: No linting errors.

- [ ] **Step 3: Verify desktop app builds**

```bash
cd apps/desktop && bun run build
```

Expected: Build completes successfully.

---

## Spec Coverage Check

| Spec Requirement | Task |
|-------------------|------|
| All API types in namespace API | Task 1 |
| FilesHandler implements FilesAPI | Task 2 |
| GitHandler implements GitAPI | Task 3 |
| BrowserHandler implements BrowserAPI | Task 4 |
| WindowHandler implements WindowAPI | Task 5 |
| AppHandler implements AppAPI | Task 6 |
| Preload uses buildCallApi<API.xxxAPI> | Task 8 |
| Schema files removed | Task 10 |
| system.ts split | Tasks 5, 6, 10 |

All spec requirements covered.
