# Application Modes

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/workflows/build-and-release.yml](.github/workflows/build-and-release.yml)
- [bun.lock](bun.lock)
- [electron-builder.yml](electron-builder.yml)
- [package.json](package.json)
- [scripts/README.md](scripts/README.md)
- [scripts/afterPack.js](scripts/afterPack.js)
- [scripts/afterSign.js](scripts/afterSign.js)
- [scripts/build-with-builder.js](scripts/build-with-builder.js)
- [scripts/rebuildNativeModules.js](scripts/rebuildNativeModules.js)
- [src/index.ts](src/index.ts)
- [tests/unit/common/appEnv.test.ts](tests/unit/common/appEnv.test.ts)
- [tests/unit/directoryApi.test.ts](tests/unit/directoryApi.test.ts)
- [tests/unit/extensions/extensionLoader.test.ts](tests/unit/extensions/extensionLoader.test.ts)

</details>



AionUi supports three distinct operational modes that determine how the application runs and what interfaces it exposes. Each mode serves a specific use case and follows different initialization paths.

This page documents the mode detection logic, configuration resolution, and initialization flow for each mode. For details on the Electron window management and system tray integration used in Desktop mode, see [Electron Framework](3.2). For information on the Express server implementation used in WebUI mode, see [WebUI Server Architecture](3.5).

---

## Mode Overview

AionUi determines its operational mode at startup based on command-line arguments. The three modes are mutually exclusive:

| Mode | Trigger | Primary Use Case | Process Type |
|------|---------|-----------------|--------------|
| **Desktop** | Default (no flags) | Standard GUI application | Main + Renderer |
| **WebUI** | `--webui` flag | Remote access via web browser | Main only (headless) |
| **CLI** | `--resetpass` command | Password reset utility | Main only (headless) |

The mode detection happens early in the application lifecycle, before the Electron `ready` event, to ensure proper Chromium configuration.

**Sources:** [src/index.ts:166-185](), [src/index.ts:256-258]()

---

## Mode Detection and Selection

### Detection Logic

Title: Application Mode Selection Logic
```mermaid
graph TB
    START["Application Start"]
    PARSE["Parse Command-Line Arguments<br/>(process.argv)"]
    
    CHECK_RESET{"--resetpass<br/>present?"}
    CHECK_WEBUI{"--webui<br/>present?"}
    
    MODE_CLI["isResetPasswordMode = true"]
    MODE_WEBUI["isWebUIMode = true"]
    MODE_DESKTOP["Desktop Mode<br/>(default)"]
    
    REMOTE_CHECK{"--remote<br/>present?"}
    SET_REMOTE["isRemoteMode = true"]
    
    START --> PARSE
    PARSE --> CHECK_RESET
    CHECK_RESET -->|Yes| MODE_CLI
    CHECK_RESET -->|No| CHECK_WEBUI
    CHECK_WEBUI -->|Yes| MODE_WEBUI
    CHECK_WEBUI -->|No| MODE_DESKTOP
    
    MODE_WEBUI --> REMOTE_CHECK
    REMOTE_CHECK -->|Yes| SET_REMOTE
    REMOTE_CHECK -->|No| MODE_WEBUI
```

**Mode Detection Implementation**

The mode is determined by scanning `process.argv` for specific flags using helper functions `hasSwitch` and `hasCommand`:

- `isResetPasswordMode`: Detected by `hasCommand('--resetpass')` - exact match in `process.argv` [src/index.ts:185-185]().
- `isWebUIMode`: Detected by `hasSwitch('webui')` - matches `--webui` [src/index.ts:166-181]().
- `isRemoteMode`: Detected by `hasSwitch('remote')` - enables remote network access for WebUI [src/index.ts:182-182]().

**Sources:** [src/index.ts:166-185]()

---

## Desktop Mode

Desktop mode is the default operational mode, providing a standard Electron-based GUI application with a `BrowserWindow` and optional system tray integration.

### Desktop Mode Initialization Flow

