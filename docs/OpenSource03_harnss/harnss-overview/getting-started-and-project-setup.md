# Getting Started & Project Setup

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.claude/skills/release/SKILL.md](.claude/skills/release/SKILL.md)
- [.github/workflows/build.yml](.github/workflows/build.yml)
- [.gitignore](.gitignore)
- [electron-builder.config.js](electron-builder.config.js)
- [electron/src/lib/posthog.ts](electron/src/lib/posthog.ts)
- [electron/src/main.ts](electron/src/main.ts)
- [package.json](package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)
- [src/components/settings/AnalyticsSettings.tsx](src/components/settings/AnalyticsSettings.tsx)
- [tsup.electron.config.ts](tsup.electron.config.ts)

</details>



This page provides technical instructions for setting up the Harnss development environment, building the application, and understanding the dual-pipeline build system. Harnss is a desktop application built with Electron, React, and TypeScript, utilizing a pnpm workspace to manage its core application and CLI components.

## Prerequisites

Harnss requires the following toolchain:
*   **Node.js**: version 22 or higher [package.json:44]() [.github/workflows/build.yml:44]().
*   **pnpm**: version 10.26.0 [package.json:31]().
*   **Platform-specific build tools**:
    *   **Linux**: `build-essential`, `python3`, `libsecret-1-dev`, and `libnotify-dev` are required for native module compilation (e.g., `node-pty`) [.github/workflows/build.yml:171]().
    *   **macOS/Windows**: Standard developer tools (Xcode/Visual Studio) for `electron-rebuild` [package.json:27]().

## Installation & Local Development

Harnss uses a pnpm workspace. After cloning the repository, install dependencies and trigger native module rebuilding:

```bash
pnpm install
```

The `postinstall` script automatically runs `electron-rebuild` to ensure native dependencies like `node-pty` and `electron-liquid-glass` are compatible with the bundled Electron headers [package.json:27]().

### Running the Development Environment

The development workflow uses `concurrently` to manage three parallel processes [package.json:19]():
1.  **Vite**: Serves the React renderer with HMR on `http://localhost:5173` [electron/src/main.ts:126]().
2.  **tsup (Watch Mode)**: Recompiles the Electron main and preload scripts into `electron/dist/` on every change [tsup.electron.config.ts:8]().
3.  **Electron**: Launches the shell, pointing to the local Vite server.

```bash
pnpm dev
```

### Build Pipeline Architecture

Harnss employs a split build pipeline to optimize for both the Chromium renderer and the Node.js main process.

| Pipeline | Tool | Entry Point | Output | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Renderer** | Vite | `index.html` | `dist/` | React UI, Tailwind CSS, and frontend assets. |
| **Main Process** | tsup | `electron/src/main.ts` | `electron/dist/main.js` | Electron lifecycle, IPC handlers, and native OS integrations. |
| **Preload** | tsup | `electron/src/preload.ts` | `electron/dist/preload.js` | Secure IPC bridge between Main and Renderer. |

#### Data Flow: Development Bootstrapping
The following diagram illustrates how the `pnpm dev` command initializes the system and bridges the "Natural Language" developer intent to "Code Entities".

Title: Development Process Bootstrapping
```mermaid
graph TD
    subgraph "Developer_Shell"
        "pnpm_dev[pnpm dev]" --> "concurrently[concurrently]"
    end

    subgraph "Build_Pipeline"
        "concurrently" --> "vite_proc[vite]"
        "concurrently" --> "tsup_proc[tsup --watch]"
        
        "vite_proc" --> "dist_renderer[dist/index.html]"
        "tsup_proc" --> "dist_main[electron/dist/main.js]"
        "tsup_proc" --> "dist_preload[electron/dist/preload.js]"
    end

    subgraph "Electron_Runtime"
        "dist_main" --> "main_ts[electron/src/main.ts]"
        "main_ts" --> "createWindow[createWindow()]"
        "createWindow" --> "loadURL[loadURL('http://localhost:5173')]"
        "loadURL" -.-> "vite_proc"
    end
```
**Sources:** [package.json:19](), [tsup.electron.config.ts:4-8](), [electron/src/main.ts:72-129]()

## Environment & Configuration

### Shell Environment Inheritance
On non-Windows platforms, Electron apps launched via GUI (Finder/Desktop) often inherit a restricted `PATH`. Harnss explicitly spawns a login shell at startup to capture the user's full environment, ensuring that AI SDKs and CLI tools (like `node`, `git`, or `claude`) are resolvable [electron/src/main.ts:10-21]().

### Analytics & Privacy
Harnss includes optional, privacy-focused analytics via PostHog.
*   **Initialization**: Controlled by `initPostHog()` in the main process [electron/src/lib/posthog.ts:28]().
*   **Anonymous ID**: A `randomUUID` is generated and stored in `AppSettings` to track daily active users without personal identification [electron/src/lib/posthog.ts:84-99]().
*   **Opt-out**: Users can toggle `analyticsEnabled` in the UI [src/components/settings/AnalyticsSettings.tsx:31-39](), which triggers `reinitPostHog()` to shutdown the client [electron/src/lib/posthog.ts:205-213]().

## Production Build & Packaging

The production build consolidates the dual-pipeline outputs into a single distributable package.

```bash
pnpm build # Runs tsup for main process and vite build for renderer
pnpm dist  # Packages the app using electron-builder
```

### ASAR Optimization (afterPack Hook)
To minimize bundle size, Harnss uses a custom `afterPack` hook in `electron-builder.config.js`. This hook extracts the generated ASAR archive, removes development artifacts (like `src` folders and documentation), and repacks only the necessary production files [electron-builder.config.js:4-63]().

**Whitelisted Production Files:**
*   `package.json`
*   `index.html`
*   `dist/` (Renderer output)
*   `electron/dist/` (Main/Preload output)
*   `node_modules/` (Production dependencies)

Title: Production Build & Packaging Flow
```mermaid
graph LR
    subgraph "Build_Phase"
        "pnpm_build[pnpm build]" --> "vite_build[vite build]"
        "pnpm_build" --> "tsup_build[tsup]"
        "vite_build" --> "renderer_assets[dist/]"
        "tsup_build" --> "main_assets[electron/dist/]"
    end

    subgraph "Packaging_Phase"
        "renderer_assets" --> "eb[electron-builder]"
        "main_assets" --> "eb"
        "eb" --> "asar_pack[asar pack]"
        "asar_pack" --> "afterPackHook[afterPackHook()]"
        "afterPackHook" --> "strip_bloat[Strip src/ & tests/]"
        "strip_bloat" --> "final_dist[release/version/Harnss.app]"
    end
```
**Sources:** [package.json:20-22](), [electron-builder.config.js:13-19](), [electron-builder.config.js:65-102]()

## Testing

Harnss uses **Vitest** for its testing infrastructure.
*   **Main Process Tests**: Configured via `vitest.config.electron.ts` to handle Electron-specific globals and Node.js environments [package.json:28]().
*   **Running Tests**:
    ```bash
    pnpm test       # Run once
    pnpm test:watch # Watch mode
    ```

**Sources:** [package.json:28-29](), [.github/workflows/build.yml:50-51]()