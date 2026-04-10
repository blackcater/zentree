# Development Environment

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.prettierignore](.prettierignore)
- [justfile](justfile)
- [src/renderer/pages/conversation/Workspace/hooks/useWorkspaceMigration.ts](src/renderer/pages/conversation/Workspace/hooks/useWorkspaceMigration.ts)
- [tests/e2e/helpers/assertions.ts](tests/e2e/helpers/assertions.ts)
- [tests/e2e/helpers/index.ts](tests/e2e/helpers/index.ts)
- [tests/e2e/helpers/navigation.ts](tests/e2e/helpers/navigation.ts)
- [tests/e2e/helpers/screenshots.ts](tests/e2e/helpers/screenshots.ts)
- [tests/e2e/helpers/selectors.ts](tests/e2e/helpers/selectors.ts)
- [tests/e2e/specs/acp-agent.e2e.ts](tests/e2e/specs/acp-agent.e2e.ts)
- [tests/e2e/specs/channels.e2e.ts](tests/e2e/specs/channels.e2e.ts)
- [tests/e2e/specs/ext-acp.e2e.ts](tests/e2e/specs/ext-acp.e2e.ts)
- [tests/e2e/specs/ext-channels.e2e.ts](tests/e2e/specs/ext-channels.e2e.ts)
- [tests/e2e/specs/ext-mcp.e2e.ts](tests/e2e/specs/ext-mcp.e2e.ts)
- [tests/e2e/specs/ext-settings-tabs.e2e.ts](tests/e2e/specs/ext-settings-tabs.e2e.ts)
- [tests/e2e/specs/ext-skills.e2e.ts](tests/e2e/specs/ext-skills.e2e.ts)
- [tests/e2e/specs/ext-themes-stability.e2e.ts](tests/e2e/specs/ext-themes-stability.e2e.ts)
- [tests/e2e/specs/navigation.e2e.ts](tests/e2e/specs/navigation.e2e.ts)
- [tests/e2e/specs/webui.e2e.ts](tests/e2e/specs/webui.e2e.ts)
- [tests/regression/layout_theme_route_revert.test.ts](tests/regression/layout_theme_route_revert.test.ts)
- [tests/unit/getNpxCacheDir.test.ts](tests/unit/getNpxCacheDir.test.ts)
- [tests/unit/test_acp_connection_disconnect.ts](tests/unit/test_acp_connection_disconnect.ts)
- [vitest.config.ts](vitest.config.ts)

</details>



This page covers how to set up a local development environment for AionUi, run the application in development mode, use the available debug scripts, and configure code quality tooling. For information about the full build and packaging pipeline that produces release artifacts, see [11.1](). For native module compilation and cross-platform considerations, see [11.3]().

---

## Prerequisites

The following tools must be installed before beginning development:

| Tool | Required Version | Purpose |
|---|---|---|
| Node.js | `22+` | JavaScript runtime [justfile:52-54]() |
| bun | latest | Primary package manager and script runner [justfile:58-60]() |
| just | latest | Command runner — wraps common tasks via `justfile` [justfile:1-2]() |
| Python | `3.11+` | Required for native module compilation (`better-sqlite3`) [justfile:61-65]() |
| prek | latest | Pre-commit code checker (`npm install -g @j178/prek`) |

Sources: [justfile:40-88]()

---

## Initial Setup

AionUi uses `just` to orchestrate the environment setup, ensuring native modules like `better-sqlite3` are correctly compiled for the Electron ABI.

```bash
# Clone the repository
git clone https://github.com/iOfficeAI/AionUi.git
cd AionUi

# Check prerequisites (Node, Bun, Python, Native modules)
just preflight

# Install dependencies and compile native modules
just setup
```

The `just setup` command executes `bun install` followed by `rebuild-native` [justfile:116](). The `rebuild-native` recipe uses `electron-rebuild` to force a compilation of `better-sqlite3` specifically for the version of Electron defined in `package.json` [justfile:123-152]().

### Native Module Verification
After setup, you can verify that the native modules are loadable by the Node.js runtime:
```bash
just verify-native
```
This executes a Node script that attempts to `require('better-sqlite3')` and reports success or failure [justfile:156-166]().

**Setup Flow: From Source to Executable Environment**

