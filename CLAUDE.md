# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

**Always use `bun` and `bunx`** instead of npm, npx, pnpm, or yarn.

- `bun install` - Install dependencies
- `bun run <script>` - Run a script
- `bunx <package>` - Execute a package (like npx)
- `bun test` - Run tests

## Code Conventions

- Private methods/fields use `#` prefix
- Use namespace to organize related types for a class
- Directory names use kebab-case
- One file should not contain multiple domains
- One method should not have multiple responsibilities
- Before commit code, you MUST use `bunx tsc --noEmit`, `bunx oxlint` and `bunx oxfmt` to lint and format code
- Use ENGLISH for code comments
