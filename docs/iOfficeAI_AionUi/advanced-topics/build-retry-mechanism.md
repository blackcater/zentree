# Build Retry Mechanism

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/workflows/_build-reusable.yml](.github/workflows/_build-reusable.yml)
- [.github/workflows/build-and-release.yml](.github/workflows/build-and-release.yml)
- [.github/workflows/build-manual.yml](.github/workflows/build-manual.yml)
- [bun.lock](bun.lock)
- [electron-builder.yml](electron-builder.yml)
- [package.json](package.json)
- [scripts/README.md](scripts/README.md)
- [scripts/afterPack.js](scripts/afterPack.js)
- [scripts/afterSign.js](scripts/afterSign.js)
- [scripts/build-with-builder.js](scripts/build-with-builder.js)
- [scripts/create-mock-release-artifacts.sh](scripts/create-mock-release-artifacts.sh)
- [scripts/prepare-release-assets.sh](scripts/prepare-release-assets.sh)
- [scripts/rebuildNativeModules.js](scripts/rebuildNativeModules.js)
- [scripts/verify-release-assets.sh](scripts/verify-release-assets.sh)
- [src/index.ts](src/index.ts)
- [src/process/bridge/updateBridge.ts](src/process/bridge/updateBridge.ts)
- [src/process/services/autoUpdaterService.ts](src/process/services/autoUpdaterService.ts)
- [tests/integration/autoUpdate.integration.test.ts](tests/integration/autoUpdate.integration.test.ts)
- [tests/unit/autoUpdaterService.test.ts](tests/unit/autoUpdaterService.test.ts)

</details>



## Purpose and Scope

This document describes the automated retry mechanisms in AionUi's build and release pipeline designed to handle transient infrastructure failures. The system implements two independent tiers:

1.  **Workflow-level retry**: The `auto-retry-workflow` job in GitHub Actions triggers a full pipeline rerun after a 5-minute cooldown on the first build failure [ .github/workflows/build-and-release.yml:36-44]().
2.  **Script-level DMG retry**: The `buildWithDmgRetry` function in `scripts/build-with-builder.js` recovers from transient macOS `hdiutil` errors by retrying the disk image creation step up to 3 times [scripts/build-with-builder.js:20-27]().

For the overall build pipeline structure, see page 11.1 (Build Pipeline). For the two-phase build process involving Vite and electron-builder, see page 11.2 (Two-Phase Build Process).

Sources: [.github/workflows/build-and-release.yml:36-44](), [scripts/build-with-builder.js:20-27]()

---

## Retry Strategy Overview

| Failure Type | Detection Method | Retry Strategy | Cooldown | Max Attempts |
| :--- | :--- | :--- | :--- | :--- |
| **Build Pipeline Failure** | `needs: build-pipeline` status | GitHub Actions full workflow rerun via API | 5 minutes (`sleep 300`) | 2 total (1 retry) |
| **macOS DMG Failure** | `.app` exists but `.dmg` missing | `createDmgWithPrepackaged` via `electron-builder` | 30 seconds | 3 (`DMG_RETRY_MAX`) |

Both tiers are designed to be non-recursive: the workflow retry gate is restricted to `github.run_attempt == 1` [.github/workflows/build-and-release.yml:43](), and the DMG loop has a hard cap defined by `DMG_RETRY_MAX` [scripts/build-with-builder.js:26]().

Sources: [.github/workflows/build-and-release.yml:36-44](), [scripts/build-with-builder.js:19-27]()

---

## Architecture

The two retry tiers operate at different scopes and are independent of each other.

### Workflow-Level Auto-Retry

The `auto-retry-workflow` job monitors the `build-pipeline`. If the pipeline fails on its first attempt during a `push` or `schedule` event, this job triggers a full rerun using the GitHub REST API.

**Workflow Retry Flow (Natural Language to Code)**

```mermaid
flowchart TD
    "Trigger"["GitHub Event (push/schedule)"] --> "BuildJob"["build-pipeline Job"]
    "BuildJob" -- "failure() AND run_attempt == 1" --> "RetryJob"["auto-retry-workflow Job"]
    
    subgraph "auto-retry-workflow [.github/workflows/build-and-release.yml]"
        "Log"["Log retry info"] --> "Wait"["sleep 300 (5 min cooldown)"]
        "Wait" --> "Curl"["curl -X POST .../rerun"]
    end
    
    "Curl" -- "HTTP 201" --> "BuildJob"
```

Sources: [.github/workflows/build-and-release.yml:36-90]()

### DMG Retry Logic

