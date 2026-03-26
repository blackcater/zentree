# Development Server and Hot Reload

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [deployers/cloudflare/src/index.ts](deployers/cloudflare/src/index.ts)
- [deployers/netlify/src/index.ts](deployers/netlify/src/index.ts)
- [deployers/vercel/src/index.ts](deployers/vercel/src/index.ts)
- [docs/src/content/en/docs/deployment/studio.mdx](docs/src/content/en/docs/deployment/studio.mdx)
- [docs/src/content/en/reference/cli/create-mastra.mdx](docs/src/content/en/reference/cli/create-mastra.mdx)
- [e2e-tests/monorepo/monorepo.test.ts](e2e-tests/monorepo/monorepo.test.ts)
- [e2e-tests/monorepo/template/apps/custom/src/mastra/index.ts](e2e-tests/monorepo/template/apps/custom/src/mastra/index.ts)
- [packages/cli/src/commands/actions/create-project.ts](packages/cli/src/commands/actions/create-project.ts)
- [packages/cli/src/commands/actions/init-project.ts](packages/cli/src/commands/actions/init-project.ts)
- [packages/cli/src/commands/build/BuildBundler.ts](packages/cli/src/commands/build/BuildBundler.ts)
- [packages/cli/src/commands/build/build.ts](packages/cli/src/commands/build/build.ts)
- [packages/cli/src/commands/create/bun-detection.test.ts](packages/cli/src/commands/create/bun-detection.test.ts)
- [packages/cli/src/commands/create/create.test.ts](packages/cli/src/commands/create/create.test.ts)
- [packages/cli/src/commands/create/create.ts](packages/cli/src/commands/create/create.ts)
- [packages/cli/src/commands/create/utils.ts](packages/cli/src/commands/create/utils.ts)
- [packages/cli/src/commands/dev/DevBundler.test.ts](packages/cli/src/commands/dev/DevBundler.test.ts)
- [packages/cli/src/commands/dev/DevBundler.ts](packages/cli/src/commands/dev/DevBundler.ts)
- [packages/cli/src/commands/dev/dev.ts](packages/cli/src/commands/dev/dev.ts)
- [packages/cli/src/commands/init/init.test.ts](packages/cli/src/commands/init/init.test.ts)
- [packages/cli/src/commands/init/init.ts](packages/cli/src/commands/init/init.ts)
- [packages/cli/src/commands/init/utils.ts](packages/cli/src/commands/init/utils.ts)
- [packages/cli/src/commands/studio/studio.test.ts](packages/cli/src/commands/studio/studio.test.ts)
- [packages/cli/src/commands/studio/studio.ts](packages/cli/src/commands/studio/studio.ts)
- [packages/cli/src/commands/utils.test.ts](packages/cli/src/commands/utils.test.ts)
- [packages/cli/src/commands/utils.ts](packages/cli/src/commands/utils.ts)
- [packages/cli/src/index.ts](packages/cli/src/index.ts)
- [packages/cli/src/services/service.deps.ts](packages/cli/src/services/service.deps.ts)
- [packages/cli/src/utils/clone-template.test.ts](packages/cli/src/utils/clone-template.test.ts)
- [packages/cli/src/utils/clone-template.ts](packages/cli/src/utils/clone-template.ts)
- [packages/cli/src/utils/template-utils.test.ts](packages/cli/src/utils/template-utils.test.ts)
- [packages/cli/src/utils/template-utils.ts](packages/cli/src/utils/template-utils.ts)
- [packages/cli/tsconfig.json](packages/cli/tsconfig.json)
- [packages/core/src/bundler/index.ts](packages/core/src/bundler/index.ts)
- [packages/create-mastra/src/index.ts](packages/create-mastra/src/index.ts)
- [packages/create-mastra/src/utils.ts](packages/create-mastra/src/utils.ts)
- [packages/create-mastra/tsconfig.json](packages/create-mastra/tsconfig.json)
- [packages/deployer/src/build/analyze.ts](packages/deployer/src/build/analyze.ts)
- [packages/deployer/src/build/analyze/**snapshots**/analyzeEntry.test.ts.snap](packages/deployer/src/build/analyze/__snapshots__/analyzeEntry.test.ts.snap)
- [packages/deployer/src/build/analyze/analyzeEntry.test.ts](packages/deployer/src/build/analyze/analyzeEntry.test.ts)
- [packages/deployer/src/build/analyze/analyzeEntry.ts](packages/deployer/src/build/analyze/analyzeEntry.ts)
- [packages/deployer/src/build/analyze/bundleExternals.test.ts](packages/deployer/src/build/analyze/bundleExternals.test.ts)
- [packages/deployer/src/build/analyze/bundleExternals.ts](packages/deployer/src/build/analyze/bundleExternals.ts)
- [packages/deployer/src/build/bundler.ts](packages/deployer/src/build/bundler.ts)
- [packages/deployer/src/build/utils.test.ts](packages/deployer/src/build/utils.test.ts)
- [packages/deployer/src/build/utils.ts](packages/deployer/src/build/utils.ts)
- [packages/deployer/src/build/watcher.test.ts](packages/deployer/src/build/watcher.test.ts)
- [packages/deployer/src/build/watcher.ts](packages/deployer/src/build/watcher.ts)
- [packages/deployer/src/bundler/index.ts](packages/deployer/src/bundler/index.ts)
- [packages/deployer/src/server/**tests**/option-studio-base.test.ts](packages/deployer/src/server/__tests__/option-studio-base.test.ts)
- [packages/deployer/src/server/index.ts](packages/deployer/src/server/index.ts)
- [packages/playground/e2e/tests/auth/infrastructure.spec.ts](packages/playground/e2e/tests/auth/infrastructure.spec.ts)
- [packages/playground/e2e/tests/auth/viewer-role.spec.ts](packages/playground/e2e/tests/auth/viewer-role.spec.ts)
- [packages/playground/index.html](packages/playground/index.html)
- [packages/playground/src/App.tsx](packages/playground/src/App.tsx)
- [packages/playground/src/components/ui/app-sidebar.tsx](packages/playground/src/components/ui/app-sidebar.tsx)

