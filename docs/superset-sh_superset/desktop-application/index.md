# Desktop Application

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/actions/merge-mac-manifests/action.yml](.github/actions/merge-mac-manifests/action.yml)
- [.github/actions/merge-mac-manifests/merge-mac-manifests.mjs](.github/actions/merge-mac-manifests/merge-mac-manifests.mjs)
- [.github/workflows/build-desktop.yml](.github/workflows/build-desktop.yml)
- [.github/workflows/release-desktop-canary.yml](.github/workflows/release-desktop-canary.yml)
- [.github/workflows/release-desktop.yml](.github/workflows/release-desktop.yml)
- [apps/api/src/app/api/auth/desktop/connect/route.ts](apps/api/src/app/api/auth/desktop/connect/route.ts)
- [apps/desktop/BUILDING.md](apps/desktop/BUILDING.md)
- [apps/desktop/RELEASE.md](apps/desktop/RELEASE.md)
- [apps/desktop/create-release.sh](apps/desktop/create-release.sh)
- [apps/desktop/electron-builder.ts](apps/desktop/electron-builder.ts)
- [apps/desktop/electron.vite.config.ts](apps/desktop/electron.vite.config.ts)
- [apps/desktop/package.json](apps/desktop/package.json)
- [apps/desktop/scripts/copy-native-modules.ts](apps/desktop/scripts/copy-native-modules.ts)
- [apps/desktop/src/main/env.main.ts](apps/desktop/src/main/env.main.ts)
- [apps/desktop/src/main/index.ts](apps/desktop/src/main/index.ts)
- [apps/desktop/src/main/lib/auto-updater.ts](apps/desktop/src/main/lib/auto-updater.ts)
- [apps/desktop/src/renderer/env.renderer.ts](apps/desktop/src/renderer/env.renderer.ts)
- [apps/desktop/src/renderer/index.html](apps/desktop/src/renderer/index.html)
- [apps/desktop/vite/helpers.ts](apps/desktop/vite/helpers.ts)
- [apps/web/src/app/auth/desktop/success/page.tsx](apps/web/src/app/auth/desktop/success/page.tsx)
- [biome.jsonc](biome.jsonc)
- [bun.lock](bun.lock)
- [package.json](package.json)
- [packages/ui/package.json](packages/ui/package.json)
- [scripts/lint.sh](scripts/lint.sh)

</details>



## Purpose and Scope

The Desktop Application is an Electron-based native application that serves as the primary interface for Superset. It provides a full-featured development environment with integrated terminal emulation, Git worktree management, file editing, AI-assisted coding, and browser-based debugging capabilities. The desktop app runs locally on macOS, Windows, and Linux, with local SQLite storage synchronized to the cloud via ElectricSQL.

