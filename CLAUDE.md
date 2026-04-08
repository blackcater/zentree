# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**Always use `bun` and `bunx`** instead of npm, npx, pnpm, or yarn.

- `bun install` - Install dependencies
- `bun run <script>` - Run a script
- `bunx <package>` - Execute a package (like npx)
- `bun test` - Run tests

## Code Conventions

### Naming Conventions

| Element             | Convention              | Example                   |
| ------------------- | ----------------------- | ------------------------- |
| Directories         | kebab-case              | `file-tree`, `chat-panel` |
| Component files     | PascalCase              | `ThreadCell.tsx`          |
| Hook files          | camelCase, `use` prefix | `useThread.ts`            |
| Hooks               | camelCase, `use` prefix | `useThread()`             |
| Variables/Functions | camelCase               | `threadList`              |
| Types/Classes       | PascalCase              | `ThreadItem`              |
| Constants           | UPPER_SNAKE_CASE        | `MAX_RETRY_COUNT`         |
| Unused params       | `_` prefix              | `_threadId`               |

### TypeScript

- Use `interface` for internal implementation
- Export types for external use
- Path aliases: `@renderer/*` for renderer, `@main/*` for main process
- Private methods/fields use `#` prefix
- Use namespace to organize related types for a class

### React Components

- One component per file
- Props type: `<ComponentName>Props`
- State in atoms, derived data via selectors
- Prefer composition over prop drilling
- Use **TailwindCSS** for styling; avoid raw CSS
- Use **hugeicon** (`@hugeicons/react`) for icons — do not use other icon libraries

### Electron Architecture

- Main process: `apps/desktop/src/main/` — no DOM APIs
- Renderer: `apps/desktop/src/renderer/src/` — no Node.js APIs
- Preload: `apps/desktop/src/preload/` — contextBridge only

### File Organization

- Directory names use kebab-case
- One file should not contain multiple domains
- One method should not have multiple responsibilities
- Organize by feature, not by type
- Private code in `lib/` or `internal/`

### Code Quality

Before every commit, you MUST run:
```bash
bunx tsc --noEmit
bunx oxlint
bunx oxfmt
```
- Use ENGLISH for all code comments
