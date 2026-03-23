# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Acme is a local-first multi-agent collaboration desktop application, similar to Codex App. It supports multiple code agents (Claude Code, Codex, Acme Code, ACP-compatible) running in parallel with multi-vault project management.

## Build Commands

```bash
# Install dependencies
bun install

# Development
bun run dev:desktop        # Start Electron desktop app with hot reload
bun run dev:web            # Start Next.js web app

# Build
bun run build              # Build all packages (runs lint + clean first via turbo)
bun run build --filter='@acme-ai/runtime'   # Build specific package

# Desktop app builds
cd apps/desktop && bun run build            # Full desktop build
bun run build:mac                           # macOS .app
bun run build:win                           # Windows .exe
bun run build:linux                         # Linux AppImage

# Type checking
cd apps/desktop && bun run typecheck        # Desktop app only

# Testing
bun test                        # Run all tests
bun test packages/runtime        # Run tests for specific package
bun test --watch                # Watch mode

# Linting (uses oxlint)
bun run lint
```

## Architecture

### Monorepo Structure

```
apps/
  desktop/     - Electron desktop app (electron-vite + React + Tailwind)
  web/         - Next.js marketing/info site
  console/     - Next.js admin console
  viewer/      - Next.js viewer app
  api-server/  - Bun/Elysia API server
  cli/         - CLI tool

packages/
  core/        - Domain interfaces and types (IAgent, IChannel, IVault, etc.)
  agent/       - Agent implementations (ClaudeCodeAgent, CodexAgent, AcmexAgent)
  runtime/     - AgentRuntime orchestrator + Skills/Commands/Plugins/MCP runners
  acp/         - Agent Client Protocol SDK integration
  ui/          - Shared React UI components (shadcn, radix, tailwind)
  schemas/     - Zod validation schemas
  shared/      - Shared utilities
```

### Core Abstractions

**Domain Interfaces** (`packages/core/src/`):
- `IAgent` - Agent lifecycle (start, stop, sendMessage, onEvent)
- `IChannel` - Communication channel between agents
- `IVault` - Project/vault container
- `IThread` - Conversation thread
- `ILLM`, `IProvider` - LLM provider abstraction
- `IMCP` - MCP server integration
- `ISkill`, `ITool` - Extensibility interfaces

**Runtime** (`packages/runtime/src/runtime/AgentRuntime`):
The central orchestrator that:
- Manages registered agents and threads
- Loads Skills, Commands, Plugins, and MCP servers from `~/.acme/`
- Provides event-driven communication between components

**Agent Implementations** (`packages/agent/src/`):
- `ClaudeCodeAgent` - Integrates via `@anthropic-ai/claude-agent-sdk`
- `CodexAgent` - Integrates via `@openai/agents`
- `AcmexAgent` - Custom Acme agent implementation

### Key Technologies

- **Runtime**: Bun (package manager + runtime)
- **Desktop**: Electron + electron-vite + Vite 7
- **Web Apps**: Next.js 16 + React 19 + Tailwind 4
- **State**: TanStack Query, Jotai, TanStack Router
- **UI**: shadcn/ui, Radix UI, Tailwind CSS
- **API**: Elysia (Bun-native)
- **Build**: Turbo + bun workspaces

## Code Conventions

- Use `bun` and `bunx` (not npm, pnpm, etc.)
- Prefix private members with `_` (e.g., `_config`, `_started`)
- Group related types in `namespace` (e.g., class + associated types)
- Filenames: kebab-case (e.g., `agent-base.ts`, `claude-code-agent.ts`)
- One domain per file - avoid mixing unrelated concepts
- One responsibility per method - keep methods focused
- After editing: run `oxlint`, `oxfmt`, and `tsc --noEmit` to validate

## Important Patterns

### Adding New Agents

1. Create agent class extending `AgentBase` in `packages/agent/src/<agent-name>/`
2. Implement `sendMessage(content: string): Promise<void>`
3. Register in `packages/agent/src/index.ts`
4. The AgentRuntime can then instantiate and manage the agent

### Runtime Extension Points

The runtime loads extensions from `~/.acme/` directories:
- `skills/` - Skill implementations
- `commands/` - CLI command extensions
- `plugins/` - Plugin modules
- MCP servers are configured via global settings

### Type Safety

Uses Zod v4 for runtime validation and TypeScript for compile-time types. Core domain types are in `packages/core` and shared across all packages.