```mermaid
graph TD
    "Repo[Git Clone]" --> "Preflight[just preflight]"
    "Preflight" --> "Install[just install / bun install]"
    "Install" --> "Rebuild[just rebuild-native]"
    "Rebuild" --> "ElectronRebuild[electron-rebuild -f -w better-sqlite3]"
    "ElectronRebuild" --> "Verify[just verify-native]"
    "Verify" --> "DevReady[Environment Ready]"

    subgraph "Native Module Compilation"
    "ElectronRebuild"
    "Verify"
    end
```
Sources: [justfile:42-88](), [justfile:108-166]()

---

## Running the Application

The project supports multiple operational modes, accessible via `just` recipes or `bun` scripts.

| Command | Action | Implementation |
|---|---|---|
| `just dev` | Start Desktop GUI | `bun run start` (electron-vite dev) [justfile:17-18]() |
| `just webui` | Start WebUI Development | `bun run webui` [justfile:20-22]() |
| `just webui-remote` | WebUI (Remote Access) | `bun run webui:remote` [justfile:24-26]() |
| `just webui-prod` | WebUI Production Build | `bun run webui:prod` [justfile:29-30]() |
| `just cli` | Password Reset Utility | `bun run cli` [justfile:33-35]() |

Sources: [justfile:17-35]()

---

## Testing Environment

AionUi uses **Vitest** for unit and integration testing, with a configuration that supports both Node.js and Browser (jsdom) environments.

### Test Configuration
The configuration in `vitest.config.ts` defines two main projects:
1.  **Node Project**: For testing agent logic, IPC services, and utilities [vitest.config.ts:24-38]().
2.  **DOM Project**: For testing React components and hooks using `jsdom` [vitest.config.ts:40-49]().

### Coverage
Code coverage is provided by the `v8` provider [vitest.config.ts:51](). Entry points (like `src/index.ts`) and type-only files are excluded from coverage metrics [vitest.config.ts:58-79]().

### Test Execution
*   **Run all tests**: `bun run test`
*   **Run unit tests**: `tests/unit/` [vitest.config.ts:30]()
*   **Run integration tests**: `tests/integration/` [vitest.config.ts:32]()
*   **Run E2E tests**: Uses Playwright (located in `tests/e2e/`) [tests/e2e/specs/webui.e2e.ts:11]()

**Natural Language to Code: Test Entities**

```mermaid
graph TD
    subgraph "Test Execution"
        "VitestConfig[vitest.config.ts]" --> "NodeProj[Project: node]"
        "VitestConfig" --> "DomProj[Project: dom]"
    end

    subgraph "Code Entities"
        "NodeProj" --> "AcpTests[tests/unit/test_acp_connection_disconnect.ts]"
        "NodeProj" --> "ShellTests[tests/unit/getNpxCacheDir.test.ts]"
        "DomProj" --> "ThemeTests[tests/regression/layout_theme_route_revert.test.ts]"
    end

    subgraph "E2E Helpers"
        "NavHelper[tests/e2e/helpers/navigation.ts]" --> "Routes[ROUTES]"
        "NavHelper" --> "NavFn[navigateTo]"
    end
```
Sources: [vitest.config.ts:22-49](), [tests/unit/test_acp_connection_disconnect.ts:14](), [tests/unit/getNpxCacheDir.test.ts:64](), [tests/e2e/helpers/navigation.ts:12-49]()

---

## Development Utilities & Helpers

### Navigation Constants
For E2E and integration testing, routes are centralized in a `ROUTES` constant to ensure consistency across the test suite.
*   **Settings Routes**: Includes `gemini`, `model`, `agent`, `tools`, etc. [tests/e2e/helpers/navigation.ts:14-23]().
*   **Dynamic Routes**: Helper for extension-contributed settings tabs `extensionSettings(tabId)` [tests/e2e/helpers/navigation.ts:25]().

### Path Resolution
The project uses TypeScript aliases defined in `vitest.config.ts` to simplify imports across the monorepo-style structure:
*   `@/`: `src/` [vitest.config.ts:5]()
*   `@process/`: `src/process/` [vitest.config.ts:6]()
*   `@renderer/`: `src/renderer/` [vitest.config.ts:7]()
*   `@worker/`: `src/process/worker/` [vitest.config.ts:8]()

### Environment Detection
The `getNpxCacheDir` utility in `src/process/utils/shellEnv.ts` handles cross-platform path resolution for the `npx` cache, which is critical for ACP agents that spawn CLI tools [tests/unit/getNpxCacheDir.test.ts:10-14]().

Sources: [tests/e2e/helpers/navigation.ts:12-26](), [vitest.config.ts:4-12](), [tests/unit/getNpxCacheDir.test.ts:10-14]()