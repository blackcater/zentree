# Settings Management

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/coding-agent/docs/packages.md](packages/coding-agent/docs/packages.md)
- [packages/coding-agent/docs/settings.md](packages/coding-agent/docs/settings.md)
- [packages/coding-agent/src/core/package-manager.ts](packages/coding-agent/src/core/package-manager.ts)
- [packages/coding-agent/src/core/resource-loader.ts](packages/coding-agent/src/core/resource-loader.ts)
- [packages/coding-agent/src/core/settings-manager.ts](packages/coding-agent/src/core/settings-manager.ts)
- [packages/coding-agent/src/modes/interactive/components/settings-selector.ts](packages/coding-agent/src/modes/interactive/components/settings-selector.ts)
- [packages/coding-agent/src/utils/git.ts](packages/coding-agent/src/utils/git.ts)
- [packages/coding-agent/test/git-ssh-url.test.ts](packages/coding-agent/test/git-ssh-url.test.ts)
- [packages/coding-agent/test/git-update.test.ts](packages/coding-agent/test/git-update.test.ts)
- [packages/coding-agent/test/package-manager-ssh.test.ts](packages/coding-agent/test/package-manager-ssh.test.ts)
- [packages/coding-agent/test/package-manager.test.ts](packages/coding-agent/test/package-manager.test.ts)
- [packages/coding-agent/test/resource-loader.test.ts](packages/coding-agent/test/resource-loader.test.ts)

</details>

