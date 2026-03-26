# Development Guide

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/actions/setup-node-env/action.yml](.github/actions/setup-node-env/action.yml)
- [.github/actions/setup-pnpm-store-cache/action.yml](.github/actions/setup-pnpm-store-cache/action.yml)
- [.github/workflows/auto-response.yml](.github/workflows/auto-response.yml)
- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [.github/workflows/codeql.yml](.github/workflows/codeql.yml)
- [.github/workflows/docker-release.yml](.github/workflows/docker-release.yml)
- [.github/workflows/install-smoke.yml](.github/workflows/install-smoke.yml)
- [.github/workflows/labeler.yml](.github/workflows/labeler.yml)
- [.github/workflows/openclaw-npm-release.yml](.github/workflows/openclaw-npm-release.yml)
- [.github/workflows/sandbox-common-smoke.yml](.github/workflows/sandbox-common-smoke.yml)
- [.github/workflows/stale.yml](.github/workflows/stale.yml)
- [.github/workflows/workflow-sanity.yml](.github/workflows/workflow-sanity.yml)
- [AGENTS.md](AGENTS.md)
- [docs/channels/irc.md](docs/channels/irc.md)
- [docs/ci.md](docs/ci.md)
- [docs/help/testing.md](docs/help/testing.md)
- [docs/providers/venice.md](docs/providers/venice.md)
- [docs/reference/RELEASING.md](docs/reference/RELEASING.md)
- [docs/reference/test.md](docs/reference/test.md)
- [docs/tools/creating-skills.md](docs/tools/creating-skills.md)
- [scripts/ci-changed-scope.mjs](scripts/ci-changed-scope.mjs)
- [scripts/docker/install-sh-common/cli-verify.sh](scripts/docker/install-sh-common/cli-verify.sh)
- [scripts/docker/install-sh-common/version-parse.sh](scripts/docker/install-sh-common/version-parse.sh)
- [scripts/docker/install-sh-nonroot/run.sh](scripts/docker/install-sh-nonroot/run.sh)
- [scripts/docker/install-sh-smoke/run.sh](scripts/docker/install-sh-smoke/run.sh)
- [scripts/e2e/parallels-macos-smoke.sh](scripts/e2e/parallels-macos-smoke.sh)
- [scripts/e2e/parallels-windows-smoke.sh](scripts/e2e/parallels-windows-smoke.sh)
- [scripts/sync-labels.ts](scripts/sync-labels.ts)
- [scripts/test-install-sh-docker.sh](scripts/test-install-sh-docker.sh)
- [scripts/test-parallel.mjs](scripts/test-parallel.mjs)
- [src/agents/model-tool-support.test.ts](src/agents/model-tool-support.test.ts)
- [src/agents/model-tool-support.ts](src/agents/model-tool-support.ts)
- [src/agents/venice-models.test.ts](src/agents/venice-models.test.ts)
- [src/agents/venice-models.ts](src/agents/venice-models.ts)
- [src/cli/program/help.test.ts](src/cli/program/help.test.ts)
- [src/gateway/hooks-test-helpers.ts](src/gateway/hooks-test-helpers.ts)
- [src/scripts/ci-changed-scope.test.ts](src/scripts/ci-changed-scope.test.ts)
- [src/shared/config-ui-hints-types.ts](src/shared/config-ui-hints-types.ts)
- [test/setup.ts](test/setup.ts)
- [test/test-env.ts](test/test-env.ts)
- [ui/src/ui/controllers/nodes.ts](ui/src/ui/controllers/nodes.ts)
- [ui/src/ui/controllers/skills.ts](ui/src/ui/controllers/skills.ts)
- [ui/src/ui/views/agents-panels-status-files.ts](ui/src/ui/views/agents-panels-status-files.ts)
- [ui/src/ui/views/agents-panels-tools-skills.ts](ui/src/ui/views/agents-panels-tools-skills.ts)
- [ui/src/ui/views/agents-utils.test.ts](ui/src/ui/views/agents-utils.test.ts)
- [ui/src/ui/views/agents-utils.ts](ui/src/ui/views/agents-utils.ts)
- [ui/src/ui/views/agents.ts](ui/src/ui/views/agents.ts)
- [ui/src/ui/views/channel-config-extras.ts](ui/src/ui/views/channel-config-extras.ts)
- [ui/src/ui/views/chat.test.ts](ui/src/ui/views/chat.test.ts)
- [ui/src/ui/views/login-gate.ts](ui/src/ui/views/login-gate.ts)
- [ui/src/ui/views/skills.ts](ui/src/ui/views/skills.ts)
- [vitest.channels.config.ts](vitest.channels.config.ts)
- [vitest.config.ts](vitest.config.ts)
- [vitest.e2e.config.ts](vitest.e2e.config.ts)
- [vitest.extensions.config.ts](vitest.extensions.config.ts)
- [vitest.gateway.config.ts](vitest.gateway.config.ts)
- [vitest.live.config.ts](vitest.live.config.ts)
- [vitest.scoped-config.ts](vitest.scoped-config.ts)
- [vitest.unit.config.ts](vitest.unit.config.ts)