This document covers the desktop application's architecture, build system, release process, and core infrastructure. For details on specific subsystems, see:
- Application initialization and lifecycle: [#2.1](#2.1)
- Build configuration and packaging: [#2.2](#2.2)
- Auto-update system: [#2.3](#2.3)
- Process architecture and IPC: [#2.4](#2.4) and [#2.5](#2.5)
- Workspace and Git integration: [#2.6](#2.6)
- Terminal system: [#2.8](#2.8)
- Data synchronization: [#2.10](#2.10)

---

## Architecture Overview

The desktop application follows Electron's multi-process architecture with a Node.js main process, Chromium-based renderer process, and several auxiliary processes for specialized tasks. The application is built as part of a monorepo structure at [apps/desktop/]() and shares common packages with the web and API applications.

### Process Architecture

```mermaid
graph TB
    subgraph "Main Process (Node.js)"
        MainEntry["main/index.ts<br/>App initialization"]
        TRPCRouter["tRPC Router<br/>IPC API endpoints"]
        LocalDB["localDb<br/>SQLite access"]
        TerminalManager["Terminal Manager<br/>Session lifecycle"]
        GitOps["Git Operations<br/>simple-git"]
        AutoUpdater["Auto-Updater<br/>electron-updater"]
    end
    
    subgraph "Renderer Process (Chromium)"
        ReactApp["React Application<br/>Tanstack Router"]
        TRPCClient["tRPC Client<br/>trpc-electron"]
        ElectricClient["ElectricSQL Client<br/>Real-time sync"]
        UI["UI Components<br/>@superset/ui"]
    end
    
    subgraph "Auxiliary Processes"
        TerminalDaemon["terminal-host<br/>Persistent sessions"]
        PTYSubprocess["pty-subprocess<br/>Shell instances"]
        GitWorker["git-task-worker<br/>Heavy Git ops"]
        HostService["host-service<br/>Per-org HTTP server"]
    end
    
    subgraph "External Services"
        CloudAPI["API Server<br/>api.superset.sh"]
        ElectricSync["ElectricSQL<br/>Sync service"]
        NeonDB["Neon PostgreSQL<br/>Cloud database"]
    end
    
    ReactApp -->|IPC via tRPC| TRPCRouter
    TRPCRouter --> LocalDB
    TRPCRouter --> TerminalManager
    TRPCRouter --> GitOps
    
    MainEntry --> TRPCRouter
    MainEntry --> AutoUpdater
    MainEntry --> TerminalManager
    
    TerminalManager -->|fork| TerminalDaemon
    TerminalDaemon -->|spawn| PTYSubprocess
    GitOps -->|offload| GitWorker
    MainEntry -->|spawn| HostService
    
    ElectricClient -->|HTTP| ElectricSync
    TRPCClient -->|HTTP| CloudAPI
    ElectricSync -->|replicate| NeonDB
```

**Sources:** [apps/desktop/electron.vite.config.ts:102-112](), [apps/desktop/src/main/index.ts:1-367](), [diagrams showing multi-process architecture]()

---

## Technology Stack

The desktop application uses the following core technologies:

| Technology | Purpose | Package/Version |
|------------|---------|-----------------|
| **Electron** | Cross-platform desktop framework | `electron@40.2.1` |
| **React** | UI rendering | `react@19.2.0` |
| **Vite** | Build tool (via electron-vite) | `vite@7.1.3`, `electron-vite@4.0.0` |
| **tRPC** | Type-safe IPC communication | `@trpc/server@11.7.1`, `trpc-electron@0.1.2` |
| **TanStack Router** | Client-side routing | `@tanstack/react-router@1.147.3` |
| **ElectricSQL** | Real-time database sync | `@electric-sql/client@1.5.12` |
| **Drizzle ORM** | SQLite database access | `drizzle-orm@0.45.1` |
| **xterm.js** | Terminal emulation | `@xterm/xterm@6.1.0-beta.195` |
| **node-pty** | PTY subprocess management | `node-pty@1.1.0` |
| **simple-git** | Git operations | `simple-git@3.30.0` |
| **electron-updater** | Auto-update functionality | `electron-updater@6.7.3` |
| **Tailwind CSS** | Styling | `tailwindcss@4.1.18` |
| **Zustand** | State management | `zustand@5.0.8` |
| **CodeMirror** | Code editor | `@codemirror/view@6.39.16` |

**Sources:** [apps/desktop/package.json:37-217]()

---

## Build System

### Compilation with electron-vite

The desktop app uses `electron-vite` to compile three separate bundles:

```mermaid
graph LR
    Source["Source Code"] --> ViteConfig["electron.vite.config.ts"]
    
    ViteConfig --> MainBundle["Main Process<br/>dist/main/index.js"]
    ViteConfig --> PreloadBundle["Preload Script<br/>dist/preload/index.js"]
    ViteConfig --> RendererBundle["Renderer Process<br/>dist/renderer/"]
    
    MainBundle --> ElectronBuilder["electron-builder"]
    PreloadBundle --> ElectronBuilder
    RendererBundle --> ElectronBuilder
    
    ViteConfig --> AuxBundles["Auxiliary Processes<br/>terminal-host<br/>pty-subprocess<br/>git-task-worker<br/>host-service"]
    AuxBundles --> ElectronBuilder
    
    ElectronBuilder --> Artifacts["Platform Artifacts<br/>DMG (macOS)<br/>AppImage (Linux)<br/>NSIS (Windows)"]
```

The main build configuration is defined in [apps/desktop/electron.vite.config.ts](), which creates separate Vite configurations for:

- **Main process** ([electron.vite.config.ts:47-127]()): Node.js bundle with access to Electron APIs
- **Preload script** ([electron.vite.config.ts:129-158]()): Sandboxed context bridge
- **Renderer process** ([electron.vite.config.ts:160-263]()): React application with browser APIs

### Entry Points

```mermaid
graph TB
    subgraph "Build Outputs"
        MainIndex["main/index.js<br/>App initialization"]
        TerminalHost["main/terminal-host.js<br/>Session daemon"]
        PTYSubprocess["main/pty-subprocess.js<br/>Shell wrapper"]
        GitWorker["main/git-task-worker.js<br/>Worker thread"]
        HostService["main/host-service/index.js<br/>HTTP server"]
        PreloadIndex["preload/index.js<br/>Context bridge"]
        RendererIndex["renderer/index.html<br/>React app"]
    end
    
    MainIndex -->|spawns| TerminalHost
    TerminalHost -->|spawns| PTYSubprocess
    MainIndex -->|creates Worker| GitWorker
    MainIndex -->|spawns| HostService
    MainIndex -->|loads| PreloadIndex
    PreloadIndex -->|exposes to| RendererIndex
```

**Sources:** [apps/desktop/electron.vite.config.ts:102-112]()

### Native Module Handling

Native modules like `node-pty`, `better-sqlite3`, and platform-specific packages require special handling during the build:

1. **Externalization**: Native modules are marked as external in the Vite config to prevent bundling ([electron.vite.config.ts:116]())
2. **Copying**: A pre-build script ([apps/desktop/scripts/copy-native-modules.ts]()) resolves symlinks and copies native modules to `node_modules/`
3. **ASAR unpacking**: The `asarUnpack` configuration in [apps/desktop/electron-builder.ts:47-53]() ensures native binaries are extracted outside the ASAR archive

**Sources:** [apps/desktop/electron.vite.config.ts:116](), [apps/desktop/electron-builder.ts:46-53](), [apps/desktop/scripts/copy-native-modules.ts:1-453]()

### Build Scripts

| Script | Purpose | Command |
|--------|---------|---------|
| `generate:icons` | Generate file type icons | `bun run scripts/generate-file-icons.ts` |
| `clean:dev` | Clean development artifacts | `rimraf ./node_modules/.dev` |
| `compile:app` | Compile with electron-vite | `electron-vite build` |
| `copy:native-modules` | Prepare native modules | `bun run scripts/copy-native-modules.ts` |
| `validate:native-runtime` | Verify native module compatibility | `bun run scripts/validate-native-runtime.ts` |
| `package` | Package with electron-builder | `electron-builder --config electron-builder.ts` |

**Sources:** [apps/desktop/package.json:16-35]()

---

## Packaging with electron-builder

The [apps/desktop/electron-builder.ts]() configuration defines platform-specific packaging:

### Platform Targets

```mermaid
graph TB
    Config["electron-builder.ts"] --> macOS["macOS<br/>DMG + ZIP<br/>arm64 & x64"]
    Config --> Linux["Linux<br/>AppImage<br/>x64"]
    Config --> Windows["Windows<br/>NSIS Installer<br/>x64"]
    
    macOS --> Signing["Code Signing<br/>Apple Developer ID<br/>Notarization"]
    macOS --> AutoUpdate["Auto-update Manifest<br/>latest-mac.yml"]
    
    Linux --> AutoUpdate2["Auto-update Manifest<br/>latest-linux.yml"]
    
    Windows --> AutoUpdate3["Auto-update Manifest<br/>latest.yml"]
```

**Key packaging features:**

- **ASAR Archive**: Application code is packaged into `app.asar` with native modules unpacked ([electron-builder.ts:46-53]())
- **Extra Resources**: Database migrations and sounds are placed outside ASAR at [electron-builder.ts:56-68]()
- **macOS Entitlements**: Required for microphone, local network, and Apple Events permissions ([electron-builder.ts:97-116]())
- **Deep Linking**: Protocol handler for `superset://` URLs ([electron-builder.ts:120-123]())

**Sources:** [apps/desktop/electron-builder.ts:22-153]()

---

## Release Process

### Release Channels

The desktop app supports two release channels:

| Channel | Description | Tag Format | Build Frequency |
|---------|-------------|------------|-----------------|
| **Stable** | Production releases | `desktop-v1.0.0` | Manual via git tag |
| **Canary** | Pre-release builds | `desktop-canary` | Automated every 12 hours |

### Stable Release Workflow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant Script as create-release.sh
    participant Git as Git Repository
    participant GHA as GitHub Actions
    participant Release as GitHub Release
    participant Users as End Users
    
    Dev->>Script: Run ./create-release.sh
    Script->>Dev: Prompt for version (patch/minor/major)
    Dev->>Script: Select version (e.g., 1.2.3)
    Script->>Git: Update package.json version
    Script->>Git: Create tag desktop-v1.2.3
    Script->>Git: Push tag to remote
    
    Git->>GHA: Trigger release-desktop.yml
    GHA->>GHA: Build macOS arm64 + x64
    GHA->>GHA: Build Linux x64
    GHA->>GHA: Merge update manifests
    GHA->>Release: Create draft release
    
    Script->>Script: Monitor workflow progress
    Script->>Dev: Release created (draft)
    
    Dev->>Release: Review and publish
    Release->>Users: Auto-update notification
```

**Sources:** [apps/desktop/create-release.sh:1-460](), [.github/workflows/release-desktop.yml:1-147]()

### Canary Release Workflow

The canary workflow runs automatically on a schedule:

```mermaid
sequenceDiagram
    participant Cron as GitHub Cron
    participant Check as Check Changes Job
    participant Build as Build Job
    participant Release as Release Job
    participant Canary as Canary Release
    
    Cron->>Check: Trigger every 12 hours
    Check->>Check: Compare HEAD with desktop-canary tag
    
    alt Changes detected
        Check->>Build: Trigger build with version suffix
        Note over Build: Appends -canary.YYYYMMDDHHMMSS
        Build->>Build: Build all platforms
        Build->>Release: Upload artifacts
        Release->>Canary: Delete existing canary release
        Release->>Canary: Create new canary release (prerelease)
    else No changes
        Check->>Cron: Skip build
    end
```

**Sources:** [.github/workflows/release-desktop-canary.yml:1-158]()

### Build Matrix

The build workflow uses a matrix strategy to build for multiple architectures in parallel:

| Platform | Architecture | Runner | Output Format |
|----------|--------------|--------|---------------|
| macOS | arm64 | `macos-latest` | DMG, ZIP, update manifest |
| macOS | x64 | `macos-latest` | DMG, ZIP, update manifest |
| Linux | x64 | `ubuntu-latest` | AppImage, update manifest |

**Sources:** [.github/workflows/build-desktop.yml:32-256]()

### Auto-Update Manifest Merging

macOS builds produce separate manifests for arm64 and x64. A custom GitHub Action merges them into a single `latest-mac.yml`:

```mermaid
graph LR
    Arm64["latest-mac-arm64.yml<br/>arm64 build"] --> Merge["merge-mac-manifests.mjs"]
    X64["latest-mac-x64.yml<br/>x64 build"] --> Merge
    
    Merge --> Output["latest-mac.yml<br/>Combined manifest"]
    
    Output --> Stable["Stable Release<br/>/releases/latest/download/"]
    Output --> Canary["Canary Release<br/>/releases/download/desktop-canary/"]
```

**Sources:** [.github/actions/merge-mac-manifests/action.yml:1-43](), [.github/actions/merge-mac-manifests/merge-mac-manifests.mjs:1-279]()

---

## Auto-Update System

The desktop app uses `electron-updater` to check for and install updates automatically.

### Update Flow

```mermaid
sequenceDiagram
    participant App as Desktop App
    participant Updater as electron-updater
    participant GitHub as GitHub Releases
    participant User as User
    
    App->>Updater: Check for updates (on launch + every 4h)
    Updater->>GitHub: GET /releases/latest/download/latest-mac.yml
    
    alt Update available
        GitHub->>Updater: Return manifest with new version
        Updater->>GitHub: Download new version ZIP
        GitHub->>Updater: Stream download
        Updater->>App: Emit "update-downloaded"
        App->>User: Show "Update ready" notification
        User->>App: Click "Install & Restart"
        App->>Updater: quitAndInstall()
        Updater->>Updater: Install update
        Updater->>App: Relaunch with new version
    else No update
        GitHub->>Updater: Same version in manifest
        Updater->>App: Emit "update-not-available"
    end
```

**Sources:** [apps/desktop/src/main/lib/auto-updater.ts:1-286]()

### Update Feed URLs

The auto-updater uses different feed URLs based on the build channel:

```typescript
// Stable channel (no prerelease identifier in version)
const UPDATE_FEED_URL = "https://github.com/superset-sh/superset/releases/latest/download";

// Canary channel (version contains prerelease identifier like "1.2.0-canary")
const UPDATE_FEED_URL = "https://github.com/superset-sh/superset/releases/download/desktop-canary";
```

**Sources:** [apps/desktop/src/main/lib/auto-updater.ts:28-32]()

### Auto-Update Configuration

Key configuration in [apps/desktop/src/main/lib/auto-updater.ts:202-224]():

- `autoDownload: true` - Downloads updates automatically
- `autoInstallOnAppQuit: true` - Installs on next quit
- `disableDifferentialDownload: true` - Downloads full package (more reliable)
- `allowDowngrade: true` (canary only) - Allows switching back to stable

**Sources:** [apps/desktop/src/main/lib/auto-updater.ts:202-224]()

---

## Application Initialization

### Main Process Startup Sequence

```mermaid
graph TB
    Start["app.whenReady()"] --> Shell["Apply shell environment<br/>applyShellEnvToProcess()"]
    Shell --> Protocol["Register protocol handlers<br/>superset://, superset-icon://, superset-font://"]
    Protocol --> Sentry["Initialize Sentry<br/>initSentry()"]
    Sentry --> Icons["Ensure project icons directory<br/>ensureProjectIconsDir()"]
    Icons --> State["Initialize app state<br/>initAppState()"]
    State --> Extension["Load browser extension<br/>loadWebviewBrowserExtension()"]
    Extension --> Terminal["Reconcile terminal sessions<br/>reconcileDaemonSessions()"]
    Terminal --> Agent["Setup agent hooks<br/>setupAgentHooks()"]
    Agent --> Window["Create main window<br/>makeAppSetup()"]
    Window --> Updater["Setup auto-updater<br/>setupAutoUpdater()"]
    Updater --> Tray["Initialize system tray<br/>initTray()"]
    Tray --> DeepLink["Process pending deep links"]
    DeepLink --> Ready["Application ready"]
```

**Sources:** [apps/desktop/src/main/index.ts:283-365]()

### Deep Linking

The application handles `superset://` protocol URLs for authentication and navigation:

```mermaid
sequenceDiagram
    participant OS as Operating System
    participant Main as Main Process
    participant Web as Web Browser
    participant Renderer as Renderer Process
    
    OS->>Main: open-url event (superset://auth/callback?token=...)
    Main->>Main: parseAuthDeepLink()
    
    alt Authentication callback
        Main->>Main: handleAuthCallback()
        Main->>Main: Store session token
        Main->>Renderer: Focus window
    else Navigation link
        Main->>Main: Extract path from URL
        Main->>Renderer: webContents.send("deep-link-navigate", path)
        Renderer->>Renderer: Navigate to path
    end
```

**Sources:** [apps/desktop/src/main/index.ts:69-92]()

### Renderer Process Entry

The renderer process starts from [apps/desktop/src/renderer/index.html]():

1. Theme boot script loads before body ([index.html:6]())
2. Content Security Policy enforces security boundaries ([index.html:20]())
3. React application mounts to `<app>` element ([index.html:24-25]())

**CSP Configuration:**
- `script-src 'self' 'wasm-unsafe-eval'` - Allows WebAssembly for xterm.js ImageAddon
- `connect-src` includes localhost, API URL, Electric URL, PostHog, Sentry, Outlit
- `frame-src https: http: data: blob:` - Allows browser pane webview

**Sources:** [apps/desktop/src/renderer/index.html:1-28]()

---

## Environment Variables

The desktop app uses separate environment configurations for main and renderer processes:

### Main Process Environment

Defined in [apps/desktop/src/main/env.main.ts]() using `@t3-oss/env-core`:

| Variable | Type | Default |
|----------|------|---------|
| `NODE_ENV` | `"development" \| "production" \| "test"` | `"development"` |
| `NEXT_PUBLIC_API_URL` | `URL` | `"https://api.superset.sh"` |
| `NEXT_PUBLIC_ELECTRIC_URL` | `URL` | `"https://electric-proxy.avi-6ac.workers.dev"` |
| `NEXT_PUBLIC_WEB_URL` | `URL` | `"https://app.superset.sh"` |
| `SENTRY_DSN_DESKTOP` | `string` (optional) | - |
| `NEXT_PUBLIC_POSTHOG_KEY` | `string` (optional) | - |

**Sources:** [apps/desktop/src/main/env.main.ts:12-52]()

### Renderer Process Environment

Defined in [apps/desktop/src/renderer/env.renderer.ts]() with build-time injection via Vite:

- Values are replaced by Vite's `define` configuration during build ([electron.vite.config.ts:161-209]())
- The `process.env.*` references become literal strings in the compiled bundle
- Validation uses the same schema but operates on build-time values

**Sources:** [apps/desktop/src/renderer/env.renderer.ts:1-63](), [apps/desktop/electron.vite.config.ts:161-209]()

---

## Data Architecture

The desktop application uses a hybrid data architecture with local SQLite storage and cloud synchronization:

```mermaid
graph TB
    subgraph "Renderer Process"
        UI["React Components"]
        ElectricClient["ElectricSQL Client<br/>@electric-sql/client"]
        Collections["Collections Provider<br/>Synced data"]
        TRPCClient["tRPC Client<br/>Mutations"]
    end
    
    subgraph "Main Process"
        LocalDB["LocalDB<br/>@superset/local-db<br/>better-sqlite3"]
        TRPCRouter["tRPC Router"]
    end
    
    subgraph "Cloud Services"
        APIProxy["API Proxy<br/>/api/electric"]
        ElectricServer["ElectricSQL Server<br/>Fly.io"]
        NeonDB["Neon PostgreSQL<br/>Source of truth"]
    end
    
    UI -->|Read synced data| Collections
    UI -->|Write mutations| TRPCClient
    
    Collections -->|HTTP Shape stream| APIProxy
    TRPCClient -->|HTTP| TRPCRouter
    
    TRPCRouter -->|Read/Write| LocalDB
    TRPCRouter -->|HTTP| APIProxy
    
    APIProxy -->|Auth + RLS| ElectricServer
    ElectricServer -->|CDC replication| NeonDB
```

### Local-Only vs Synced Data

| Data Type | Storage | Sync | Example Tables |
|-----------|---------|------|----------------|
| **Local-only** | SQLite (`localDb`) | No | `settings`, `tabs`, `panes` |
| **Cloud-synced** | Neon PostgreSQL | Yes (via Electric) | `projects`, `workspaces`, `organizations` |

**Sources:** [High-level diagrams](), [apps/desktop/src/main/lib/local-db.ts]()

---

## Protocol Handlers

The desktop app registers custom protocol handlers for loading local resources:

### superset-icon://

Serves project icons from the local filesystem:

```typescript
// Example: superset-icon://project-abc123
protocol.handle("superset-icon", (request) => {
  const projectId = new URL(request.url).pathname.replace(/^\//, "");
  const iconPath = getProjectIconPath(projectId);
  return net.fetch(pathToFileURL(iconPath).toString());
});
```

**Sources:** [apps/desktop/src/main/index.ts:289-301]()

### superset-font://

Serves system fonts (macOS only) so the renderer can use `@font-face` with CSP `font-src 'self'`:

```typescript
// Example: superset-font://SFMono-Regular.otf
protocol.handle("superset-font", async (request) => {
  const filename = path.basename(new URL(request.url).pathname);
  // Search system font directories
  for (const dir of SYSTEM_FONT_DIRS) {
    const fontPath = path.join(dir, filename);
    return await net.fetch(pathToFileURL(fontPath).toString());
  }
});
```

**Sources:** [apps/desktop/src/main/index.ts:305-331]()

---

## Security Model

The desktop app follows Electron security best practices:

### Context Isolation

- **Preload script** ([apps/desktop/src/preload/index.ts]()) runs in isolated context
- Exposes limited API surface via `contextBridge`
- Renderer cannot directly access Node.js or Electron APIs

### Content Security Policy

Defined in [apps/desktop/src/renderer/index.html:20]():
- `default-src 'self'` - Only allow same-origin by default
- `script-src 'self' 'wasm-unsafe-eval'` - WebAssembly for xterm.js
- `connect-src` whitelist - API, Electric, PostHog, Sentry, localhost
- No `'unsafe-eval'` - Prevents arbitrary code execution

### IPC Communication

All renderer-to-main communication goes through type-safe tRPC procedures:
- No direct `ipcMain`/`ipcRenderer` usage
- Input validation via Zod schemas
- Type safety enforced at compile time

**Sources:** [apps/desktop/src/renderer/index.html:8-27](), [apps/desktop/src/preload/index.ts]()

---

## Native Module Runtime Dependencies

Several packages require special handling as external native modules:

```mermaid
graph TB
    subgraph "Native Modules"
        NodePTY["node-pty<br/>PTY subprocess"]
        BetterSQLite["better-sqlite3<br/>SQLite driver"]
        LibSQL["libsql<br/>SQLite dialect"]
        ParcelWatcher["@parcel/watcher<br/>File watching"]
        AstGrep["@ast-grep/napi<br/>Code search"]
    end
    
    subgraph "Platform-Specific Packages"
        LibSQLDarwin["@libsql/darwin-arm64<br/>@libsql/darwin-x64"]
        LibSQLLinux["@libsql/linux-x64"]
        AstGrepDarwin["@ast-grep/napi-darwin-arm64"]
        AstGrepLinux["@ast-grep/napi-linux-x64-gnu"]
        ParcelDarwin["@parcel/watcher-darwin-arm64"]
        ParcelLinux["@parcel/watcher-linux-x64-glibc"]
    end
    
    NodePTY -->|Requires| ASAR["ASAR Unpack"]
    BetterSQLite -->|Requires| ASAR
    
    LibSQL -->|Loads| LibSQLDarwin
    LibSQL -->|Loads| LibSQLLinux
    AstGrep -->|Loads| AstGrepDarwin
    AstGrep -->|Loads| AstGrepLinux
    ParcelWatcher -->|Loads| ParcelDarwin
    ParcelWatcher -->|Loads| ParcelLinux
```

The [apps/desktop/scripts/copy-native-modules.ts]() script handles:
1. Replacing Bun symlinks with real files
2. Fetching platform-specific packages for cross-compilation
3. Ensuring all required native binaries are present

**Sources:** [apps/desktop/scripts/copy-native-modules.ts:1-453](), [apps/desktop/runtime-dependencies.ts](), [apps/desktop/electron-builder.ts:47-53]()