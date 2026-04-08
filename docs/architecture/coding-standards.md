# Coding Standards

This document provides comprehensive coding standards for the Acme project. It serves as the authoritative guide for both human developers and AI agents working in this codebase.

## Quick Reference

For concise rules optimized for AI consumption, see `CLAUDE.md`.

## Table of Contents

1. [Directory & File Organization](#1-directory--file-organization)
2. [File Naming Conventions](#2-file-naming-conventions)
3. [Naming Conventions](#3-naming-conventions)
4. [TypeScript / Type System](#4-typescript--type-system)
5. [React Component Patterns](#5-react-component-patterns)
6. [Electron Process Architecture](#6-electron-process-architecture)
7. [State Management](#7-state-management)
8. [Error Handling](#8-error-handling)
9. [Code Style](#9-code-style)
10. [Git Commit Conventions](#10-git-commit-conventions)

---

## 1. Directory & File Organization

### Rule

- Directory names use **kebab-case**: `file-tree`, `chat-panel`
- Organize code by **feature**, not by type
- One file should not contain multiple domains
- One method should not have multiple responsibilities
- Private/shared code distinction: `lib/` for internal utilities, shared code goes in `packages/`

### Why

Organizing by feature makes it easier to find related code and understand the system's structure. Type-based organization (`/components`, `/hooks`, `/utils`) leads to deep directories and scattered related code.

### Directory Structure Example

```
apps/desktop/src/
├── main/                    # Electron main process
│   ├── lib/                 # Main process utilities
│   │   ├── store.ts
│   │   ├── logger.ts
│   │   └── i18n.ts
│   ├── services/
│   └── index.ts
├── renderer/src/            # React renderer process
│   ├── features/            # Feature-based modules
│   │   ├── chat/
│   │   │   ├── components/  # Chat feature components
│   │   │   ├── hooks/      # Chat feature hooks
│   │   │   └── atoms/      # Chat feature state
│   │   └── settings/
│   ├── components/          # Shared UI components
│   │   ├── sidebar/
│   │   └── providers/
│   ├── stores/              # Global state (atoms)
│   ├── lib/                 # Shared utilities
│   └── routes/
├── preload/                 # Context bridge
│   ├── expose.ts
│   └── index.ts
└── shared/                  # Shared between processes
    ├── types/
    └── rpc/
```

### Anti-Patterns

```
❌ Bad: Organizing by type
src/
  components/
    Button.tsx
    Modal.tsx
  hooks/
    useTheme.ts
    useAuth.ts
  utils/
    formatDate.ts

✅ Good: Organizing by feature
src/features/
  chat/
    components/Button.tsx
    hooks/useTheme.ts
    utils/formatDate.ts
  auth/
    components/Modal.tsx
    hooks/useAuth.ts
```

---

## 2. File Naming Conventions

### Rule

| File Type              | Convention  | Example              |
| ---------------------- | ----------- | -------------------- |
| Component files        | PascalCase  | `ThreadCell.tsx`     |
| Hook files             | camelCase   | `useThread.ts`       |
| Utility files          | camelCase   | `formatDate.ts`      |
| Type/Interface files   | camelCase   | `types.ts`           |
| Constants files        | camelCase   | `constants.ts`       |
| Configuration files    | kebab-case  | `tsconfig.json`      |
| Test files             | Same as src | `ThreadCell.test.tsx`|

### Why

PascalCase for components makes them easy to distinguish from utilities. Test files mirror the source file name for discoverability.

### Examples

```
✅ Correct
ThreadCell.tsx
useThreadList.ts
formatDate.ts
types.ts
constants.ts

❌ Incorrect
thread_cell.tsx        # kebab-case for component
UseThread.ts          # capital U for hook
threadUtils.ts         # lowercase for utility
```

---

## 3. Naming Conventions

### Rule

| Element             | Convention          | Example                    |
| ------------------- | ------------------- | -------------------------- |
| Components          | PascalCase          | `<ThreadCell />`           |
| Hooks               | camelCase, `use` prefix | `useThread()`          |
| Variables/Functions | camelCase           | `threadList`, `getThread()`|
| Types/Classes       | PascalCase          | `ThreadItem`, `Agent`      |
| Constants           | UPPER_SNAKE_CASE   | `MAX_RETRY_COUNT`          |
| Enum members        | PascalCase          | `ThreadStatus.Active`      |
| Unused params       | `_` prefix          | `_threadId`                |

### Why

These conventions are universal in the TypeScript/React ecosystem. They make code predictable and reduce cognitive load.

### Examples

```typescript
// ✅ Correct
const threadList: ThreadItem[] = [];
function getThread(id: string): ThreadItem { ... }
const MAX_RETRY_COUNT = 3;

// ❌ Incorrect
const thread_list: thread_item[] = [];  // snake_case
function GetThread(id: string) { ... }  // PascalCase function
const maxRetryCount = 3;               // camelCase constant
```

### Unused Parameters

Prefix unused parameters with `_` to indicate intentional unused value:

```typescript
// ✅ Correct
function handleClick(_event: React.MouseEvent, id: string) {
  console.log(id);  // only use id
}

// ❌ Incorrect
function handleClick(event: React.MouseEvent, id: string) {
  console.log(id);  // event is never used but not marked
}
```

---

## 4. TypeScript / Type System

### Rule

- **Strict mode** — no `any`, no implicit returns
- **Prefer `type` over `interface`** for public APIs
- Use `interface` for internal implementation
- Export types for external use
- No `as` type assertions except at boundary layers
- Use `unknown` instead of `any` for truly unknown types

### Why

`type` and `interface` have subtle differences. `type` is more extensible for unions and intersections. `interface` is better for class implementations and has better error messages in some cases. The public/private distinction guides when to use which.

### Examples

```typescript
// ✅ Correct: Public API uses type
export type ThreadListResponse = {
  threads: Thread[];
  total: number;
};

export interface ThreadRepository {
  getById(id: string): Promise<Thread | null>;
  list(): Promise<Thread[]>;
}

// ❌ Incorrect: Using interface for simple unions
export interface ThreadListResponse {
  threads: Thread[];
  total: number;
}
```

### Type vs Interface Decision Tree

```
Is this a class that will be implemented?
  YES → use interface
NO
Is this a simple object shape?
  YES → use type
NO
Is this a union/intersection?
  YES → use type
NO → either is fine, be consistent
```

### Path Aliases

Use path aliases for cleaner imports:

```typescript
// ✅ Correct
import { threadAtom } from '@/stores/atoms';
import { rpcClient } from '@shared/rpc';

// ❌ Incorrect
import { threadAtom } from '../../../../stores/atoms';
```

Configure in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@renderer/*": ["./apps/desktop/src/renderer/src/*"],
      "@main/*": ["./apps/desktop/src/main/*"],
      "@shared/*": ["./apps/desktop/src/shared/*"]
    }
  }
}
```

---

## 5. React Component Patterns

### Rule

- **One component per file**
- **Props type**: `<ComponentName>Props`
- **Styling**: Use **TailwindCSS** utility classes; avoid raw CSS or CSS modules
- **Icons**: Use **hugeicon** (`@hugeicons/react`); do not use other icon libraries
- **Export components** at the bottom of the file or via `index.ts`
- **Prefer composition** over prop drilling
- **Keep components small** — extract logic into hooks

### Why

TailwindCSS provides consistent styling and reduces context-switching between files. hugeicon is the designated icon library for this project, ensuring visual consistency. Small, focused components are easier to test, understand, and reuse.

### Component File Structure

```tsx
// ThreadCell.tsx

import { useCallback } from 'react';
import type { ThreadCellProps } from './ThreadCell.types';
import { useThreadStore } from '@/stores/atoms';
import { ThreadIcon } from '@hugeicons/react';

export function ThreadCell({ threadId, onClick }: ThreadCellProps) {
  const thread = useThreadStore((s) => s.threads[threadId]);

  const handleClick = useCallback(() => {
    onClick?.(threadId);
  }, [threadId, onClick]);

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-neutral-100"
      onClick={handleClick}
    >
      <ThreadIcon className="w-4 h-4 text-neutral-500" />
      <span className="font-medium">{thread.title}</span>
    </div>
  );
}
```

### Props Type Definition

```typescript
// ThreadCell.types.ts
import type { Thread } from '@/types';

export interface ThreadCellProps {
  threadId: string;
  isActive?: boolean;
  onClick?: (threadId: string) => void;
  className?: string;
}
```

### TailwindCSS Usage

```tsx
// ✅ Correct: Using TailwindCSS utility classes
<div className="flex items-center justify-between px-4 py-2 bg-white rounded-lg shadow-sm">

// ❌ Incorrect: Using CSS modules or raw CSS
<div className={styles.container}>
```

### hugeicon Usage

```tsx
// ✅ Correct: Using hugeicon
import { ThreadIcon, FolderIcon, SettingsIcon } from '@hugeicons/react';

// ❌ Incorrect: Using other icon libraries
import { FiSettings } from 'react-icons/fi';
```

### Anti-Patterns

```tsx
// ❌ Bad: Large component with too many responsibilities
function SettingsPage() {
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);
  // ... 500 lines later
}

// ✅ Good: Small components, logic extracted
function SettingsPage() {
  return (
    <div>
      <ThemeSettings />
      <LanguageSettings />
      <NotificationSettings />
    </div>
  );
}
```

---

## 6. Electron Process Architecture

### Rule

- **Main process** (`src/main/`): No DOM APIs, no `document`, no `window`
- **Renderer process** (`src/renderer/src/`): No Node.js APIs, no `require()`
- **Preload** (`src/preload/`): Only `contextBridge` exposure
- **IPC communication**: Use typed channels via `RPC_CHANNELS`
- **No raw `ipcRenderer`/`ipcMain`** in renderer or main directly

### Why

Electron's context isolation and sandbox provide security. Mixing process APIs leads to security vulnerabilities and hard-to-debug issues. Typed IPC channels prevent protocol mismatches.

### Process Boundary Diagram

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Main Process  │         │     Preload     │         │   Renderer      │
│   (src/main/)   │◄───────►│  (src/preload/) │◄───────►│ (src/renderer/) │
│                 │   IPC   │                 │  Bridge  │                 │
│  - Node.js APIs │         │ - contextBridge │         │  - DOM/Web APIs  │
│  - File system  │         │ - typed API     │         │  - React         │
│  - Native libs  │         │   exposure      │         │  - No Node.js!   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### IPC Channel Definition

```typescript
// shared/types/ipc.ts
export const RPC_CHANNELS = {
  thread: {
    CREATE: 'thread:create',
    DELETE: 'thread:delete',
    LIST: 'thread:list',
  },
  window: {
    CLOSE_REQUESTED: 'window:close-requested',
    FOCUS_STATE: 'window:focus-state',
  },
} as const;

export type WindowCloseRequestSource = 'window-button' | 'keyboard-shortcut';
```

### Main Process Handler

```typescript
// main/handlers/thread.ts
import { ipcMain } from 'electron';
import { RPC_CHANNELS } from '@shared/types/ipc';

export function registerThreadHandlers() {
  ipcMain.handle(RPC_CHANNELS.thread.CREATE, async (_event, { title }) => {
    return await threadService.create({ title });
  });
}
```

### Renderer Process Call

```typescript
// renderer/src/lib/rpc/index.ts
export const threadApi = {
  create: (title: string) =>
    window.ipcRenderer.invoke(RPC_CHANNELS.thread.CREATE, { title }),
};
```

### Preload Exposure

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';
import { RPC_CHANNELS } from '../shared/types/ipc';

contextBridge.exposeInMainWorld('electronAPI', {
  thread: {
    create: (title: string) =>
      ipcRenderer.invoke(RPC_CHANNELS.thread.CREATE, { title }),
  },
});
```

### Anti-Patterns

```typescript
// ❌ Bad: Exposing raw ipcRenderer
window.ipcRenderer.send('custom-channel', data);

// ❌ Bad: Using Node.js in renderer
const fs = require('fs');
fs.readFileSync('/path/to/file');

// ❌ Bad: DOM in main process
document.getElementById('root');
```

---

## 7. State Management

### Rule

- **Global state**: Use atoms exported from `stores/atoms/index.ts`
- **Derived state**: Use selectors (jotai's `useAtomValue` with selector)
- **Local state**: Use `useState` for component-only state
- **Server state**: Use React Query or SWR for async data
- **No prop drilling**: Use composition or context for intermediate state

### Why

Centralized state makes debugging easier and ensures consistency. Atoms provide atomic updates preventing partial renders. Selectors prevent unnecessary re-renders.

### Atom Structure

```typescript
// stores/atoms/thread.ts
import { atom } from 'jotai';
import type { Thread } from '@/types';

export interface ThreadState {
  threads: Record<string, Thread>;
  activeThreadId: string | null;
}

export const threadAtom = atom<ThreadState>({
  threads: {},
  activeThreadId: null,
});

// Derived atom for active thread
export const activeThreadAtom = atom((get) => {
  const state = get(threadAtom);
  if (!state.activeThreadId) return null;
  return state.threads[state.activeThreadId] ?? null;
});

// Atom for thread list
export const threadListAtom = atom((get) =>
  Object.values(get(threadAtom).threads)
);
```

### Using Atoms in Components

```tsx
// ✅ Correct
function ThreadList() {
  const threads = useAtomValue(threadListAtom);
  const [activeId, setActiveId] = useAtom(threadAtom);

  return (
    <div>
      {threads.map((thread) => (
        <ThreadCell
          key={thread.id}
          thread={thread}
          isActive={thread.id === activeId}
          onClick={setActiveId}
        />
      ))}
    </div>
  );
}

// ❌ Incorrect: Reading state directly without atom
function ThreadList() {
  const [threads, setThreads] = useState<Thread[]>([]);
  // ... manual state management that should be in an atom
}
```

---

## 8. Error Handling

### Rule

- **Use `Result` type** for operations that can fail: `{ ok: true, value: T } | { ok: false, error: Error }`
- **Never swallow errors**: Always handle or re-throw
- **Log errors** at boundary layers (API calls, IPC handlers)
- **User-friendly messages**: Translate technical errors for UI
- **Typed errors**: Use discriminated unions for error states

### Why

Unhandled errors create silent failures that are hard to debug. Result types make error handling explicit at the call site. Typed errors prevent type-blind catch blocks.

### Result Type Pattern

```typescript
// shared/types/result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

### Using Result Types

```typescript
// ✅ Correct
async function fetchThread(id: string): Promise<Result<Thread>> {
  try {
    const response = await api.get(`/threads/${id}`);
    return ok(response.data);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}

// Usage
const result = await fetchThread('123');
if (result.ok) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

### Error Boundary for React

```tsx
// components/providers/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultError />;
    }
    return this.props.children;
  }
}
```

---

## 9. Code Style

### Rule

- **Linting**: `bunx oxlint` — no lint errors
- **Formatting**: `bunx oxfmt` — consistent formatting
- **Type checking**: `bunx tsc --noEmit` — no type errors
- **Run all three before every commit**

### Why

Automated style enforcement removes bike-shedding discussions and ensures consistency. It catches issues early before they reach code review.

### Pre-Commit Checklist

```bash
# Type check
bunx tsc --noEmit

# Lint
bunx oxlint

# Format
bunx oxfmt
```

### Common Oxfmt Rules

- Single-element arrays that fit on one line: `[{ id: 'a' }]`
- Trailing commas in multi-line arrays/objects
- Single quotes for strings
- No semicolons (or always semicolons — be consistent)

### Comment Style

```typescript
// ✅ Correct: English, clear purpose
/**
 * Creates a new thread with the given title.
 * @param title - The display title for the thread
 * @returns The created thread object
 */
async function createThread(title: string): Promise<Thread> { ... }

// ❌ Incorrect: Chinese comments, vague
// 创建线程
async function createThread(title: string): Promise<Thread> { ... }
```

---

## 10. Git Commit Conventions

### Rule

Format: `<type>(<scope>): <subject>` in English

### Types

| Type      | Description                        |
| --------- | ---------------------------------- |
| `feat`    | New feature                        |
| `fix`     | Bug fix                            |
| `refactor`| Code change that neither fixes nor adds feature |
| `chore`   | Maintenance task                   |
| `docs`    | Documentation change               |
| `test`    | Adding or updating tests           |
| `style`   | Formatting, no code change          |
| `perf`    | Performance improvement             |

### Scope

Use the affected area as scope:
- `chat` — chat feature
- `sidebar` — sidebar component
- `rpc` — RPC system
- `ui` — UI components

### Examples

```
feat(chat): add thread pin functionality
fix(sidebar): prevent collapse on outside click
refactor(rpc): extract HttpRpcRouter from client
docs(readme): update installation instructions
test(chat): add integration tests for thread creation
chore(deps): upgrade jotai to 2.6.0
```

### Anti-Patterns

```
❌ Incorrect
- "Fixed stuff"
- "WIP"
- "asdfgh"
- "[FIX] bug in login"  (different format)

✅ Correct
- fix(auth): handle expired session gracefully
- feat(chat): add markdown support for messages
```

---

## Summary

| Area | Key Rule |
|------|----------|
| Directory Structure | Organize by feature, not type |
| File Names | PascalCase for components, camelCase for utilities |
| Naming | camelCase variables, PascalCase types/components |
| TypeScript | Strict mode, prefer type over interface for public APIs |
| React | One component per file, TailwindCSS for styling, hugeicon for icons |
| Electron | Strict process isolation, typed IPC channels |
| State | Atoms for global state, selectors for derived state |
| Error Handling | Use Result type, never swallow errors |
| Code Style | Run tsc, oxlint, oxfmt before commit |
| Git | `<type>(<scope>): <subject>` format |

---

## References

- [AionUi AGENTS.md](../temp/AionUi/AGENTS.md) — Similar project structure
- [craft-agents-oss architecture](../temp/craft-agents-oss/apps/electron/src/main/) — Electron best practices
- [superset desktop app](../temp/superset/apps/desktop/src/lib/electron-app/) — State management patterns