Title: Desktop Mode Startup Sequence
```mermaid
sequenceDiagram
    participant App as "Electron app"
    participant Init as "initializeProcess()"
    participant ACP as "initializeAcpDetector()"
    participant Window as "createWindow()"
    participant Tray as "System Tray"
    participant Bridge as "IPC Bridge"
    
    App->>App: "app.whenReady()"
    App->>Init: "Initialize storage, config, agents"
    
    Note over ACP: "Pre-window initialization<br/>prevents SWR caching race"
    App->>ACP: "Detect available ACP CLIs"
    ACP-->>App: "Detection complete"
    
    App->>Window: "Create BrowserWindow"
    Window->>Window: "Calculate window size<br/>(80% of screen)"
    Window->>Window: "Load renderer HTML"
    Window->>Bridge: "Register IPC handlers"
    
    App->>Tray: "Load closeToTray setting"
    alt closeToTray enabled
        App->>Tray: "createOrUpdateTray()"
    end
    
    Window-->>App: "Window ready"
    App->>App: "Handle pending deep links"
```

### Window Creation

The `createWindow()` function creates a `BrowserWindow` with platform-specific titlebar configuration [src/index.ts:353-472](). Window dimensions are calculated as 80% of the primary display's work area to ensure visibility on high-resolution displays [src/index.ts:365-375]().

**Sources:** [src/index.ts:353-472]()

### System Tray Integration

Desktop mode supports optional "close to tray" behavior. Configuration is loaded from `ConfigStorage` at `system.closeToTray`. If enabled, `createOrUpdateTray()` creates a system tray icon [src/index.ts:264-351]().

**Sources:** [src/index.ts:264-351](), [src/process/utils/tray.ts:1-60]()

### ACP Detector Pre-initialization

Desktop mode initializes the ACP detector via `initializeAcpDetector()` **before** creating the window to prevent a race condition where the renderer might fetch available agents before detection finishes [src/index.ts:577-581]().

**Sources:** [src/index.ts:577-581]()

---

## WebUI Mode

WebUI mode runs AionUi as a headless web server, allowing remote access via a web browser. This mode is designed for deployment scenarios like Docker containers or Linux servers without a display.

### WebUI Configuration Resolution

Title: WebUI Port and Remote Access Resolution
```mermaid
graph TB
    CLI["CLI Arguments<br/>--port, --webui-port"]
    ENV["Environment Variables<br/>AIONUI_PORT, PORT"]
    CONFIG["Configuration File<br/>webui.config.json"]
    DEFAULT["Default Value<br/>SERVER_CONFIG.DEFAULT_PORT"]
    
    RESOLVE_PORT["resolveWebUIPort()"]
    RESOLVE_REMOTE["resolveRemoteAccess()"]
    
    CLI -->|"Highest priority"| RESOLVE_PORT
    ENV -->|"Medium priority"| RESOLVE_PORT
    CONFIG -->|"Low priority"| RESOLVE_PORT
    DEFAULT -->|"Fallback"| RESOLVE_PORT
    
    ENV_REMOTE["AIONUI_ALLOW_REMOTE<br/>AIONUI_REMOTE"]
    ENV_HOST["AIONUI_HOST<br/>(0.0.0.0 / ::)"]
    CONFIG_REMOTE["config.allowRemote"]
    REMOTE_FLAG["--remote flag"]
    
    ENV_REMOTE -->|"Priority 1"| RESOLVE_REMOTE
    ENV_HOST -->|"Priority 2"| RESOLVE_REMOTE
    CONFIG_REMOTE -->|"Priority 3"| RESOLVE_REMOTE
    REMOTE_FLAG -->|"Priority 4"| RESOLVE_REMOTE
    
    RESOLVE_PORT --> PORT_VAL["Final Port Number"]
    RESOLVE_REMOTE --> REMOTE_VAL["allowRemote: boolean"]
```

**Configuration Priority (highest to lowest):**

1. **CLI Arguments**: `--port=8080` or `--webui-port=8080` [src/process/utils/webuiConfig.ts:47-49]()
2. **Environment Variables**: `AIONUI_PORT` or `PORT` [src/process/utils/webuiConfig.ts:49-49]()
3. **Configuration File**: `webui.config.json` in userData directory [src/process/utils/webuiConfig.ts:51-51]()
4. **Default**: `SERVER_CONFIG.DEFAULT_PORT` [src/process/utils/webuiConfig.ts:53-53]()