Inside the `scripts/build-with-builder.js` script, the `buildWithDmgRetry` function wraps the standard build command. It specifically targets macOS `hdiutil` errors (such as "Device not configured") where the `.app` bundle was successfully created and signed, but the final `.dmg` wrapper failed [scripts/build-with-builder.js:23-25]().

**DMG Retry Logic (Code Entity Space)**

```mermaid
flowchart TD
    "Start"["buildWithDmgRetry(cmd, targetArch)"] --> "Exec"["execSync(cmd)"]
    "Exec" -- "Error Thrown" --> "IsMac"{"process.platform == 'darwin'?"}
    "IsMac" -- "Yes" --> "CheckApp"{"findAppDir(outDir) AND !dmgExists(outDir)"}
    "CheckApp" -- "True" --> "RetryLoop"["Loop: 1 to DMG_RETRY_MAX (3)"]
    
    subgraph "Retry Loop [scripts/build-with-builder.js]"
        "Cleanup"["cleanupDiskImages() -> hdiutil detach -force"] --> "Delay"["sleep DMG_RETRY_DELAY_SEC (30s)"]
        "Delay" --> "Prepack"["createDmgWithPrepackaged(appDir, targetArch)"]
    end
    
    "Prepack" -- "Success" --> "SuccessNode"["Build Finished"]
    "Prepack" -- "Fail AND attempt < MAX" --> "Cleanup"
    "Prepack" -- "Fail AND attempt == MAX" --> "Throw"["Rethrow Error"]
    
    "IsMac" -- "No" --> "Throw"
    "CheckApp" -- "False" --> "Throw"
```

Sources: [scripts/build-with-builder.js:134-241]()

---

## Workflow-Level Implementation

### The `auto-retry-workflow` Job

This job uses the GitHub REST API to trigger a rerun of the current workflow. It is defined in [.github/workflows/build-and-release.yml:36-90]().

*   **Trigger Condition**: `failure() && github.run_attempt == 1 && (github.event_name == 'push' || github.event_name == 'schedule')` [.github/workflows/build-and-release.yml:41-44]().
*   **Wait Step**: A 5-minute cooldown is enforced via `sleep 300` [.github/workflows/build-and-release.yml:61]().
*   **API Call**: Uses `curl` to call the `/rerun` endpoint. This triggers a full rerun of the workflow, not just failed jobs, to ensure a clean environment [.github/workflows/build-and-release.yml:70-74]().

Sources: [.github/workflows/build-and-release.yml:36-90]()

---

## DMG Retry Implementation

### Script-Level Recovery

The script `scripts/build-with-builder.js` coordinates the build process. It includes specific logic to handle transient macOS runner issues (e.g., "Device not configured" errors) [scripts/build-with-builder.js:23-25]().

#### Key Functions

| Function | File:Line | Description |
| :--- | :--- | :--- |
| `cleanupDiskImages()` | [scripts/build-with-builder.js:134]() | Force detaches all mounted disk images using `hdiutil info` and `hdiutil detach -force` to prevent blocking subsequent DMG creation. |
| `findAppDir(outDir)` | [scripts/build-with-builder.js:157]() | Searches for valid `.app` directories in `mac`, `mac-arm64`, `mac-x64`, or `mac-universal` folders. |
| `dmgExists(outDir)` | [scripts/build-with-builder.js:170]() | Checks if a `.dmg` file was successfully generated in the output directory. |
| `createDmgWithPrepackaged()` | [scripts/build-with-builder.js:221]() | Executes `electron-builder --mac dmg --prepackaged` using the existing `.app` path. This preserves signing and styling while retrying only the image creation. |
| `buildWithDmgRetry()` | [scripts/build-with-builder.js:241]() | The main wrapper that implements the retry loop and state checks. |

Sources: [scripts/build-with-builder.js:134-280]()

---

## Configuration Reference

The following constants and configurations control the retry behavior:

| Parameter | Location | Value |
| :--- | :--- | :--- |
| `DMG_RETRY_MAX` | [scripts/build-with-builder.js:26]() | `3` attempts |
| `DMG_RETRY_DELAY_SEC` | [scripts/build-with-builder.js:27]() | `30` seconds |
| Workflow Cooldown | [.github/workflows/build-and-release.yml:61]() | `300` seconds (5 min) |
| DMG Format | [electron-builder.yml:150]() | `UDZO` (Optimized for CI) |

Sources: [scripts/build-with-builder.js:26-27](), [.github/workflows/build-and-release.yml:61](), [electron-builder.yml:150]()