This document describes the settings system in pi-coding-agent, covering the `SettingsManager` class, scoped settings (global vs project), file locking, hot reload, and the settings schema. For session-specific persistence, see [Session Management & History Tree](#4.3). For package management that uses settings to track installed packages, see [Package Management](#4.12).

---

## Purpose and Scope

The settings system provides persistent configuration storage with two-level scoping (global and project), automatic merging, file locking for concurrent access, and hot reload capabilities. Settings control model defaults, UI behavior, compaction parameters, and resource loading paths.

---

## Architecture Overview

### SettingsManager Class

The `SettingsManager` is the central class for reading and writing settings. It maintains three in-memory settings objects: global, project, and merged.

```mermaid
graph TB
    subgraph "SettingsManager Core"
        Manager["SettingsManager<br/>• globalSettings: Settings<br/>• projectSettings: Settings<br/>• settings: Settings (merged)<br/>• modifiedFields: Set&lt;string&gt;<br/>• writeQueue: Promise&lt;void&gt;"]

        Storage["SettingsStorage interface<br/>• withLock(scope, fn)"]

        FileStorage["FileSettingsStorage<br/>• globalSettingsPath<br/>• projectSettingsPath<br/>• acquireLockSyncWithRetry()"]

        InMemStorage["InMemorySettingsStorage<br/>• global: string<br/>• project: string"]
    end

    subgraph "Factory Methods"
        Create["SettingsManager.create()<br/>cwd, agentDir"]
        FromStorage["SettingsManager.fromStorage()<br/>storage"]
        InMem["SettingsManager.inMemory()<br/>settings"]
    end

    subgraph "Operations"
        Read["Read Operations<br/>• getGlobalSettings()<br/>• getProjectSettings()<br/>• get*() accessors"]

        Write["Write Operations<br/>• set*() mutators<br/>• markModified()<br/>• enqueueWrite()<br/>• save()"]

        Reload["Reload Operations<br/>• reload()<br/>• applyOverrides()"]
    end

    Manager --> Storage
    Storage --> FileStorage
    Storage --> InMemStorage

    Create --> FileStorage
    FromStorage --> Storage
    InMem --> InMemStorage

    Manager --> Read
    Manager --> Write
    Manager --> Reload

    style Manager fill:#f9f9f9,stroke:#333,stroke-width:2px
    style Storage fill:#e1f5ff,stroke:#333,stroke-width:2px
```

**Storage Abstraction Hierarchy**

Sources: [packages/coding-agent/src/core/settings-manager.ts:132-222]()

---

### File Locations and Initialization

Settings are stored as JSON files in two locations:

| Scope       | Path                        | Description                |
| ----------- | --------------------------- | -------------------------- |
| **Global**  | `~/.pi/agent/settings.json` | User-wide defaults         |
| **Project** | `.pi/settings.json`         | Project-specific overrides |

```mermaid
sequenceDiagram
    participant Main as main.ts
    participant SM as SettingsManager
    participant FS as FileSettingsStorage
    participant Lock as proper-lockfile
    participant Disk as File System

    Main->>SM: SettingsManager.create(cwd, agentDir)
    SM->>FS: new FileSettingsStorage()

    SM->>SM: tryLoadFromStorage("global")
    SM->>FS: withLock("global", readFn)
    FS->>Disk: existsSync(globalPath)
    alt File exists
        FS->>Lock: lockSync(globalPath)
        Lock-->>FS: release function
        FS->>Disk: readFileSync(globalPath)
        Disk-->>FS: JSON content
        FS->>SM: return content
        SM->>SM: JSON.parse + migrateSettings()
        FS->>Lock: release()
    else File missing
        FS->>SM: return undefined
    end

    SM->>SM: tryLoadFromStorage("project")
    Note over SM: Same lock + read process

    SM->>SM: deepMergeSettings(global, project)
    SM-->>Main: SettingsManager instance

    Main->>Main: reportSettingsErrors(settingsManager)
    Main->>SM: drainErrors()
    SM-->>Main: SettingsError[]
```

**Settings Initialization Flow**

Sources: [packages/coding-agent/src/main.ts:566-567](), [packages/coding-agent/src/core/settings-manager.ts:256-281]()

---

## Settings Schema

The `Settings` interface defines all configuration options. Settings are organized into categories:

```mermaid
graph LR
    subgraph "Settings Interface"
        Root["Settings"]

        Model["Model & Thinking<br/>• defaultProvider<br/>• defaultModel<br/>• defaultThinkingLevel<br/>• thinkingBudgets<br/>• hideThinkingBlock"]

        UI["UI & Display<br/>• theme<br/>• quietStartup<br/>• collapseChangelog<br/>• doubleEscapeAction<br/>• treeFilterMode<br/>• editorPaddingX<br/>• autocompleteMaxVisible<br/>• showHardwareCursor"]

        Compaction["Compaction Settings<br/>• compaction.enabled<br/>• compaction.reserveTokens<br/>• compaction.keepRecentTokens"]

        Branch["Branch Summary<br/>• branchSummary.reserveTokens<br/>• branchSummary.skipPrompt"]

        Retry["Retry Settings<br/>• retry.enabled<br/>• retry.maxRetries<br/>• retry.baseDelayMs<br/>• retry.maxDelayMs"]

        Messages["Message Delivery<br/>• steeringMode<br/>• followUpMode<br/>• transport"]

        Terminal["Terminal & Images<br/>• terminal.showImages<br/>• terminal.clearOnShrink<br/>• images.autoResize<br/>• images.blockImages"]

        Shell["Shell<br/>• shellPath<br/>• shellCommandPrefix"]

        Resources["Resources<br/>• packages<br/>• extensions<br/>• skills<br/>• prompts<br/>• themes<br/>• enableSkillCommands"]

        Models["Model Cycling<br/>• enabledModels"]

        Markdown["Markdown<br/>• markdown.codeBlockIndent"]
    end

    Root --> Model
    Root --> UI
    Root --> Compaction
    Root --> Branch
    Root --> Retry
    Root --> Messages
    Root --> Terminal
    Root --> Shell
    Root --> Resources
    Root --> Models
    Root --> Markdown
```

**Settings Categories**

### Core Settings Types

| Type                      | Description                   | Example                                       |
| ------------------------- | ----------------------------- | --------------------------------------------- |
| `CompactionSettings`      | Auto-compaction thresholds    | `{ enabled: true, reserveTokens: 16384 }`     |
| `BranchSummarySettings`   | Branch summarization config   | `{ reserveTokens: 16384, skipPrompt: false }` |
| `RetrySettings`           | Retry behavior on errors      | `{ enabled: true, maxRetries: 3 }`            |
| `TerminalSettings`        | Terminal display options      | `{ showImages: true, clearOnShrink: false }`  |
| `ImageSettings`           | Image processing options      | `{ autoResize: true, blockImages: false }`    |
| `ThinkingBudgetsSettings` | Custom thinking token budgets | `{ minimal: 1024, low: 2048 }`                |
| `MarkdownSettings`        | Markdown rendering options    | `{ codeBlockIndent: "  " }`                   |
| `PackageSource`           | Package loading config        | String or object with filters                 |
| `TransportSetting`        | Provider transport preference | `"sse"`, `"websocket"`, or `"auto"`           |

Sources: [packages/coding-agent/src/core/settings-manager.ts:7-96](), [packages/coding-agent/docs/settings.md:12-152]()

---

## Scoped Merging

The settings system uses a two-level hierarchy where project settings override global settings. Nested objects merge recursively rather than replacing entirely.

```mermaid
graph TB
    subgraph "Merge Process"
        Global["Global Settings<br/>~/.pi/agent/settings.json"]
        Project["Project Settings<br/>.pi/settings.json"]

        DeepMerge["deepMergeSettings(base, overrides)<br/>Recursive object merge"]

        Result["Merged Settings<br/>Used by application"]
    end

    subgraph "Example: Nested Object Merge"
        Ex1["Global:<br/>{ theme: 'dark',<br/>  compaction: {<br/>    enabled: true,<br/>    reserveTokens: 16384<br/>  }<br/>}"]

        Ex2["Project:<br/>{ compaction: {<br/>    reserveTokens: 8192<br/>  }<br/>}"]

        Ex3["Result:<br/>{ theme: 'dark',<br/>  compaction: {<br/>    enabled: true,<br/>    reserveTokens: 8192<br/>  }<br/>}"]
    end

    Global --> DeepMerge
    Project --> DeepMerge
    DeepMerge --> Result

    Ex1 --> Ex3
    Ex2 --> Ex3
```

**Settings Merge Strategy**

### Merge Rules

1. **Primitives and Arrays**: Project value completely replaces global value
2. **Objects**: Merge recursively, combining keys from both
3. **Undefined**: Project `undefined` does not clear global values

```typescript
// Implementation logic
for (const key of Object.keys(overrides)) {
  const overrideValue = overrides[key]
  const baseValue = base[key]

  if (overrideValue === undefined) continue

  // Nested object - merge recursively
  if (isObject(overrideValue) && isObject(baseValue)) {
    result[key] = { ...baseValue, ...overrideValue }
  } else {
    // Primitive or array - override wins
    result[key] = overrideValue
  }
}
```

Sources: [packages/coding-agent/src/core/settings-manager.ts:98-127]()

---

## File Locking

`FileSettingsStorage` uses `proper-lockfile` to prevent concurrent modification. Lock acquisition is synchronous with retry logic.

```mermaid
sequenceDiagram
    participant App as Application
    participant SM as SettingsManager
    participant FS as FileSettingsStorage
    participant Lock as proper-lockfile

    App->>SM: setTheme("dark")
    SM->>SM: markModified("theme")
    SM->>SM: enqueueWrite("global", task)

    Note over SM: Queued write executes async

    SM->>FS: withLock("global", writeFn)

    loop Max 10 attempts (20ms delay)
        FS->>Lock: lockSync(path)
        alt Lock acquired
            Lock-->>FS: release function
            FS->>FS: readFileSync (current content)
            FS->>FS: writeFn(currentContent)
            Note over FS: Merge modified fields<br/>with current file
            FS->>FS: writeFileSync(merged)
            FS->>Lock: release()
        else ELOCKED error
            Note over FS: Sleep 20ms, retry
        else Other error
            FS-->>SM: throw error
        end
    end

    alt Write success
        SM->>SM: clearModifiedScope("global")
        SM-->>App: success
    else Write failure
        SM->>SM: recordError("global", error)
        SM-->>App: error queued
    end
```

**File Locking and Write Flow**

### Lock Acquisition Strategy

| Parameter             | Value                 | Purpose                           |
| --------------------- | --------------------- | --------------------------------- |
| **Max attempts**      | 10                    | Retry limit for lock acquisition  |
| **Delay per attempt** | 20ms                  | Synchronous sleep between retries |
| **Lock option**       | `{ realpath: false }` | Don't resolve symlinks            |

### Write Queue

All write operations are serialized through a promise chain to prevent concurrent file access within the same process:

```typescript
private writeQueue: Promise<void> = Promise.resolve();

private enqueueWrite(scope: SettingsScope, task: () => void): void {
    this.writeQueue = this.writeQueue
        .then(() => {
            task();
            this.clearModifiedScope(scope);
        })
        .catch((error) => {
            this.recordError(scope, error);
        });
}
```

Sources: [packages/coding-agent/src/core/settings-manager.ts:149-204](), [packages/coding-agent/src/core/settings-manager.ts:430-439]()

---

## Modified Field Tracking

`SettingsManager` tracks which fields have been modified during the session to enable partial updates. This prevents overwriting concurrent external changes to unmodified fields.

```mermaid
graph TB
    subgraph "Field Tracking State"
        Global["Global State<br/>• modifiedFields: Set&lt;keyof Settings&gt;<br/>• modifiedNestedFields: Map&lt;key, Set&lt;string&gt;&gt;"]
        Project["Project State<br/>• modifiedProjectFields: Set&lt;keyof Settings&gt;<br/>• modifiedProjectNestedFields: Map&lt;key, Set&lt;string&gt;&gt;"]
    end

    subgraph "Write Process"
        Set["setTheme('dark')<br/>setCompactionEnabled(true)"]
        Mark["markModified('theme')<br/>markModified('compaction', 'enabled')"]
        Save["save() → persistScopedSettings()"]
        Merge["Read current file<br/>Merge only modified fields<br/>Write back"]
    end

    subgraph "Example Scenario"
        T1["T1: User modifies theme → 'dark'<br/>modifiedFields: { theme }"]
        T2["T2: External process modifies transport → 'websocket'<br/>(file change not loaded yet)"]
        T3["T3: save() executes<br/>Reads file with transport='websocket'<br/>Only updates theme → 'dark'<br/>Preserves transport='websocket'"]
    end

    Set --> Mark
    Mark --> Global
    Mark --> Project
    Mark --> Save
    Save --> Merge

    T1 --> T2
    T2 --> T3
```

**Modified Field Tracking and Partial Updates**

### Tracking Logic

```typescript
// Mark field modified
private markModified(field: keyof Settings, nestedKey?: string): void {
    this.modifiedFields.add(field);
    if (nestedKey) {
        if (!this.modifiedNestedFields.has(field)) {
            this.modifiedNestedFields.set(field, new Set());
        }
        this.modifiedNestedFields.get(field)!.add(nestedKey);
    }
}

// Write only modified fields
private persistScopedSettings(...): void {
    storage.withLock(scope, (current) => {
        const currentFileSettings = current ? JSON.parse(current) : {};
        const mergedSettings = { ...currentFileSettings };

        for (const field of modifiedFields) {
            if (modifiedNestedFields.has(field)) {
                // Merge only modified nested keys
                const base = currentFileSettings[field] ?? {};
                const modified = snapshotSettings[field];
                mergedSettings[field] = { ...base };
                for (const nestedKey of modifiedNestedFields.get(field)!) {
                    mergedSettings[field][nestedKey] = modified[nestedKey];
                }
            } else {
                // Replace entire field
                mergedSettings[field] = snapshotSettings[field];
            }
        }

        return JSON.stringify(mergedSettings, null, 2);
    });
}
```

Sources: [packages/coding-agent/src/core/settings-manager.ts:393-413](), [packages/coding-agent/src/core/settings-manager.ts:449-478]()

---

## Hot Reload

`SettingsManager` supports reloading settings from disk without restarting the application. The `/reload` command triggers this, and themes automatically hot-reload when files change.

```mermaid
graph TB
    subgraph "Reload Flow"
        Trigger["Trigger<br/>/reload command<br/>Theme file change"]

        ReloadCall["settingsManager.reload()"]

        LoadGlobal["tryLoadFromStorage('global')<br/>Read + parse + migrate"]
        LoadProject["tryLoadFromStorage('project')<br/>Read + parse + migrate"]

        ClearTracking["Clear modified field tracking<br/>modifiedFields.clear()<br/>modifiedNestedFields.clear()"]

        Merge["deepMergeSettings(global, project)"]

        Apply["settings = merged<br/>Application uses new values"]
    end

    subgraph "Error Handling"
        Errors["Load errors<br/>• JSON parse failure<br/>• File read error"]
        Record["recordError(scope, error)"]
        Keep["Keep previous settings<br/>if load fails"]
    end

    Trigger --> ReloadCall
    ReloadCall --> LoadGlobal
    ReloadCall --> LoadProject
    LoadGlobal --> ClearTracking
    LoadProject --> ClearTracking
    ClearTracking --> Merge
    Merge --> Apply

    LoadGlobal --> Errors
    LoadProject --> Errors
    Errors --> Record
    Record --> Keep
```

**Hot Reload Process**

### Reload Implementation

```typescript
reload(): void {
    const globalLoad = SettingsManager.tryLoadFromStorage(this.storage, "global");
    if (!globalLoad.error) {
        this.globalSettings = globalLoad.settings;
        this.globalSettingsLoadError = null;
    } else {
        this.globalSettingsLoadError = globalLoad.error;
        this.recordError("global", globalLoad.error);
    }

    // Clear tracking - no longer reflects on-disk state
    this.modifiedFields.clear();
    this.modifiedNestedFields.clear();
    this.modifiedProjectFields.clear();
    this.modifiedProjectNestedFields.clear();

    const projectLoad = SettingsManager.tryLoadFromStorage(this.storage, "project");
    if (!projectLoad.error) {
        this.projectSettings = projectLoad.settings;
        this.projectSettingsLoadError = null;
    } else {
        this.projectSettingsLoadError = projectLoad.error;
        this.recordError("project", projectLoad.error);
    }

    this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);
}
```

Sources: [packages/coding-agent/src/core/settings-manager.ts:360-385]()

---

## Settings Migration

`SettingsManager` automatically migrates deprecated settings formats when loading from storage.

```mermaid
graph LR
    subgraph "Migration Rules"
        QueueMode["queueMode → steeringMode<br/>Legacy key renamed"]

        Websockets["websockets: boolean<br/>→ transport: Transport<br/>true → 'websocket'<br/>false → 'sse'"]

        SkillsObj["skills: object<br/>→ skills: string[]<br/>Extract customDirectories<br/>Hoist enableSkillCommands"]
    end

    Load["loadFromStorage()"] --> Parse["JSON.parse()"]
    Parse --> Migrate["migrateSettings()"]
    Migrate --> QueueMode
    Migrate --> Websockets
    Migrate --> SkillsObj
    QueueMode --> Return["Return migrated Settings"]
    Websockets --> Return
    SkillsObj --> Return
```

**Settings Migration Rules**

### Migration Examples

| Old Format                                     | New Format                   | Logic          |
| ---------------------------------------------- | ---------------------------- | -------------- |
| `{ queueMode: "all" }`                         | `{ steeringMode: "all" }`    | Direct rename  |
| `{ websockets: true }`                         | `{ transport: "websocket" }` | Boolean → enum |
| `{ websockets: false }`                        | `{ transport: "sse" }`       | Boolean → enum |
| `{ skills: { customDirectories: ["./foo"] } }` | `{ skills: ["./foo"] }`      | Flatten object |

Sources: [packages/coding-agent/src/core/settings-manager.ts:314-350]()

---

## Usage Throughout Application

`SettingsManager` is created at startup and used throughout the application for configuration.

```mermaid
graph TB
    subgraph "Initialization (main.ts)"
        Main["main(args)"]
        Create["SettingsManager.create(cwd, agentDir)"]
        Report["reportSettingsErrors()"]
        ResourceLoader["ResourceLoader uses settings<br/>• getPackages()<br/>• getExtensionPaths()<br/>• getSkillPaths()"]
    end

    subgraph "AgentSession"
        Session["createAgentSession(options)"]
        Read["Read settings<br/>• getCompactionSettings()<br/>• getRetrySettings()<br/>• getTransport()"]
        Listen["Listen for changes<br/>Extensions can modify via API"]
    end

    subgraph "Interactive Mode"
        UI["InteractiveMode"]
        Commands["/settings command<br/>Shows SettingsSelectorComponent"]
        Save["User changes → setter methods<br/>Automatically persisted"]
    end

    subgraph "Settings Access Patterns"
        Direct["Direct getters<br/>settingsManager.getTheme()"]
        Batch["Batch getters<br/>getCompactionSettings()<br/>returns { enabled, reserveTokens, keepRecentTokens }"]
    end

    Main --> Create
    Create --> Report
    Create --> ResourceLoader
    Create --> Session
    Session --> Read

    UI --> Commands
    Commands --> Save

    Session --> Direct
    UI --> Direct
    ResourceLoader --> Batch
```

**Settings Usage Across Application**

### Common Access Patterns

| Component               | Usage                               | Methods Called                                                    |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `main.ts`               | Package loading, resource discovery | `getPackages()`, `getExtensionPaths()`, `getSkillPaths()`         |
| `AgentSession`          | Compaction, retry, transport        | `getCompactionSettings()`, `getRetrySettings()`, `getTransport()` |
| `InteractiveMode`       | Theme, thinking levels, UI options  | `getTheme()`, `getDefaultThinkingLevel()`, `getShowImages()`      |
| `SessionManager`        | Branch summary config               | `getBranchSummarySettings()`                                      |
| `DefaultResourceLoader` | Skill command registration          | `getEnableSkillCommands()`                                        |

Sources: [packages/coding-agent/src/main.ts:566-567](), [packages/coding-agent/src/core/session-manager.ts:1-50]() (conceptual reference)

---

## Settings UI Component

Interactive mode provides a TUI for modifying common settings via the `/settings` command.

```mermaid
graph TB
    subgraph "Settings UI Components"
        Selector["SettingsSelectorComponent<br/>Container with SettingsList"]

        List["SettingsList<br/>• Scrollable item list<br/>• Search support<br/>• Submenu support"]

        Submenu["SelectSubmenu<br/>• Used for theme, thinking level<br/>• Preview support"]
    end

    subgraph "Configuration Flow"
        Config["SettingsConfig<br/>Current values from SettingsManager"]

        Callbacks["SettingsCallbacks<br/>• onThemeChange<br/>• onAutoCompactChange<br/>• onTransportChange<br/>• ..."]

        Items["SettingItem[]<br/>• id, label, description<br/>• currentValue, values[]<br/>• Optional submenu factory"]
    end

    subgraph "User Interaction"
        User["User presses /settings"]
        Show["Show SettingsSelectorComponent"]
        Navigate["Arrow keys navigate<br/>Enter toggles/selects<br/>Type to search"]
        Change["onChange callback fires"]
        Persist["settingsManager.set*()<br/>Auto-saved to disk"]
    end

    Config --> Selector
    Callbacks --> Selector
    Selector --> List
    List --> Submenu

    Items --> List

    User --> Show
    Show --> Navigate
    Navigate --> Change
    Change --> Persist
```

**Settings UI Architecture**

### Settings Items Configuration

The UI dynamically builds a list of `SettingItem` objects representing each configurable option:

```typescript
const items: SettingItem[] = [
  {
    id: 'autocompact',
    label: 'Auto-compact',
    description: 'Automatically compact context when it gets too large',
    currentValue: config.autoCompact ? 'true' : 'false',
    values: ['true', 'false'],
  },
  {
    id: 'thinking',
    label: 'Thinking level',
    description: 'Reasoning depth for thinking-capable models',
    currentValue: config.thinkingLevel,
    submenu: (currentValue, done) =>
      new SelectSubmenu(
        'Thinking Level',
        'Select reasoning depth',
        config.availableThinkingLevels.map((level) => ({
          value: level,
          label: level,
          description: THINKING_DESCRIPTIONS[level],
        })),
        currentValue,
        (value) => {
          callbacks.onThinkingLevelChange(value)
          done(value)
        },
        () => done()
      ),
  },
  // ... more items
]
```

### Callback Mapping

Each setting change triggers a specific callback that updates `SettingsManager`:

| Setting ID      | Callback                | SettingsManager Method           |
| --------------- | ----------------------- | -------------------------------- |
| `autocompact`   | `onAutoCompactChange`   | `setCompactionEnabled(enabled)`  |
| `steering-mode` | `onSteeringModeChange`  | `setSteeringMode(mode)`          |
| `transport`     | `onTransportChange`     | `setTransport(transport)`        |
| `thinking`      | `onThinkingLevelChange` | `setDefaultThinkingLevel(level)` |
| `theme`         | `onThemeChange`         | `setTheme(theme)`                |

Sources: [packages/coding-agent/src/modes/interactive/components/settings-selector.ts:48-421]()

---

## Error Handling

`SettingsManager` accumulates errors during load and write operations. Errors are drained and reported at startup.

```mermaid
graph TB
    subgraph "Error Accumulation"
        Load["Load attempt"]
        Parse["JSON.parse() failure"]
        Write["Write failure"]

        Record["recordError(scope, error)"]
        Queue["errors: SettingsError[]"]
    end

    subgraph "Error Reporting"
        Drain["drainErrors()"]
        Report["reportSettingsErrors()<br/>in main.ts"]
        Console["console.error() with scope"]
    end

    subgraph "Fallback Behavior"
        KeepPrevious["Keep previous settings<br/>on load error"]
        KeepGlobal["Keep global load error flag<br/>Prevent writes to corrupted file"]
    end

    Load --> Parse
    Parse --> Record
    Write --> Record
    Record --> Queue

    Queue --> Drain
    Drain --> Report
    Report --> Console

    Parse --> KeepPrevious
    Record --> KeepGlobal
```

**Error Handling Flow**

### Error Structure

```typescript
export interface SettingsError {
  scope: SettingsScope // "global" | "project"
  error: Error
}

// Usage in main.ts
function reportSettingsErrors(
  settingsManager: SettingsManager,
  context: string
): void {
  const errors = settingsManager.drainErrors()
  for (const { scope, error } of errors) {
    console.error(
      chalk.yellow(`Warning (${context}, ${scope} settings): ${error.message}`)
    )
    if (error.stack) {
      console.error(chalk.dim(error.stack))
    }
  }
}
```

### Load Error Protection

If a settings file fails to parse, `SettingsManager` sets a load error flag and prevents writes to that scope:

```typescript
private save(): void {
    this.settings = deepMergeSettings(this.globalSettings, this.projectSettings);

    // Don't write if file was corrupted on load
    if (this.globalSettingsLoadError) {
        return;
    }

    // ... proceed with write
}
```

Sources: [packages/coding-agent/src/core/settings-manager.ts:414-417](), [packages/coding-agent/src/core/settings-manager.ts:480-494](), [packages/coding-agent/src/main.ts:57-65]()
