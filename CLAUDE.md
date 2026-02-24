# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CodeScope is a monorepo project built with Turborepo, containing a desktop application (Electron) and VSCode extension.

## Common Commands

```bash
# Install dependencies
pnpm install

# Run desktop app in development mode
pnpm dev:desktop

# Run tests
pnpm test

# Build all packages and apps
turbo run build

# Run tests for a specific package
cd packages/utils && pnpm test
```

## Project Structure

```
apps/
  desktop/          # Electron desktop app (main)
  vscode-ext/       # VSCode extension (in development)

packages/
  types/            # TypeScript type definitions
  ui/               # React UI component library (shadcn/ui based)
  utils/            # Utility functions
  tsconfig/        # Shared TypeScript configurations
```

## Architecture

- **Desktop App**: Uses electron-vite with React, Vite 7, and Tailwind CSS v4
- **UI Library**: Built with Base UI, Tailwind CSS v4, Lucide icons, exports components/hooks/utils
- **Library Bundling**: Uses tsdown (Rolldown-based) for packages
- **Code Quality**: Uses oxfmt (formatting) and oxlint (linting)
- **Testing**: Vitest with workspace projects config

## Key Files

- `turbo.json` - Turborepo pipeline configuration
- `vitest.config.ts` - Test configuration (workspace-based)
- `.oxfmtrc.json` - Code formatting rules
- `apps/desktop/electron.vite.config.ts` - Electron + Vite config

## Tech Stack

- **Runtime**: Electron 40, Node.js 24
- **Frontend**: React 19, TypeScript 5.9
- **Build**: Vite 7, electron-vite 5, tsdown
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest 4