**Sources:** [src/process/utils/webuiConfig.ts:47-53]()

### WebUI Mode Initialization Flow

Title: WebUI Server Startup Sequence
```mermaid
sequenceDiagram
    participant App as "app.whenReady()"
    participant Init as "initializeProcess()"
    participant Config as "loadUserWebUIConfig()"
    participant Resolve as "Configuration Resolution"
    participant Server as "startWebServer()"
    participant ACP as "initializeAcpDetector()"
    participant Quit as "Quit Prevention"
    
    App->>Init: "Initialize storage, agents"
    Init-->>App: "Complete"
    
    App->>Config: "Load webui.config.json"
    Config-->>App: "Return { config, exists }"
    
    App->>Resolve: "resolveWebUIPort(config)"
    Resolve-->>App: "Final port number"
    
    App->>Resolve: "resolveRemoteAccess(config)"
    Resolve-->>App: "allowRemote boolean"
    
    App->>Server: "startWebServer(port, allowRemote)"
    Note over Server: "Creates Express server<br/>Configures routes<br/>Starts listening"
    Server-->>App: "Server running"
    
    Note over ACP: "Initialize after server<br/>for remote agent access"
    App->>ACP: "initializeAcpDetector()"
    ACP-->>App: "Detection complete"
    
    App->>Quit: "Register will-quit handler"
    Note over Quit: "Prevents unexpected exit<br/>when no windows exist"
```

**Sources:** [src/index.ts:556-623]()

---

## CLI Mode (Password Reset)

CLI mode provides a command-line utility for resetting user passwords. This mode runs headless, performs the password reset operation, and exits.

### CLI Mode Flow

Title: CLI Password Reset Logic
```mermaid
graph TB
    START["Application Start"]
    DETECT["Detect --resetpass flag"]
    READY["app.whenReady()"]
    INIT["initializeProcess()"]
    
    PARSE_ARGS["Parse username argument"]
    DEFAULT["Default to 'admin'"]
    
    IMPORT["import resetPasswordCLI"]
    EXECUTE["resetPasswordCLI(username)"]
    
    SUCCESS["Password reset successful"]
    FAILURE["Password reset failed"]
    
    QUIT_SUCCESS["app.quit() - exit 0"]
    QUIT_FAILURE["app.exit(1)"]
    
    START --> DETECT
    DETECT --> READY
    READY --> INIT
    INIT --> PARSE_ARGS
    
    PARSE_ARGS --> DEFAULT
    DEFAULT --> IMPORT
    IMPORT --> EXECUTE
    
    EXECUTE -->|Success| SUCCESS
    EXECUTE -->|Error| FAILURE
    
    SUCCESS --> QUIT_SUCCESS
    FAILURE --> QUIT_FAILURE
```

**Sources:** [src/index.ts:539-555]()

---

## Single Instance Lock

AionUi enforces single-instance behavior across all modes using `app.requestSingleInstanceLock()`. When a second instance starts (e.g. from a protocol URL), it sends its data to the first instance via the `second-instance` event, then quits [src/index.ts:70-74]().

Title: Single Instance Lock and Deep Link Coordination
```mermaid
sequenceDiagram
    participant First as "First Instance"
    participant Lock as "Single Instance Lock"
    participant Second as "Second Instance"
    participant DeepLink as "Deep Link Handler"
    
    First->>Lock: "requestSingleInstanceLock({ deepLinkUrl })"
    Lock-->>First: "true (lock acquired)"
    First->>First: "Continue initialization"
    
    Second->>Lock: "requestSingleInstanceLock({ deepLinkUrl })"
    Lock-->>Second: "false (lock denied)"
    Second->>Second: "app.quit()"
    
    Note over Lock: "Before quitting, sends data to first instance"
    Lock->>First: "second-instance event<br/>(argv, additionalData)"
    First->>DeepLink: "Extract deepLinkUrl"
    DeepLink->>First: "handleDeepLinkUrl(url)"
    First->>First: "Focus existing window"
```

**Sources:** [src/index.ts:68-98]()