</details>

This page covers the contributor and maintainer workflow for the OpenClaw monorepo: repository structure, toolchain setup, coding conventions, testing, commit and PR conventions, and local development commands. For CI/CD pipeline details see page [8.1](#8.1). For release steps see page [8.2](#8.2).

---

## Repository Structure

OpenClaw uses **pnpm workspaces** to organize a TypeScript-first monorepo. The table below maps the top-level directories to their roles.

| Directory                                           | Role                                       |
| --------------------------------------------------- | ------------------------------------------ |
| `src/`                                              | Core Gateway, CLI, agents, channels, infra |
| `src/cli/`                                          | CLI command wiring                         |
| `src/commands/`                                     | Individual CLI commands                    |
| `src/gateway/`                                      | GatewayServer, protocol, server methods    |
| `src/agents/`                                       | Agent runtime, tools, sandbox              |
| `src/telegram/`, `src/discord/`, `src/slack/`, etc. | Built-in channel integrations              |
| `src/infra/`                                        | Shared infrastructure utilities            |
| `src/media/`                                        | Media pipeline                             |
| `extensions/`                                       | Extension/plugin workspace packages        |
| `apps/ios/`                                         | iOS Clawdis app (Swift)                    |
| `apps/macos/`                                       | macOS Clawdis app (Swift)                  |
| `apps/android/`                                     | Android Clawdis app (Kotlin/Gradle)        |
| `apps/shared/`                                      | Shared native code (Swift packages)        |
| `ui/`                                               | Control UI (LitElement SPA)                |
| `packages/`                                         | Shared TypeScript packages                 |
| `skills/`                                           | Python skill scripts                       |
| `scripts/`                                          | Build, release, and utility scripts        |
| `docs/`                                             | Mintlify documentation source              |
| `dist/`                                             | Built output (generated, not committed)    |
| `.github/`                                          | CI workflows, actions, issue/PR templates  |

The repository structure, as described in `AGENTS.md`, keeps plugin-only dependencies in the extension's own `package.json`. Core `package.json` dependencies should only include things the core uses directly.

**Monorepo structure diagram:**

```mermaid
graph TD
  root["openclaw (repo root)"]
  root --> src["src/\
(TypeScript core)"]
  root --> extensions["extensions/\
(workspace plugin packages)"]
  root --> apps["apps/\
(native clients)"]
  root --> ui["ui/\
(Control UI SPA)"]
  root --> packages["packages/\
(shared TS packages)"]
  root --> skills["skills/\
(Python skill scripts)"]
  root --> scripts["scripts/\
(build & release scripts)"]
  root --> docs["docs/\
(Mintlify docs source)"]
  root --> dist["dist/\
(build output, generated)"]

  src --> src_cli["src/cli/\
(CLI wiring)"]
  src --> src_commands["src/commands/\
(CLI commands)"]
  src --> src_gateway["src/gateway/\
(GatewayServer, protocol)"]
  src --> src_agents["src/agents/\
(agent runtime, tools)"]
  src --> src_channels["src/telegram/, src/discord/, ...\
(built-in channels)"]
  src --> src_infra["src/infra/\
(shared utilities)"]

  apps --> apps_ios["apps/ios/\
(Clawdis iOS)"]
  apps --> apps_macos["apps/macos/\
(Clawdis macOS)"]
  apps --> apps_android["apps/android/\
(Clawdis Android)"]
  apps --> apps_shared["apps/shared/\
(shared native)"]
```

Sources: [AGENTS.md:10-22]()

---

## Toolchain & Prerequisites

| Tool    | Minimum Version | Notes                                             |
| ------- | --------------- | ------------------------------------------------- |
| Node.js | 22+             | Required runtime baseline                         |
| pnpm    | 10.23.0         | Primary package manager; use lockfile             |
| Bun     | 1.3.9+          | Preferred for TypeScript execution and tests      |
| Python  | 3.12            | Used for skill scripts (`skills/`) and CI tooling |

Both Node and Bun paths must stay functional. `pnpm-lock.yaml` and Bun patching must be kept in sync when touching deps.

Sources: [AGENTS.md:57-64]()

---

## Local Development Commands

These are the primary commands used during development. All commands run from the repo root.

| Command              | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `pnpm install`       | Install all dependencies (uses lockfile)     |
| `pnpm openclaw ...`  | Run CLI in dev mode (via Bun)                |
| `pnpm dev`           | Alias for dev CLI run                        |
| `pnpm build`         | Type-check and build `dist/`                 |
| `pnpm tsgo`          | TypeScript checks only                       |
| `pnpm check`         | Types + lint + format (Oxlint + Oxfmt)       |
| `pnpm format`        | Check formatting only (oxfmt --check)        |
| `pnpm format:fix`    | Fix formatting in place (oxfmt --write)      |
| `pnpm test`          | Run all tests (Vitest)                       |
| `pnpm test:coverage` | Tests with V8 coverage report                |
| `pnpm release:check` | Validate npm pack contents                   |
| `prek install`       | Install pre-commit hooks (same checks as CI) |

The `pnpm check` command must pass before commits. It runs the same type/lint/format checks as the CI `check` job.

**Key dev scripts:**

- Mac packaging: `scripts/package-mac-app.sh` (defaults to current arch)
- Commit helper: `scripts/committer "<msg>" <file...>` (scopes staging correctly)
- Release validation: `node --import tsx scripts/release-check.ts`

Sources: [AGENTS.md:55-71](), [docs/reference/RELEASING.md:44-56]()

---

## Coding Conventions

### Language & Tooling

- **TypeScript (ESM)** throughout. Strict typing; avoid `any`.
- Formatting and linting via **Oxlint** and **Oxfmt**. Run `pnpm check` before commits.
- Never add `@ts-nocheck`. Never disable `no-explicit-any`. Fix root causes.

### Class & Composition Rules

- Do **not** share behavior via prototype mutation (`applyPrototypeMixins`, `Object.defineProperty` on `.prototype`). Use explicit inheritance or helper composition so TypeScript can typecheck.
- In tests, prefer per-instance stubs over `SomeClass.prototype.method = ...` unless prototype-level patching is explicitly documented.

### File Size & Structure

- Aim to keep files under ~700 LOC (guideline, not a hard limit). Split or refactor when it improves clarity or testability.
- Extract helpers rather than creating "V2" copies of files.
- Use existing patterns for CLI options and dependency injection via `createDefaultDeps`.

### Naming Conventions

- **OpenClaw** (capitalized) for product/app/docs headings.
- `openclaw` (lowercase) for the CLI command, package/binary, paths, and config keys.

### Comments

Add brief comments for tricky or non-obvious logic. Keep comments focused on the _why_, not the _what_.

### UI and Progress Output

- CLI progress: use `src/cli/progress.ts` (`osc-progress` + `@clack/prompts` spinner). Do not hand-roll spinners or bars.
- Status output: use `src/terminal/table.ts` for tables with ANSI-safe wrapping.
- Color palette: use `src/terminal/palette.ts` (no hardcoded colors).

### Plugin/Extension Dependencies

- Keep plugin-only deps in the extension `package.json`. Do not add them to root `package.json` unless core uses them.
- `workspace:*` in `dependencies` breaks `npm install`. Use `devDependencies` or `peerDependencies` instead. The runtime resolves `openclaw/plugin-sdk` via a jiti alias.
- Plugin runtime deps must be in `dependencies`, not `devDependencies`.

Sources: [AGENTS.md:73-84](), [AGENTS.md:14-18]()

---

## Testing Guidelines

### Framework

- **Vitest** with V8 coverage thresholds: 70% lines, branches, functions, and statements.
- Test files are colocated with source: `*.test.ts` next to the source file.
- End-to-end tests: `*.e2e.test.ts`.

### Running Tests

```bash
# Standard test run
pnpm test

# With coverage
pnpm test:coverage

# Low-memory profile (for constrained hosts)
OPENCLAW_TEST_PROFILE=low OPENCLAW_TEST_SERIAL_GATEWAY=1 pnpm test

# Unit tests only via Bun
bunx vitest run --config vitest.unit.config.ts

# Live tests (requires real API keys)
CLAWDBOT_LIVE_TEST=1 pnpm test:live
LIVE=1 pnpm test:live  # includes provider live tests

# Docker-based live tests
pnpm test:docker:live-models
pnpm test:docker:live-gateway

# Onboarding E2E
pnpm test:docker:onboard
```

Do not set test workers above 16. The CI sets `OPENCLAW_TEST_WORKERS=2` on Linux runners to prevent V8 OOM.

### Changelog and Test Additions

Pure test additions or fixes generally do **not** need a changelog entry unless they alter user-facing behavior or the operator asks for one.

Sources: [AGENTS.md:94-104](), [.github/workflows/ci.yml:186-241]()

---

## Commit & Pull Request Guidelines

### Committing

Use `scripts/committer "<msg>" <file...>` to create commits. This keeps staging scoped to the intended files and avoids accidental inclusion of unrelated changes.

Do not use manual `git add` / `git commit` outside the helper.

### Commit Message Format

- Concise, action-oriented: `CLI: add verbose flag to send`
- Group related changes; do not bundle unrelated refactors.
- Prefix with the subsystem affected: `CLI:`, `Gateway:`, `Telegram:`, `Android:`, etc.

### Pull Requests

The canonical PR template is at `.github/pull_request_template.md`. The full maintainer PR workflow (triage order, quality bar, rebase rules, changelog conventions) is at `.agents/skills/PR_WORKFLOW.md`.

For PR submission, follow the `review-pr` → `prepare-pr` → `merge-pr` pipeline described in that skill.

**PR size labels** are applied automatically based on changed line count (excluding lockfiles and docs):

| Lines changed | Label      |
| ------------- | ---------- |
| < 50          | `size: XS` |
| 50–199        | `size: S`  |
| 200–499       | `size: M`  |
| 500–999       | `size: L`  |
| 1000+         | `size: XL` |

Contributor labels are also applied automatically: `trusted-contributor` (≥4 merged PRs), `experienced-contributor` (≥10 merged PRs), `maintainer` (team member).

Sources: [AGENTS.md:106-114](), [.github/workflows/labeler.yml:39-127]()

---

## Multi-Agent Safety Rules

When multiple agents work the same repository simultaneously:

- Do **not** create, apply, or drop `git stash` entries unless explicitly requested (this includes `git pull --rebase --autostash`).
- Do **not** create, remove, or modify `git worktree` checkouts.
- Do **not** switch branches unless explicitly requested.
- When told "push", you may `git pull --rebase` to integrate latest changes; never discard other agents' work.
- When told "commit", scope to your changes only. When told "commit all", commit in grouped chunks.
- Running multiple agents is fine as long as each has its own session.

Sources: [AGENTS.md:187-198]()

---

## Adding Channels or Extensions

When adding a new channel, extension, or app:

1. Add it to `.github/labeler.yml` with a matching glob pattern.
2. Create the matching GitHub label (match the color of existing channel/extension labels).
3. Use `scripts/sync-labels.ts` to create missing labels from `labeler.yml`.
4. Update all UI surfaces and docs that enumerate providers (macOS app, web UI, mobile if applicable, onboarding docs).
5. Add matching status and configuration forms so provider lists stay in sync.

**Channel label color assignments** (from `scripts/sync-labels.ts`):

| Prefix        | Color    |
| ------------- | -------- |
| `channel:`    | `1d76db` |
| `app:`        | `6f42c1` |
| `extensions:` | `0e8a16` |
| `docs:`       | `0075ca` |
| `cli:`        | `f9d0c4` |
| `gateway:`    | `d4c5f9` |
| `size:`       | `fbca04` |

Sources: [AGENTS.md:22](), [.github/labeler.yml:1-20](), [scripts/sync-labels.ts:10-18]()

---

## Version Locations

When bumping a version, update **all** of the following locations (never update `appcast.xml` unless cutting a new macOS Sparkle release):

| File                                               | Field                                           |
| -------------------------------------------------- | ----------------------------------------------- |
| `package.json`                                     | `version`                                       |
| `apps/android/app/build.gradle.kts`                | `versionName`, `versionCode`                    |
| `apps/ios/Sources/Info.plist`                      | `CFBundleShortVersionString`, `CFBundleVersion` |
| `apps/ios/Tests/Info.plist`                        | `CFBundleShortVersionString`, `CFBundleVersion` |
| `apps/macos/Sources/OpenClaw/Resources/Info.plist` | `CFBundleShortVersionString`, `CFBundleVersion` |
| `docs/install/updating.md`                         | Pinned npm version                              |

Sources: [AGENTS.md:179-180]()

---

## Release Channels

| Channel  | Tag Format         | npm dist-tag | Notes                      |
| -------- | ------------------ | ------------ | -------------------------- |
| `stable` | `vYYYY.M.D`        | `latest`     | Tagged releases only       |
| `beta`   | `vYYYY.M.D-beta.N` | `beta`       | May ship without macOS app |
| `dev`    | (none)             | —            | Moving HEAD on `main`      |

For beta releases: publish npm with a matching beta version suffix (e.g., `YYYY.M.D-beta.N`), not just `--tag beta` with a plain version number.

Sources: [AGENTS.md:87-91]()

---

## Development Workflow Diagram

This diagram maps the standard contributor workflow to the concrete commands and files involved.

```mermaid
flowchart TD
  start["Start: checkout branch"]
  install["pnpm install\
(reads pnpm-lock.yaml)"]
  code["Edit source in src/, extensions/, apps/, ui/"]
  check["pnpm check\
(Oxlint + Oxfmt + tsc via pnpm tsgo)"]
  test["pnpm test\
(Vitest, vitest.unit.config.ts)"]
  build["pnpm build\
(generates dist/)"]
  commit["scripts/committer msg file...\
(scoped git commit)"]
  push["git push"]
  ci["CI: .github/workflows/ci.yml"]
  pr[".github/pull_request_template.md"]

  start --> install
  install --> code
  code --> check
  check --> test
  test --> build
  build --> commit
  commit --> push
  push --> ci
  push --> pr
```

Sources: [AGENTS.md:55-115](), [.github/workflows/ci.yml:1-30]()

---

## Code Entity Map

This diagram maps the major development toolchain touchpoints to the concrete files and scripts that implement them.

```mermaid
graph LR
  subgraph "CLI & Dev"
    pnpm_openclaw["pnpm openclaw\
(dev CLI via Bun)"]
    pnpm_dev["pnpm dev"]
    openclaw_mjs["openclaw.mjs\
(CLI entrypoint)"]
    pnpm_openclaw --> openclaw_mjs
    pnpm_dev --> openclaw_mjs
  end

  subgraph "Check Pipeline"
    pnpm_check["pnpm check"]
    oxlint[".oxlintrc.json\
(Oxlint rules)"]
    oxfmt[".oxfmtrc.jsonc\
(Oxfmt rules)"]
    tsgo["pnpm tsgo\
(TypeScript checks)"]
    tsconfig["tsconfig*.json"]
    pnpm_check --> oxlint
    pnpm_check --> oxfmt
    pnpm_check --> tsgo
    tsgo --> tsconfig
  end

  subgraph "Test Pipeline"
    pnpm_test["pnpm test"]
    vitest_config["vitest*.ts\
(vitest configs)"]
    test_parallel["scripts/test-parallel.mjs"]
    pnpm_test --> test_parallel
    test_parallel --> vitest_config
  end

  subgraph "Build Pipeline"
    pnpm_build["pnpm build"]
    tsdown_config["tsdown.config.ts"]
    dist["dist/\
(built output)"]
    pnpm_build --> tsdown_config
    tsdown_config --> dist
  end

  subgraph "Commit & Release"
    committer["scripts/committer\
(scoped git commit)"]
    release_check["scripts/release-check.ts\
(pnpm release:check)"]
    prek["prek install\
(pre-commit hooks)"]
  end

  subgraph "Progress & Tables"
    progress_ts["src/cli/progress.ts\
(osc-progress + @clack/prompts)"]
    table_ts["src/terminal/table.ts\
(ANSI-safe tables)"]
    palette_ts["src/terminal/palette.ts\
(shared color palette)"]
  end
```

Sources: [AGENTS.md:55-84](), [AGENTS.md:172-173](), [.github/workflows/ci.yml:127-150]()

---

## Shorthand Commands

| Shorthand | Behavior                                                                                                                                                                    |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync`    | If working tree dirty, commit all changes with a Conventional Commit message, then `git pull --rebase`. If rebase conflicts cannot be resolved, stop. Otherwise `git push`. |

### Git Notes

- If `git branch -d/-D <branch>` is policy-blocked, delete the local ref directly:  
  `git update-ref -d refs/heads/<branch>`
- Bulk PR close/reopen safety: if a close action would affect more than 5 PRs, ask for explicit confirmation with the exact count and target scope before proceeding.

Sources: [AGENTS.md:117-123]()

---

## Documentation Guidelines

Docs live in `docs/` and are hosted on Mintlify at `docs.openclaw.ai`.

- Internal doc links: root-relative, no `.md`/`.mdx` extension. Example: `[Config](/configuration)`
- Anchors: root-relative path with anchor. Example: `[Hooks](/configuration#hooks)`
- Avoid em dashes (`—`) and apostrophes in headings — they break Mintlify anchor links.
- README (GitHub): use absolute `https://docs.openclaw.ai/...` URLs so links work on GitHub.
- Content must be generic: no personal device names, hostnames, or paths. Use placeholders like `user@gateway-host`.
- `docs/zh-CN/**` is auto-generated. Do not edit unless explicitly asked.

Sources: [AGENTS.md:24-43]()

---

## Secret Scanning & Security

- Secrets are scanned on every CI run using `detect-secrets` against `.secrets.baseline`.
- Private keys are detected by `pre-commit run --all-files detect-private-key`.
- Changed GitHub workflows are audited with `zizmor`.
- Production dependencies are audited with `pnpm-audit-prod`.
- Never commit real phone numbers, videos, or live config values. Use obviously fake placeholders in docs, tests, and examples.

For the full security model and audit tooling, see page [7](#7) and page [7.1](#7.1).

Sources: [.github/workflows/ci.yml:349-401](), [AGENTS.md:134-140]()
