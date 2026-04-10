# Advanced Topics

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.claude/skills/bump-version/SKILL.md](.claude/skills/bump-version/SKILL.md)
- [.claude/skills/oss-pr/SKILL.md](.claude/skills/oss-pr/SKILL.md)
- [.claude/skills/pr-automation/SKILL.md](.claude/skills/pr-automation/SKILL.md)
- [.claude/skills/pr-fix/SKILL.md](.claude/skills/pr-fix/SKILL.md)
- [.claude/skills/pr-review/SKILL.md](.claude/skills/pr-review/SKILL.md)
- [.github/pull_request_template.md](.github/pull_request_template.md)
- [AGENTS.md](AGENTS.md)
- [docs/conventions/pr-automation.md](docs/conventions/pr-automation.md)
- [scripts/pr-automation.conf](scripts/pr-automation.conf)
- [scripts/pr-automation.sh](scripts/pr-automation.sh)
- [src/common/utils/platformAuthType.ts](src/common/utils/platformAuthType.ts)
- [src/process/services/database/drivers/BetterSqlite3Driver.ts](src/process/services/database/drivers/BetterSqlite3Driver.ts)

</details>



This page covers advanced architectural patterns, automation systems, and specialized resilience features implemented in AionUi. These systems address production challenges including API rate limits, build environment instability, PR management at scale, and user interaction complexity.

---

## API Key Rotation

The API key rotation system enables uninterrupted service when individual API keys hit rate limits or quotas. It is managed by the `ApiKeyManager` and integrated into the model provider selection logic.

**Key features:**
- **Multi-protocol support**: Inferred via `getAuthTypeFromPlatform` [src/common/utils/platformAuthType.ts:15-44]() or explicitly defined in provider settings.
- **New API Gateway integration**: Supports per-model protocol overrides for aggregators like NewAPI [src/common/utils/platformAuthType.ts:65-72]().
- **Automatic Fallback**: The `fallbackModelHandler` triggers `tryRotateApiKey` upon quota errors, which updates environment variables and calls `refreshAuth` to restart the request with a fresh key.

For details, see [API Key Rotation](#13.1).

**Sources:** [src/common/utils/platformAuthType.ts:1-77]()

---

## Build Retry Mechanism

The CI/CD pipeline implements sophisticated retry logic to handle transient failures in environment setup and platform-specific packaging (especially macOS code signing).

**Key features:**
- **Two-Phase Build Process**: Separation of Vite compilation and `electron-builder` packaging to isolate failures.
- **Auto-Retry Workflow**: A dedicated GitHub Action mechanism that triggers a full rerun after a 5-minute cooldown on the first build failure.
- **DMG Retry Logic**: The `build-with-builder.js` script includes up to 3 attempts for Disk Image creation with explicit cleanup of stale mount points and temporary files.

For details, see [Build Retry Mechanism](#13.2).

**Sources:** [scripts/build-with-builder.js:1-182]()

---

## PR Automation System

AionUi features a sophisticated label-based PR state machine driven by a daemon script. This system automates the lifecycle of pull requests from initial review to final merge.

**Key features:**
- **State Machine**: Uses `bot:*` labels (e.g., `bot:reviewing`, `bot:fixing`, `bot:ready-to-merge`) to track progress and prevent race conditions [.claude/skills/pr-automation/SKILL.md:42-51]().
- **Daemon Orchestration**: `scripts/pr-automation.sh` runs a continuous loop, invoking Claude instances to process eligible PRs [scripts/pr-automation.sh:121-174]().
- **Isolation**: Uses `git worktree` to perform reviews and fixes in isolated environments without affecting the main repository state [.claude/skills/pr-review/SKILL.md:159-179]().
- **Skills Integration**: Leverages specialized `pr-review` and `pr-fix` skills for deep code analysis and automated bug fixing [.claude/skills/pr-review/SKILL.md:1-20]() [.claude/skills/pr-fix/SKILL.md:1-21]().

**Diagram: PR Automation State Flow**

```mermaid
graph TD
    "New_PR" -- "daemon_picks_up" --> "bot:reviewing"
    "bot:reviewing" -- "pr-review_skill" --> "Review_Result"
    "Review_Result" -- "Issues_Found" --> "bot:ready-to-fix"
    "Review_Result" -- "Clean" --> "bot:ready-to-merge"
    "bot:ready-to-fix" -- "pr-fix_skill" --> "bot:fixing"
    "bot:fixing" -- "Success" --> "bot:ready-to-merge"
    "bot:fixing" -- "Conflict/Failure" --> "bot:needs-rebase"
    "bot:ready-to-merge" -- "Human_Approval" --> "Merged"
```

For details, see [PR Automation System](#13.3).

**Sources:** [.claude/skills/pr-automation/SKILL.md:1-125](), [scripts/pr-automation.sh:1-182](), [docs/conventions/pr-automation.md:1-52]()

---

## Permission & Confirmation System

The permission system manages user approval for tool execution, providing a balance between security and developer velocity.

**Key features:**
- **Unified Handling**: Centralized logic for tool execution permissions across different agent types.
- **ApprovalStore**: Caches user decisions (Allow Once, Allow Always) at the session level to reduce repetitive prompts.
- **Operation Modes**: Supports "YOLO" mode for full automation and `autoEdit` for streamlined file operations.
- **Confirmation UI**: A rich interface supporting multiple option types including `allow_always_tool` and `allow_always_server`.

For details, see [Permission & Confirmation System](#13.4).

**Sources:** [.claude/skills/pr-fix/SKILL.md:182-208]()

---

## Desktop Pet Feature

The Desktop Pet is a specialized subsystem that provides an interactive, visual companion within the AionUi environment.

**Key features:**
- **Process Isolation**: Runs in a separate Electron `BrowserWindow` managed by `petManager`.
- **Animation System**: Uses SVG state animations for different behaviors like `idle` and `done`.
- **Interaction Bridge**: `petEventBridge` facilitates communication between the main app state and the pet window.
- **Hit Detection**: `petHitRenderer` handles user interactions and click-through transparency logic.

For details, see [Desktop Pet Feature](#13.5).

---

## Think Tag Filtering

AionUi implements a robust pipeline to strip hidden reasoning blocks (e.g., ``) from AI responses before they reach the UI or persistent storage.

**Diagram: Think Tag Filtering in the Message Pipeline**

```mermaid
flowchart LR
    subgraph "Main_Process"
        "Raw_Event"["Agent Stream Event"] --> "Filter"["filterThinkTagsFromMessage()"]
        "Filter" --> "Emitter"["ipcBridge.responseStream.emit()"]
    end

    subgraph "Renderer_Process"
        "Emitter" --> "Hook"["useMessageStream()"]
        "Hook" --> "UI_Filter"["filterMessageContent()"]
        "UI_Filter" --> "View"["MarkdownView"]
    end

    subgraph "Storage_Layer"
        "Filter" --> "DB"["BetterSqlite3Driver"]
    end
```

**Sources:** [src/renderer/utils/thinkTagFilter.ts:18-55](), [src/process/services/database/drivers/BetterSqlite3Driver.ts:23-49]()