</details>

This document describes the `mastra dev` command and its hot reload system, which provides a development server with automatic rebuilding and restarting when source files change. The development server enables rapid iteration by detecting file changes, rebundling code, and restarting the server process without manual intervention.

For information about building production bundles, see [Build System and Dependency Analysis](#8.3). For details on the Studio UI served during development, see [Studio UI and Playground](#10.6).

## Architecture Overview

The development server consists of three primary components: the **DevBundler** class that watches and rebuilds code using Rollup, the **dev()** function that manages the server process lifecycle via execa, and the **createWatcher()** function that detects file changes.

```mermaid
graph TB
    subgraph "CLI Entry"
        DevFn["dev() function<br/>packages/cli/src/commands/dev/dev.ts:340"]
    end

    subgraph "Bundler Layer"
        DevBundlerCls["DevBundler class<br/>watch() method"]
        CreateWatcher["createWatcher()<br/>packages/deployer/src/build/watcher.ts:96"]
        GetInputOpts["getInputOptions()<br/>packages/deployer/src/build/watcher.ts:16"]
    end

    subgraph "Server Process"
        StartServer["startServer()<br/>dev.ts:67"]
        ExecaProc["execa(process.execPath, commands)<br/>dev.ts:109"]
        IndexMjs[".mastra/output/index.mjs"]
        DevEntryJs["dev.entry.js template<br/>DevBundler.ts:131"]
    end

    subgraph "File System"
        MastraEntry["src/mastra/index.ts"]
        ToolsGlob["tools/**/*.{js,ts}<br/>getAllToolPaths()"]
        EnvFiles["getEnvFiles()<br/>.env.development/.env.local/.env"]
        OutputDir[".mastra/output/"]
    end

    subgraph "Hot Reload Endpoints"
        HotReloadStatus["GET /__hot-reload-status<br/>checkAndRestart():275"]
        RefreshPost["POST /__refresh<br/>startServer():194"]
        RestartWorkflows["POST /__restart-active-workflow-runs<br/>startServer():190"]
    end

    DevFn -->|"new DevBundler(env)"| DevBundlerCls
    DevFn -->|"calls startServer()"| StartServer

    DevBundlerCls -->|"calls watch()"| CreateWatcher
    DevBundlerCls -->|"loadEnvVars()"| EnvFiles
    DevBundlerCls -->|"getAllToolPaths()"| ToolsGlob

    CreateWatcher -->|"uses"| GetInputOpts
    CreateWatcher -->|"watches"| MastraEntry
    CreateWatcher -->|"watches"| ToolsGlob
    CreateWatcher -->|"watches via plugin"| EnvFiles
    CreateWatcher -->|"event: BUNDLE_END"| DevFn

    DevFn -->|"checks before restart"| HotReloadStatus
    DevFn -->|"rebundleAndRestart()"| DevBundlerCls
    DevBundlerCls -->|"writes bundles"| OutputDir

    StartServer -->|"spawns"| ExecaProc
    ExecaProc -->|"executes"| IndexMjs
    IndexMjs -->|"generated from"| DevEntryJs

    StartServer -->|"after IPC ready"| RefreshPost
    StartServer -->|"after IPC ready"| RestartWorkflows
```

**Sources:** [packages/cli/src/commands/dev/dev.ts:1-499](), [packages/cli/src/commands/dev/DevBundler.ts:1-166](), [packages/deployer/src/build/watcher.ts:1-109]()

## DevBundler Class

The `DevBundler` class extends the base `Bundler` and configures Rollup for development with hot reloading. It detects the runtime environment (Node.js vs Bun) and adjusts the bundler platform accordingly.

```mermaid
graph TB
    DevBundler["DevBundler<br/>packages/cli/src/commands/dev/DevBundler.ts"]
    Bundler["Bundler<br/>packages/deployer/src/bundler/index.ts"]
    MastraBundler["MastraBundler<br/>packages/core/src/bundler/index.ts"]

    DevBundler -->|extends| Bundler
    Bundler -->|extends| MastraBundler

    DevBundler -->|platform = bun ? 'neutral' : 'node'| PlatformDetection["Platform Detection<br/>(line 20)"]
    DevBundler -->|getEnvFiles| EnvFileService[".env.development<br/>.env.local<br/>.env"]
    DevBundler -->|prepare| StudioCopy["Copy Studio UI<br/>to .mastra/output/studio"]
    DevBundler -->|watch| WatcherSetup["Setup Rollup Watcher<br/>with tool plugins"]

    WatcherSetup -->|env-watcher plugin| EnvWatcher["Watches .env files<br/>(lines 101-107)"]
    WatcherSetup -->|tools-watcher plugin| ToolsWatcher["Generates tools.mjs<br/>(lines 109-128)"]
```

**Key Methods:**

| Method                                          | Purpose                                                                                                      | Line Reference                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `constructor(customEnvFile?)`                   | Initializes bundler, sets `this.platform` based on `process.versions.bun`                                    | [packages/cli/src/commands/dev/DevBundler.ts:16-21]()   |
| `getEnvFiles()`                                 | Returns first existing file from `['.env.development', '.env.local', '.env']`, respects `MASTRA_SKIP_DOTENV` | [packages/cli/src/commands/dev/DevBundler.ts:23-44]()   |
| `prepare(outputDirectory)`                      | Calls `super.prepare()`, copies Studio UI from `dist/studio` to `.mastra/output/studio`                      | [packages/cli/src/commands/dev/DevBundler.ts:46-56]()   |
| `watch(entryFile, outputDirectory, toolsPaths)` | Calls `getWatcherInputOptions()`, adds custom plugins, returns `createWatcher()` promise                     | [packages/cli/src/commands/dev/DevBundler.ts:58-160]()  |
| `bundle()`                                      | No-op implementation (development mode doesn't use standard bundle)                                          | [packages/cli/src/commands/dev/DevBundler.ts:162-165]() |

The `watch()` method at line 58 configures a Rollup watcher with two critical plugins:

1. **env-watcher** plugin: Implements `buildStart()` hook that calls `this.addWatchFile(envFile)` for each discovered .env file [packages/cli/src/commands/dev/DevBundler.ts:101-107]()
2. **tools-watcher** plugin: Implements async `buildEnd()` hook that generates `tools.mjs` with import statements like `import * as tool0 from './tools/{uuid}.mjs'` [packages/cli/src/commands/dev/DevBundler.ts:109-128]()

The input configuration at line 130 uses `join(__dirname, 'templates', 'dev.entry.js')` as the main entry point, which differs from production builds that use virtual entry strings.

**Sources:** [packages/cli/src/commands/dev/DevBundler.ts:13-166](), [packages/deployer/src/bundler/index.ts:28-463]()

## Server Process Lifecycle

The dev command manages the server process lifecycle through `startServer`, `rebundleAndRestart`, and `checkAndRestart` functions. The lifecycle includes starting, monitoring, and gracefully restarting the Node.js process.

```mermaid
sequenceDiagram
    participant DevCmd as dev command
    participant Bundler as DevBundler
    participant Watcher as Rollup Watcher
    participant Server as Node.js Process
    participant IPC as IPC Channel

    DevCmd->>Bundler: prepare(outputDirectory)
    DevCmd->>Bundler: watch(entryFile, outputDir, tools)
    Bundler->>Watcher: createWatcher(inputOptions, outputOptions)
    Watcher-->>DevCmd: watcher instance

    Note over Watcher: Initial bundle starts
    Watcher->>Watcher: BUNDLE_START event
    Watcher->>Watcher: BUNDLE_END event

    DevCmd->>Server: startServer(dotMastraPath, options)
    Server->>DevCmd: IPC message {type: 'server-ready'}
    DevCmd->>Server: POST /__restart-active-workflow-runs
    DevCmd->>Server: POST /__refresh

    Note over Watcher: File change detected
    Watcher->>Watcher: BUNDLE_START event
    Watcher->>Watcher: BUNDLE_END event
    Watcher->>DevCmd: event.code === 'BUNDLE_END'

    DevCmd->>Server: GET /__hot-reload-status
    Server-->>DevCmd: {disabled: false, timestamp}

    DevCmd->>Server: kill('SIGINT')
    DevCmd->>Bundler: loadEnvVars()
    DevCmd->>Server: startServer(dotMastraPath, options)
    Server->>DevCmd: IPC message {type: 'server-ready'}
    DevCmd->>Server: POST /__restart-active-workflow-runs
    DevCmd->>Server: POST /__refresh
```

**Server Startup Process:**

The `startServer` function spawns a Node.js child process using `execa` with specific configurations:

| Configuration          | Value                                | Purpose                            |
| ---------------------- | ------------------------------------ | ---------------------------------- |
| `NODE_ENV`             | `'production'`                       | Optimizes dependencies for runtime |
| `MASTRA_DEV`           | `'true'`                             | Signals development mode to server |
| `PORT`                 | Configured or auto-selected          | Server listen port                 |
| `MASTRA_PACKAGES_FILE` | Path to JSON file                    | Passes package version info        |
| `stdio`                | `['inherit', 'pipe', 'pipe', 'ipc']` | Enables IPC communication          |

The process writes discovered Mastra packages to `mastra-packages.json` which is passed via environment variable to the server process [packages/cli/src/commands/dev/dev.ts:101-106]().

**Error Recovery:**

The server implements automatic restart on error with a maximum retry limit:

```mermaid
graph LR
    ServerError["Server Error Detected"]
    CheckRetries{"errorRestartCount<br/>< ON_ERROR_MAX_RESTARTS<br/>(3)"}
    IncrementCounter["Increment errorRestartCount"]
    RestartServer["Restart Server<br/>(after 1s delay)"]
    GiveUp["Log Error<br/>Exit Process"]

    ServerError --> CheckRetries
    CheckRetries -->|Yes| IncrementCounter
    IncrementCounter --> RestartServer
    CheckRetries -->|No| GiveUp
```

**Sources:** [packages/cli/src/commands/dev/dev.ts:67-261](), [packages/cli/src/commands/dev/dev.ts:234-260]()

## File Watching and Hot Reload Mechanism

The hot reload system monitors source files and environment variables, triggering rebuilds and server restarts when changes occur.

### Watch Configuration

The Rollup watcher monitors multiple file types:

```mermaid
graph TB
    Watcher["Rollup Watcher"]

    subgraph "Watched Files"
        EntryFile["Mastra Entry File<br/>src/mastra/index.ts"]
        ToolFiles["Tool Files<br/>tools/**/*.{js,ts}"]
        EnvFiles[".env Files<br/>via env-watcher plugin"]
    end

    subgraph "Generated Outputs"
        IndexMjs[".mastra/output/index.mjs"]
        ToolsMjs[".mastra/output/tools.mjs"]
        ToolChunks[".mastra/output/tools/*.mjs"]
    end

    Watcher -->|watches| EntryFile
    Watcher -->|watches| ToolFiles
    Watcher -->|watches via plugin| EnvFiles

    EntryFile -->|bundles to| IndexMjs
    ToolFiles -->|bundles to| ToolsMjs
    ToolFiles -->|individual chunks| ToolChunks
```

The watcher emits events that the dev command listens to:

| Event Code     | Handler                | Action                                               |
| -------------- | ---------------------- | ---------------------------------------------------- |
| `BUNDLE_START` | `devLogger.bundling()` | Display "Bundling..." message                        |
| `BUNDLE_END`   | `checkAndRestart()`    | Verify hot reload status, then restart server        |
| `ERROR`        | Error handler          | Display error, potentially restart on certain errors |

**Sources:** [packages/cli/src/commands/dev/dev.ts:465-485](), [packages/cli/src/commands/dev/DevBundler.ts:84-139]()

### Hot Reload Status Check

Before restarting the server, the `checkAndRestart()` function at line 263 queries the `/__hot-reload-status` endpoint to determine if hot reload should be skipped:

```mermaid
sequenceDiagram
    participant CheckRestart as "checkAndRestart()<br/>dev.ts:263"
    participant FetchStatus as "fetch(/__hot-reload-status)<br/>dev.ts:275"
    participant Server as "Mastra Server"
    participant AgentBuilder as "Agent Builder"

    Note over CheckRestart: BUNDLE_END event received<br/>from watcher.on('event')

    CheckRestart->>CheckRestart: "if (isRestarting) return"<br/>Guard check

    CheckRestart->>FetchStatus: "GET http://{host}:{port}{studioBase}/__hot-reload-status"
    FetchStatus->>Server: HTTP GET request

    alt Agent Builder Active
        Server->>AgentBuilder: Check installation status
        AgentBuilder-->>Server: Installation in progress
        Server-->>FetchStatus: "{disabled: true, timestamp}"
        FetchStatus-->>CheckRestart: Response parsed
        Note over CheckRestart: "devLogger.info('⏸️ Server restart skipped')"<br/>Return early
    else No Active Operations
        Server-->>FetchStatus: "{disabled: false, timestamp}"
        FetchStatus-->>CheckRestart: Response parsed
        CheckRestart->>CheckRestart: "await rebundleAndRestart()"<br/>Proceed with restart
    end
```

This mechanism prevents server restarts during long-running operations like template installations that occur via the agent builder UI [packages/cli/src/commands/dev/dev.ts:274-286]().

**Sources:** [packages/cli/src/commands/dev/dev.ts:263-291]()

## Environment Variable Management

The DevBundler loads environment variables from multiple sources with precedence rules:

```mermaid
graph TB
    LoadEnv["loadEnvVars()"]

    subgraph "Environment File Priority"
        direction TB
        Custom[".env.custom<br/>(if --env flag used)"]
        DevEnv[".env.development"]
        LocalEnv[".env.local"]
        BaseEnv[".env"]
    end

    subgraph "Processing"
        Parse["Parse with dotenv"]
        MergeMap["Merge into Map<string, string>"]
        SpreadToProcess["Spread to process.env"]
    end

    LoadEnv --> Custom
    Custom --> DevEnv
    DevEnv --> LocalEnv
    LocalEnv --> BaseEnv

    Custom --> Parse
    DevEnv --> Parse
    LocalEnv --> Parse
    BaseEnv --> Parse

    Parse --> MergeMap
    MergeMap --> SpreadToProcess
```

The `getEnvFiles()` method at line 23 returns the first existing file from the priority list. It checks `shouldSkipDotenvLoading()` which reads the `MASTRA_SKIP_DOTENV` environment variable [packages/cli/src/commands/dev/DevBundler.ts:23-44]().

Environment variables are reloaded on each server restart within `rebundleAndRestart()` at line 293:

```typescript
// From rebundleAndRestart function at line 312
const env = await bundler.loadEnvVars()

// Add request context presets to env if available
if (requestContextPresetsJson) {
  env.set('MASTRA_REQUEST_CONTEXT_PRESETS', requestContextPresetsJson)
}

// spread env into process.env
for (const [key, value] of env.entries()) {
  process.env[key] = value
}
```

The base `loadEnvVars()` implementation in `MastraBundler` at [packages/core/src/bundler/index.ts:25-38]() uses the `dotenv` `parse()` function to read each file and merges values into a `Map<string, string>`.

**Sources:** [packages/cli/src/commands/dev/dev.ts:312-323](), [packages/cli/src/commands/dev/DevBundler.ts:23-44](), [packages/core/src/bundler/index.ts:25-38]()

## Tool Discovery and Bundling

The development server automatically discovers and bundles tool files from the tools directory.

### Tool Path Resolution

The `getAllToolPaths` method discovers tools using glob patterns:

```mermaid
graph TB
    GetAllTools["getAllToolPaths(mastraDir, toolsPaths)"]

    subgraph "Default Paths"
        DefaultPattern["mastraDir/tools/**/*.{js,ts}"]
        IgnoreTests["!mastraDir/tools/**/*.{test,spec}.{js,ts}"]
        IgnoreTestDirs["!mastraDir/tools/**/__tests__/**"]
    end

    subgraph "User-Specified Paths"
        CustomPaths["toolsPaths array<br/>(from --tools flag)"]
    end

    subgraph "Path Normalization"
        SlashUtil["slash() utility"]
        PosixJoin["posix.join()"]
    end

    GetAllTools --> DefaultPattern
    GetAllTools --> IgnoreTests
    GetAllTools --> IgnoreTestDirs
    GetAllTools --> CustomPaths

    DefaultPattern --> SlashUtil
    CustomPaths --> SlashUtil
    SlashUtil --> PosixJoin

    PosixJoin --> CombinedPaths["Combined Paths Array<br/>[defaultPaths, ...toolsPaths]"]
```

### Tool Bundling Process

Tools are bundled as separate entry points with unique IDs assigned by `crypto.randomUUID()`:

```mermaid
sequenceDiagram
    participant ListTools as "listToolsInputOptions()<br/>bundler/index.ts:232"
    participant Glob as "glob() from tinyglobby<br/>line 236"
    participant FileCheck as "FileService.getFirstExistingFile()<br/>line 243"
    participant Watcher as "Rollup Watcher"
    participant Plugin as "tools-watcher plugin<br/>DevBundler.ts:109"

    ListTools->>ListTools: "const inputs: Record<string, string> = {}"

    loop "for (const toolPath of toolsPaths)"
        ListTools->>Glob: "glob(toolPath, {absolute: true, expandDirectories: false})"
        Glob-->>ListTools: "expandedPaths: string[]"

        loop "for (const path of expandedPaths)"
            ListTools->>FileCheck: "getFirstExistingFile([join(path, 'index.ts'), join(path, 'index.js'), path])"
            FileCheck-->>ListTools: "entryFile or undefined"

            alt "entryFile exists and is not directory"
                ListTools->>ListTools: "const uniqueToolID = crypto.randomUUID()"
                ListTools->>ListTools: "inputs[`tools/${uniqueToolID}`] = normalizedEntryFile"
            else "No valid entry file"
                ListTools->>ListTools: "logger.warn('No entry file found')"
            end
        end
    end

    ListTools-->>Watcher: "return inputs object"
    Watcher->>Watcher: "Bundle each tool as separate chunk"
    Watcher->>Plugin: "buildEnd hook triggered"
    Plugin->>Plugin: "Generate tools.mjs with import statements"

    Note over Plugin: "Generated tools.mjs:<br/>import * as tool0 from './tools/{uuid-1}.mjs';<br/>import * as tool1 from './tools/{uuid-2}.mjs';<br/>export const tools = [tool0, tool1]"
```

Each tool is assigned a random UUID via `crypto.randomUUID()` at line 256 to avoid naming conflicts. The final output is `.mastra/output/tools/{UUID}.mjs` [packages/deployer/src/bundler/index.ts:232-267]().

**Sources:** [packages/deployer/src/bundler/index.ts:209-267](), [packages/cli/src/commands/dev/DevBundler.ts:78-128]()

## Restart Flow and State Management

The restart process coordinates multiple asynchronous operations while preventing race conditions:

```mermaid
stateDiagram-v2
    [*] --> Watching: Initial startup

    Watching --> CheckingRestart: File change detected

    state CheckingRestart {
        [*] --> IsRestartingCheck
        IsRestartingCheck --> Skip: isRestarting === true
        IsRestartingCheck --> CheckHotReload: isRestarting === false

        CheckHotReload --> FetchStatus: GET /__hot-reload-status
        FetchStatus --> SkipRestart: disabled: true
        FetchStatus --> ProceedRestart: disabled: false

        SkipRestart --> [*]
    }

    CheckingRestart --> Watching: Skip (already restarting)
    CheckingRestart --> Watching: Skip (agent builder active)
    CheckingRestart --> Restarting: Proceed with restart

    state Restarting {
        [*] --> SetFlag: isRestarting = true
        SetFlag --> KillServer: Kill current process (SIGINT)
        KillServer --> LoadEnv: Load environment variables
        LoadEnv --> StartServer: Start new process
        StartServer --> WaitReady: Wait for IPC 'server-ready'
        WaitReady --> ClearFlag: isRestarting = false
        ClearFlag --> [*]
    }

    Restarting --> Watching: Restart complete
```

### State Variables

| Variable                    | Type                        | Purpose                                                                                                    | Location                                    |
| --------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `currentServerProcess`      | `ChildProcess \| undefined` | Reference to running server returned by execa                                                              | [packages/cli/src/commands/dev/dev.ts:21]() |
| `isRestarting`              | `boolean`                   | Guard flag checked by `checkAndRestart()` to prevent concurrent restarts                                   | [packages/cli/src/commands/dev/dev.ts:22]() |
| `serverStartTime`           | `number \| undefined`       | Set by `Date.now()` at line 77, used by `devLogger.ready()` to display startup time                        | [packages/cli/src/commands/dev/dev.ts:23]() |
| `requestContextPresetsJson` | `string \| undefined`       | JSON string from `loadAndValidatePresets()`, passed to server via `MASTRA_REQUEST_CONTEXT_PRESETS` env var | [packages/cli/src/commands/dev/dev.ts:24]() |
| `ON_ERROR_MAX_RESTARTS`     | `const number = 3`          | Maximum automatic restart attempts after server errors                                                     | [packages/cli/src/commands/dev/dev.ts:25]() |

**Sources:** [packages/cli/src/commands/dev/dev.ts:21-25](), [packages/cli/src/commands/dev/dev.ts:263-338]()

## IPC Communication and Server Readiness

The dev command and server process communicate via IPC to coordinate the hot reload cycle:

```mermaid
sequenceDiagram
    participant DevCmd as dev command
    participant ChildProc as Child Process (execa)
    participant Server as Mastra Server

    DevCmd->>ChildProc: spawn with stdio: ['inherit', 'pipe', 'pipe', 'ipc']

    Note over ChildProc: Server initializing...

    Server->>ChildProc: process.send({type: 'server-ready'})
    ChildProc->>DevCmd: IPC message event

    DevCmd->>DevCmd: serverIsReady = true
    DevCmd->>DevCmd: devLogger.ready(host, port, studioBase)
    DevCmd->>DevCmd: devLogger.watching()

    par Parallel Operations
        DevCmd->>Server: POST /__restart-active-workflow-runs
        and
        DevCmd->>Server: POST /__refresh (after 1.5s retry)
    end

    Note over DevCmd: Server ready for requests
```

The IPC message handler listens for the `server-ready` message type to know when the server is fully initialized and ready to accept connections [packages/cli/src/commands/dev/dev.ts:184-214]().

### Output Filtering

The dev command filters server output to avoid duplicate log messages:

```typescript
// Filter server output to remove Studio message
if (currentServerProcess.stdout) {
  currentServerProcess.stdout.on('data', (data: Buffer) => {
    const output = data.toString()
    if (
      !output.includes('Studio available') &&
      !output.includes('👨‍💻') &&
      !output.includes('Mastra API running on ')
    ) {
      process.stdout.write(output)
    }
  })
}
```

These messages are filtered because the dev command displays its own formatted startup messages [packages/cli/src/commands/dev/dev.ts:138-149]().

**Sources:** [packages/cli/src/commands/dev/dev.ts:109-214]()

## Studio Integration

The development server includes Studio UI assets and communicates with them via special endpoints:

```mermaid
graph TB
    subgraph "Dev Command"
        DevCmd["dev command"]
    end

    subgraph "DevBundler prepare()"
        CopyStudio["Copy Studio Assets<br/>packages/cli/src/dist/studio"]
        StudioDest[".mastra/output/studio/"]
    end

    subgraph "Server Process"
        MastraServer["Mastra Server"]
        ServeStudio["Serve Static Files<br/>from studio/"]
        RefreshEndpoint["POST /__refresh"]
        HotReloadStatus["GET /__hot-reload-status"]
    end

    subgraph "Browser"
        StudioUI["Studio UI<br/>localhost:4111"]
        SSE["Server-Sent Events<br/>Connection"]
    end

    DevCmd -->|calls| CopyStudio
    CopyStudio --> StudioDest

    MastraServer --> ServeStudio
    ServeStudio --> StudioDest

    StudioUI -->|HTTP| MastraServer
    StudioUI -->|SSE| MastraServer

    DevCmd -->|POST after restart| RefreshEndpoint
    RefreshEndpoint -->|triggers| SSE
    SSE -->|notify| StudioUI

    DevCmd -->|GET before restart| HotReloadStatus
```

### Studio Copy Process

During the `prepare` phase, DevBundler copies Studio UI assets:

```typescript
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const studioServePath = join(outputDirectory, this.outputDir, 'studio')
await fsExtra.copy(
  join(dirname(__dirname), join('dist', 'studio')),
  studioServePath,
  {
    overwrite: true,
  }
)
```

The Studio assets are packaged with the CLI at build time and copied to `.mastra/output/studio` [packages/cli/src/commands/dev/DevBundler.ts:49-55]().

### Refresh Mechanism

After each server restart, the dev command sends a POST request to `/__refresh`:

1. Server restarts and sends `server-ready` IPC message
2. Dev command waits briefly for server to stabilize
3. POST request sent to `/__refresh` endpoint
4. Server broadcasts refresh signal via SSE to connected Studio clients
5. Studio UI reloads agent/workflow definitions

The refresh includes a retry mechanism with 1.5 second delay if the initial request fails [packages/cli/src/commands/dev/dev.ts:193-213]().

**Sources:** [packages/cli/src/commands/dev/dev.ts:193-214](), [packages/cli/src/commands/dev/DevBundler.ts:46-56]()

## Request Context Presets

The dev command supports loading request context presets from a JSON file to provide test data for the Studio UI:

```mermaid
graph LR
    DevCmd["dev command<br/>--request-context-presets flag"]
    LoadPresets["loadAndValidatePresets()"]
    PresetsFile["JSON file with presets"]
    Validate["Validate structure"]
    SerializeJSON["Serialize to JSON string"]
    EnvVar["MASTRA_REQUEST_CONTEXT_PRESETS"]
    Server["Server Process"]

    DevCmd -->|path argument| LoadPresets
    LoadPresets --> PresetsFile
    PresetsFile --> Validate
    Validate --> SerializeJSON
    SerializeJSON --> EnvVar
    EnvVar --> Server
```

The presets are validated and serialized before being passed to the server process:

```typescript
// Load and validate request context presets if provided
if (requestContextPresets) {
  try {
    requestContextPresetsJson = await loadAndValidatePresets(
      requestContextPresets
    )
    // Add presets to loaded env so it's passed to the server
    loadedEnv.set('MASTRA_REQUEST_CONTEXT_PRESETS', requestContextPresetsJson)
  } catch (error) {
    devLogger.error(
      `Failed to load request context presets: ${error instanceof Error ? error.message : error}`
    )
    process.exit(1)
  }
}
```

The presets are cleared at the start of each `dev` invocation to prevent cross-run leakage [packages/cli/src/commands/dev/dev.ts:378-397]().

**Sources:** [packages/cli/src/commands/dev/dev.ts:378-398]()

## HTTPS Support

The dev command supports HTTPS via two configuration methods:

### Certificate Generation

```mermaid
graph TB
    HTTPSConfig{"HTTPS<br/>Configuration?"}

    FlagOnly["--https flag<br/>(command line)"]
    ServerConfig["server.https<br/>(in mastra config)"]

    GenerateCert["Generate Certificate<br/>via @expo/devcert"]
    ProvidedCert["Use Provided<br/>{key, cert}"]

    ServerOptions["Server Options<br/>{https: {key, cert}}"]
    EnvVars["Environment Variables<br/>MASTRA_HTTPS_KEY<br/>MASTRA_HTTPS_CERT"]

    HTTPSConfig -->|flag only| FlagOnly
    HTTPSConfig -->|config| ServerConfig
    HTTPSConfig -->|both| ServerConfig

    FlagOnly --> GenerateCert
    ServerConfig --> ProvidedCert

    GenerateCert --> ServerOptions
    ProvidedCert --> ServerOptions

    ServerOptions --> EnvVars
```

When both `--https` flag and `server.https` config are provided, the config takes precedence with a warning [packages/cli/src/commands/dev/dev.ts:423-425]().

The certificate is generated using `@expo/devcert` which creates a trusted local development certificate:

```typescript
if (https && serverOptions?.https) {
  devLogger.warn(
    '--https flag and server.https config are both specified. Using server.https config.'
  )
}
if (serverOptions?.https) {
  httpsOptions = serverOptions.https
} else if (https) {
  const { key, cert } = await devcert.certificateFor(
    serverOptions?.host ?? 'localhost'
  )
  httpsOptions = { key, cert }
}
```

The certificate buffers are base64-encoded and passed as environment variables to the child process [packages/cli/src/commands/dev/dev.ts:117-121]().

**Sources:** [packages/cli/src/commands/dev/dev.ts:414-431](), [packages/cli/src/commands/dev/dev.ts:117-121]()

## Platform Detection and Bundler Configuration

The DevBundler detects the runtime platform and adjusts bundler configuration accordingly:

```mermaid
graph TB
    Constructor["DevBundler constructor"]
    CheckRuntime{"process.versions.bun<br/>exists?"}

    BunPlatform["platform = 'neutral'"]
    NodePlatform["platform = 'node'"]

    BundlerConfig["Bundler Configuration"]

    Constructor --> CheckRuntime
    CheckRuntime -->|Yes| BunPlatform
    CheckRuntime -->|No| NodePlatform

    BunPlatform --> BundlerConfig
    NodePlatform --> BundlerConfig

    BundlerConfig --> NodeResolve["Node Resolution:<br/>node: preferBuiltins: true<br/>neutral: similar to node"]
    BundlerConfig --> Esbuild["Esbuild Transform:<br/>platform setting affects<br/>global handling"]
```

### Platform-Specific Behavior

| Platform    | Value               | Use Case                 | Global Handling                     |
| ----------- | ------------------- | ------------------------ | ----------------------------------- |
| `'node'`    | Default for Node.js | Standard Node.js runtime | Externalizes Node.js built-ins      |
| `'neutral'` | Used for Bun        | Bun runtime support      | Preserves Bun globals like `Bun.s3` |

The platform setting is passed to the watcher's input options, affecting how imports and globals are handled [packages/cli/src/commands/dev/DevBundler.ts:16-21](), [packages/deployer/src/build/watcher.ts:16-28]().

**Sources:** [packages/cli/src/commands/dev/DevBundler.ts:13-21](), [packages/deployer/src/build/bundler.ts:20-162]()

## Development vs Production Bundling

The development server differs from production builds in several key ways:

```mermaid
graph TB
    subgraph "Development (mastra dev)"
        DevExternal["externals: true"]
        DevWorkspace["Bundle workspace packages only"]
        DevWatch["Watch mode enabled"]
        DevSourcemap["Sourcemaps: from config"]
        DevEsmShim["ESM shim: enabled"]
    end

    subgraph "Production (mastra build)"
        ProdExternal["externals: from config or true"]
        ProdAll["Bundle all dependencies"]
        ProdNoWatch["No watch mode"]
        ProdSourcemap["Sourcemaps: from config"]
        ProdEsmShim["ESM shim: platform-specific"]
    end

    subgraph "Watcher Specifics"
        DevGetInput["getInputOptions<br/>(watcher.ts)"]
        DevAnalyze["analyzeBundle<br/>isDev: true"]
        DevExternalize["External dependencies<br/>not bundled"]
    end

    subgraph "Build Specifics"
        ProdGetInput["getBundlerOptions<br/>(bundler/index.ts)"]
        ProdAnalyze["analyzeBundle<br/>isDev: false"]
        ProdOptimize["Dependencies<br/>optimized & bundled"]
    end
```

### Key Differences Table

| Aspect                  | Development                 | Production                   |
| ----------------------- | --------------------------- | ---------------------------- |
| Dependency bundling     | Workspace packages only     | All or configured externals  |
| Watch mode              | Enabled with Rollup watcher | Disabled                     |
| Rebuild trigger         | File changes                | Manual `mastra build`        |
| Server restart          | Automatic                   | Manual start                 |
| Dependency optimization | Minimal (faster rebuilds)   | Full (smaller bundles)       |
| `isDev` flag            | `true` in analyzeBundle     | `false` in analyzeBundle     |
| Studio assets           | Copied to output            | Optional via `--studio` flag |

The `isDev` flag affects how workspace dependencies are analyzed. In development, the analyzer recursively checks transitive workspace dependencies to ensure proper hot reloading [packages/deployer/src/build/analyze.ts:387-394]().

**Sources:** [packages/deployer/src/build/watcher.ts:33-63](), [packages/deployer/src/bundler/index.ts:269-307](), [packages/deployer/src/build/analyze/bundleExternals.ts:457-467]()

## Graceful Shutdown

The dev command registers signal handlers to ensure clean shutdown:

```mermaid
sequenceDiagram
    participant User
    participant DevCmd as dev command
    participant Server as Child Process
    participant Watcher as Rollup Watcher

    User->>DevCmd: Ctrl+C (SIGINT)

    DevCmd->>DevCmd: devLogger.shutdown()

    par Shutdown Operations
        DevCmd->>Server: kill()
        and
        DevCmd->>Watcher: watcher.close()
    end

    Watcher-->>DevCmd: close resolved

    DevCmd->>DevCmd: process.exit(0)
```

The SIGINT handler performs cleanup in parallel for faster shutdown:

```typescript
process.on('SIGINT', () => {
  devLogger.shutdown()

  if (currentServerProcess) {
    currentServerProcess.kill()
  }

  watcher
    .close()
    .catch(() => {})
    .finally(() => process.exit(0))
})
```

This ensures the Rollup watcher is properly closed and the server process is terminated before exiting [packages/cli/src/commands/dev/dev.ts:487-498]().

**Sources:** [packages/cli/src/commands/dev/dev.ts:487-498]()
