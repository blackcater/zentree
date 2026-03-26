# Terminal Session Lifecycle

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [apps/desktop/src/lib/trpc/routers/terminal/terminal.ts](apps/desktop/src/lib/trpc/routers/terminal/terminal.ts)
- [apps/desktop/src/main/lib/app-environment.ts](apps/desktop/src/main/lib/app-environment.ts)
- [apps/desktop/src/main/lib/data-batcher.ts](apps/desktop/src/main/lib/data-batcher.ts)
- [apps/desktop/src/main/lib/terminal-escape-filter.test.ts](apps/desktop/src/main/lib/terminal-escape-filter.test.ts)
- [apps/desktop/src/main/lib/terminal-escape-filter.ts](apps/desktop/src/main/lib/terminal-escape-filter.ts)
- [apps/desktop/src/main/lib/terminal-history.ts](apps/desktop/src/main/lib/terminal-history.ts)
- [apps/desktop/src/main/lib/terminal-host/headless-emulator.test.ts](apps/desktop/src/main/lib/terminal-host/headless-emulator.test.ts)
- [apps/desktop/src/main/lib/terminal-host/headless-emulator.ts](apps/desktop/src/main/lib/terminal-host/headless-emulator.ts)
- [apps/desktop/src/main/lib/terminal/port-manager.ts](apps/desktop/src/main/lib/terminal/port-manager.ts)
- [apps/desktop/src/main/lib/terminal/port-scanner.test.ts](apps/desktop/src/main/lib/terminal/port-scanner.test.ts)
- [apps/desktop/src/main/lib/terminal/port-scanner.ts](apps/desktop/src/main/lib/terminal/port-scanner.ts)
- [apps/desktop/src/main/lib/terminal/session.test.ts](apps/desktop/src/main/lib/terminal/session.test.ts)
- [apps/desktop/src/main/lib/terminal/session.ts](apps/desktop/src/main/lib/terminal/session.ts)
- [apps/desktop/src/main/lib/terminal/types.ts](apps/desktop/src/main/lib/terminal/types.ts)
- [apps/desktop/src/main/terminal-host/session.ts](apps/desktop/src/main/terminal-host/session.ts)
- [apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/Terminal/config.ts](apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/Terminal/config.ts)
- [apps/desktop/src/renderer/stores/tabs/utils/terminal-cleanup.ts](apps/desktop/src/renderer/stores/tabs/utils/terminal-cleanup.ts)

</details>

This document describes the complete lifecycle of a terminal session in the daemon-based architecture, covering session creation, state transitions, PTY subprocess management, attachment/detachment semantics, termination, and cleanup. Sessions are keyed by `paneId` and persist across UI detachments, enabling seamless tab switching and cold restore after app restarts.

For terminal UI components and rendering, see [Terminal UI Components](#2.8.3). For terminal host daemon architecture, see [Terminal Backend and Daemon](#2.8.4). For scrollback persistence and cold restore, see [Terminal Persistence and Cold Restore](#2.8.5).

## Overview

Terminal sessions follow a lifecycle managed by the Terminal Host Daemon (`Session` class). The lifecycle begins with a `createOrAttach` request from the renderer, which either spawns a new PTY subprocess or attaches to an existing session. Sessions track state via the `isAlive`, `isTerminating`, and `isAttachable` properties. Data flows from the PTY subprocess through an emulator write queue (time-budgeted processing) to attached clients via socket connections.

Sessions persist independently of UI state. Detaching a session updates metadata but keeps the PTY running. Killing a session sends SIGTERM (with SIGKILL escalation) and transitions to the terminated state. History persistence enables cold restore by writing scrollback to disk during the session lifecycle.

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:1-966](), [apps/desktop/src/lib/trpc/routers/terminal/terminal.ts:1-505](), [apps/desktop/src/main/lib/terminal/types.ts:1-113]()

## Session Creation via createOrAttach

### createOrAttach Request Flow

The `createOrAttach` tRPC procedure is the entry point for all session lifecycle operations. It creates new sessions or attaches to existing ones based on `paneId`:

Title: **createOrAttach Flow: tRPC Router to Session**

```mermaid
sequenceDiagram
    participant Renderer as "Terminal Component"
    participant tRPC as "terminal.createOrAttach"
    participant Manager as "TerminalManager/WorkspaceRuntime"
    participant Session as "Session (daemon)"
    participant PTY as "PTY Subprocess"
    participant Emulator as "HeadlessEmulator"

    Renderer->>tRPC: createOrAttach({ paneId, workspaceId, cols, rows, cwd })
    tRPC->>tRPC: Resolve workspace, workspacePath, cwd
    tRPC->>tRPC: resolveTerminalThemeType()

    tRPC->>Manager: terminal.createOrAttach(params)

    alt Session exists and isAttachable
        Manager->>Session: Check isAttachable (isAlive && !isTerminating)
        Session-->>Manager: true
        Manager->>Session: waitForReady() (await ptyReadyPromise)
        Manager->>Session: attach(socket)
        Session->>Emulator: flushToSnapshotBoundary(500ms)
        Session->>Emulator: getSnapshotAsync()
        Session-->>Manager: TerminalSnapshot
        Manager-->>tRPC: { isNew: false, snapshot, wasRecovered: false }
    else Session killed but allowKilled=true
        Manager->>Manager: Delete killed session
        Note over Manager: Fall through to create new
    else Session not attachable or missing
        Manager->>Session: new Session({ sessionId: paneId, workspaceId, cols, rows, cwd })
        Session->>Session: Initialize HeadlessEmulator
        Session->>Session: spawn({ cwd, cols, rows, env })
        Session->>PTY: Fork PTY subprocess (pty-subprocess.js)
        PTY-->>Session: Ready message
        Session->>PTY: Send Spawn frame (shell, args, cwd, env)
        PTY-->>Session: Spawned frame (ptyPid)
        Session->>Session: ptyReadyResolve()

        Manager->>Session: attach(socket)
        Session->>Emulator: getSnapshotAsync()
        Session-->>Manager: TerminalSnapshot
        Manager-->>tRPC: { isNew: true, snapshot, wasRecovered: false }
    end

    tRPC-->>Renderer: SessionResult
```

The `createOrAttach` procedure validates workspace usability via `assertWorkspaceUsable` for worktree-type workspaces. Sessions transition through states: spawning → ready (after Spawned IPC frame) → attachable. The `isAttachable` check prevents race conditions when `kill` is called immediately before `createOrAttach`.

**Sources:** [apps/desktop/src/lib/trpc/routers/terminal/terminal.ts:59-193](), [apps/desktop/src/main/terminal-host/session.ts:137-246](), [apps/desktop/src/main/lib/terminal/types.ts:45-91]()

### Session State Transitions

Title: **Session State Machine**

```mermaid
stateDiagram-v2
    [*] --> Spawning: "new Session(options)"

    Spawning --> WaitingReady: "subprocess.on('exit') sets up handlers"
    WaitingReady --> Ready: "Spawned IPC frame received (ptyPid set)"

    Ready --> Attachable: "isAlive=true, isTerminating=false"

    Attachable --> Attached: "attach(socket)"
    Attached --> Attachable: "detach(socket)"

    Attachable --> Terminating: "kill(signal) called"
    Terminating --> Dead: "PTY exit event"

    Attachable --> Dead: "PTY crashes or exits naturally"

    Ready --> Dead: "subprocess exits before attach"

    Dead --> [*]: "dispose() called"

    note right of Terminating
        terminatingAt timestamp set
        isTerminating=true
        isAttachable=false
    end note

    note right of Dead
        isAlive=false
        exitCode set
        subprocess=null
    end note
```

Sessions track three key boolean states:

- `isAlive`: `subprocess !== null && exitCode === null`
- `isTerminating`: `terminatingAt !== null` (kill called but not yet exited)
- `isAttachable`: `isAlive && !isTerminating`

The `terminatingAt` timestamp prevents race conditions where `createOrAttach` is called immediately after `kill` but before the PTY has exited.

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:627-656](), [apps/desktop/src/main/lib/terminal/types.ts:7-27]()

## PTY Subprocess Architecture

### Subprocess Spawning and IPC Protocol

Sessions delegate PTY operations to a subprocess (`pty-subprocess.js`) to isolate blocking I/O from the daemon process. Communication uses a framed IPC protocol over stdin/stdout:

Title: **PTY Subprocess IPC Protocol**

```mermaid
graph TB
    Session["Session (daemon)"] -->|"stdin frames"| Subprocess["PTY Subprocess"]
    Subprocess -->|"stdout frames"| Session

    subgraph "Frame Structure (5-byte header)"
        Header["[type: 1 byte][length: 4 bytes LE][payload: N bytes]"]
    end

    subgraph "IPC Message Types"
        Ready["Ready (0) - Subprocess initialized"]
        Spawn["Spawn (1) - { shell, args, cwd, cols, rows, env }"]
        Spawned["Spawned (2) - { ptyPid }"]
        Write["Write (3) - user input data"]
        Data["Data (4) - PTY output"]
        Resize["Resize (5) - { cols, rows }"]
        Signal["Signal (6) - signal name"]
        Kill["Kill (7) - signal name"]
        Exit["Exit (8) - { exitCode, signal }"]
        Error["Error (9) - error message"]
        Dispose["Dispose (10) - cleanup"]
    end

    Session -->|Ready| Subprocess
    Session -->|Spawn| Subprocess
    Subprocess -->|Spawned| Session
    Session -->|Write| Subprocess
    Subprocess -->|Data| Session
    Session -->|Resize| Subprocess
    Session -->|Signal| Subprocess
    Session -->|Kill| Subprocess
    Subprocess -->|Exit| Session
    Subprocess -->|Error| Session
    Session -->|Dispose| Subprocess
```

The subprocess decodes frames using `PtySubprocessFrameDecoder`. The session queues frames in `subprocessStdinQueue` with backpressure handling (max 2MB queue). When the queue fills, writes are dropped and an error event is emitted to prevent OOM.

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:198-246](), [apps/desktop/src/main/terminal-host/session.ts:258-335](), [apps/desktop/src/main/terminal-host/pty-subprocess-ipc.ts]()

### Emulator Write Queue (Time-Budgeted Processing)

PTY output flows through an emulator write queue that processes data in time-budgeted chunks to prevent event loop starvation:

Title: **Emulator Write Queue Processing**

```mermaid
graph TB
    PTYData["PTY Data IPC Frame"] --> EnqueueWrite["enqueueEmulatorWrite(data)"]
    EnqueueWrite --> Buffer["emulatorWriteQueue.push(data)"]
    Buffer --> Schedule["scheduleEmulatorWrite()"]

    Schedule --> SetImmediate["setImmediate(processQueue)"]

    SetImmediate --> CheckBudget{"Time budget\
exhausted?"}

    CheckBudget -->|"No, continue"| ProcessChunk["Process up to 8KB chunk"]
    ProcessChunk --> WriteEmulator["emulator.write(chunk)"]
    WriteEmulator --> UpdateProcessed["emulatorWriteProcessedItems++"]
    UpdateProcessed --> CheckBudget

    CheckBudget -->|"Yes, reschedule"| SetImmediate

    CheckBudget -->|"Queue empty"| ResolveWaiters["Resolve emulatorFlushWaiters"]
    ResolveWaiters --> CheckSnapshotWaiters["Resolve snapshotBoundaryWaiters"]

    subgraph "Budget Calculation"
        HasClients{"attachedClients\
.size > 0?"}
        HasClients -->|"Yes"| Budget5["budgetMs = 5"]
        HasClients -->|"No"| CheckBacklog{"backlogBytes\
> 1MB?"}
        CheckBacklog -->|"Yes"| Budget25["budgetMs = 25"]
        CheckBacklog -->|"No"| Budget25B["budgetMs = 25"]
    end
```

The budget is 5ms when clients are attached (responsive UI), 25ms when detached. Large backlogs (>1MB) get extended processing time to catch up. This prevents the daemon from blocking on write operations while ensuring eventual consistency.

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:490-558](), [apps/desktop/src/main/terminal-host/session.ts:504-525]()

## Session Attachment and Detachment

### Socket-Based Client Attachment

Sessions track multiple attached clients via socket connections. Each client receives data events via JSON-encoded messages over the socket:

Title: **Client Attachment and Data Broadcasting**

```mermaid
sequenceDiagram
    participant Client1 as "Client Socket 1"
    participant Client2 as "Client Socket 2"
    participant Session as "Session"
    participant Emulator as "HeadlessEmulator"

    Client1->>Session: attach(socket)
    Session->>Session: attachedClients.set(socket, { attachedAt })
    Session->>Session: lastAttachedAt = new Date()
    Session->>Emulator: flushToSnapshotBoundary(500ms)
    Session->>Emulator: getSnapshotAsync()
    Emulator-->>Session: TerminalSnapshot
    Session-->>Client1: Return snapshot

    Note over Session: PTY data arrives
    Session->>Session: enqueueEmulatorWrite(data)
    Session->>Session: broadcastEvent('data', { type: 'data', data })

    Session->>Client1: socket.write('{"type":"event","event":"data",...}\
')

    Client2->>Session: attach(socket)
    Session->>Session: attachedClients.set(socket, { attachedAt })
    Session->>Emulator: flushToSnapshotBoundary(500ms)
    Session->>Emulator: getSnapshotAsync()
    Session-->>Client2: Return snapshot

    Note over Session: More PTY data
    Session->>Session: broadcastEvent('data', { type: 'data', data })
    Session->>Client1: socket.write(message)
    Session->>Client2: socket.write(message)

    Client1->>Session: detach(socket)
    Session->>Session: attachedClients.delete(socket)

    Note over Session: PTY data after detach
    Session->>Session: broadcastEvent('data', { type: 'data', data })
    Session->>Client2: socket.write(message) (only Client2 now)
```

The `attach` method flushes pending emulator writes to a snapshot boundary before capturing state. This ensures a consistent point-in-time snapshot even with continuous output. The 500ms timeout prevents indefinite hangs when output never stops (e.g., `tail -f`).

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:676-701](), [apps/desktop/src/main/terminal-host/session.ts:586-623](), [apps/desktop/src/main/terminal-host/session.ts:874-903]()

### Backpressure Handling

When client sockets can't drain fast enough, the session pauses subprocess stdout to prevent memory exhaustion:

Title: **Socket Backpressure Flow**

```mermaid
graph TB
    Broadcast["broadcastEvent(data)"] --> WriteSocket["socket.write(message)"]

    WriteSocket --> CheckBuffer{"socket.write\
returns false?"}

    CheckBuffer -->|"Yes, buffer full"| LogWarn["console.warn('Client socket buffer full')"]
    LogWarn --> CheckPaused{"subprocess\
stdout paused?"}

    CheckPaused -->|"No"| PauseStdout["subprocessStdoutPaused = true"]
    PauseStdout --> CallPause["subprocess.stdout.pause()"]

    CheckPaused -->|"Already paused"| TrackWaiting["clientSocketsWaitingForDrain.add(socket)"]
    CallPause --> TrackWaiting

    TrackWaiting --> WaitDrain["socket.once('drain', callback)"]

    WaitDrain --> Drained["Socket drained"]
    Drained --> RemoveWaiting["clientSocketsWaitingForDrain.delete(socket)"]
    RemoveWaiting --> CheckAllDrained{"All sockets\
drained?"}

    CheckAllDrained -->|"Yes"| ResumeStdout["subprocess.stdout.resume()"]
    CheckAllDrained -->|"No"| Continue["Continue paused"]

    ResumeStdout --> BackpressureOff["subprocessStdoutPaused = false"]

    CheckBuffer -->|"No, write succeeded"| Continue
```

This backpressure mechanism prevents the daemon from consuming unbounded memory when clients are slow. The subprocess stdout pipe buffers PTY output, which in turn slows down PTY reads within the subprocess (preventing runaway CPU/memory).

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:905-930]()

## Session Termination

### Kill vs Signal Semantics

Sessions support two types of process signaling with different semantics:

| Operation | Method               | Effect                                                   | Use Case                                    |
| --------- | -------------------- | -------------------------------------------------------- | ------------------------------------------- |
| `signal`  | `sendSignal(signal)` | Sends signal without marking as terminating              | Ctrl+C (SIGINT) - process continues running |
| `kill`    | `kill(signal)`       | Sets `terminatingAt`, sends signal, marks not attachable | User closes terminal - session will exit    |

Title: **Kill Flow with Termination Tracking**

```mermaid
sequenceDiagram
    participant Client as "Client (tRPC)"
    participant Session as "Session"
    participant Subprocess as "PTY Subprocess"

    Client->>Session: kill(signal='SIGTERM')

    alt Already terminating
        Session->>Session: Check terminatingAt !== null
        Session-->>Client: Return (idempotent)
    else Not terminating
        Session->>Session: terminatingAt = Date.now()
        Session->>Session: isTerminating = true, isAttachable = false

        alt Subprocess ready
            Session->>Subprocess: sendKillToSubprocess(signal)
            Subprocess->>Subprocess: pty.kill(signal)
        else Subprocess not ready
            Session->>Session: subprocess.kill(signal)
        end

        Note over Subprocess: PTY process handles signal
        Subprocess->>Session: Exit IPC frame { exitCode, signal }
        Session->>Session: exitCode = exitCode
        Session->>Session: isAlive = false
        Session->>Session: broadcastEvent('exit', { exitCode, signal })
        Session->>Session: resetProcessState()
    end
```

The `terminatingAt` timestamp makes `kill` idempotent and prevents `createOrAttach` from attaching to sessions mid-termination. The `sendSignal` method skips this tracking, allowing non-terminal signals (SIGINT, SIGTSTP) to be sent without affecting session state.

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:767-804](), [apps/desktop/src/main/terminal-host/session.ts:783-804]()

### Exit Event Handling and Cleanup

Title: **Session Exit and Resource Cleanup**

```mermaid
graph TB
    PTYExit["PTY Exit Event"] --> HandleExit["handleSubprocessExit(exitCode)"]

    HandleExit --> CheckExitCode{"exitCode already\
set?"}
    CheckExitCode -->|"Yes, duplicate"| Skip["Skip (already handled)"]
    CheckExitCode -->|"No"| SetExitCode["exitCode = exitCode"]

    SetExitCode --> Broadcast["broadcastEvent('exit', { exitCode })"]
    Broadcast --> CallCallback["onSessionExit?.(sessionId, exitCode)"]
    CallCallback --> ResolveReady["Resolve ptyReadyPromise if pending"]
    ResolveReady --> ResetState["resetProcessState()"]

    ResetState --> ClearSubprocess["subprocess = null"]
    ClearSubprocess --> ClearDecoder["subprocessDecoder = null"]
    ClearDecoder --> ClearQueues["Clear stdin/emulator queues"]
    ClearQueues --> ResolveWaiters["Resolve all pending waiters"]

    ResolveWaiters --> ClientsNotified["Clients receive exit event"]
```

Exit handling includes several safety mechanisms:

- **Duplicate exit prevention**: Only the first exit event is processed
- **PTY ready resolution**: Ensures waiters don't hang if subprocess exits before spawning PTY
- **Queue cleanup**: Clears all pending write queues and resolves waiters
- **Client notification**: Broadcasts exit event before cleanup so clients receive final state

The `onSessionExit` callback is typically set by the daemon manager to perform registry cleanup and potentially restart the session.

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:340-360](), [apps/desktop/src/main/terminal-host/session.ts:838-856]()

## History Persistence During Session Lifecycle

### HistoryWriter Integration

Sessions integrate with `HistoryWriter` to persist scrollback to disk for cold restore. The writer tracks session lifecycle events:

Title: **History Writer Lifecycle**

```mermaid
sequenceDiagram
    participant Session as "Session (daemon)"
    participant Writer as "HistoryWriter"
    participant Disk as "~/.superset/terminal-history/{workspaceId}/{paneId}/"

    Session->>Writer: new HistoryWriter(workspaceId, paneId, cwd, cols, rows)
    Session->>Writer: init(initialScrollback?)

    Writer->>Disk: mkdir -p (with mode 0o700)

    alt Has initial scrollback
        Writer->>Writer: Check size vs MAX_HISTORY_BYTES (5MB)
        alt Too large
            Writer->>Writer: truncateUtf8ToLastBytes(scrollback, 5MB)
            Writer->>Disk: writeFile scrollback.bin (truncated)
        else Fits
            Writer->>Disk: writeFile scrollback.bin (full)
        end
    else No initial scrollback
        Writer->>Disk: writeFile scrollback.bin (empty)
    end

    Writer->>Disk: writeFile meta.json { cwd, cols, rows, startedAt }
    Writer->>Writer: Open append stream

    Note over Session: PTY data events
    loop PTY Output
        Session->>Writer: write(data)

        Writer->>Writer: Check bytesWritten + len < MAX_HISTORY_BYTES
        alt Under cap
            Writer->>Writer: stream.write(data, 'utf8')
            alt Stream backpressured
                Writer->>Writer: pendingWrites.push({ data, bytes })
                Writer->>Writer: Wait for 'drain' event
            end
        else Over cap
            Writer->>Writer: Drop write (log warning once)
        end
    end

    Session->>Writer: close(exitCode?)
    Writer->>Writer: Flush pending writes (with timeout)
    Writer->>Writer: stream.end()
    Writer->>Disk: writeFile meta.json { ..., endedAt, exitCode }
```

The writer maintains two files:

- **scrollback.bin**: Raw PTY output (UTF-8), append-only during session, capped at 5MB
- **meta.json**: Session metadata including `startedAt` and `endedAt` timestamps

Cold restore detection relies on `meta.json` existing without `endedAt` (unclean shutdown). Sessions that exit cleanly write `endedAt`, marking history as not recoverable.

**Sources:** [apps/desktop/src/main/lib/terminal-history.ts:115-464](), [apps/desktop/src/main/lib/terminal-history.ts:156-224]()

### Backpressure and Truncation

The `HistoryWriter` implements two safety mechanisms:

| Mechanism              | Trigger                               | Action                               | Purpose                        |
| ---------------------- | ------------------------------------- | ------------------------------------ | ------------------------------ |
| **Backpressure queue** | Stream returns `false` from `write()` | Queue writes in memory (up to 256KB) | Respect filesystem write speed |
| **Hard cap**           | Total written > 5MB                   | Drop writes, log warning once        | Prevent disk exhaustion        |

When the pending write queue exceeds 256KB (`MAX_PENDING_WRITE_BYTES`), additional writes are dropped until the stream drains. This prevents OOM when the disk is very slow or blocked.

**Sources:** [apps/desktop/src/main/lib/terminal-history.ts:230-310](), [apps/desktop/src/main/lib/terminal-history.ts:22-26]()

## Port Detection Integration

### Port Registration and Scanning

Sessions register with the `PortManager` for automatic port detection. The manager tracks ports via process trees and periodic scanning:

Title: **Port Detection Lifecycle**

```mermaid
sequenceDiagram
    participant Session as "Session"
    participant PortMgr as "PortManager"
    participant Scanner as "Port Scanner (lsof/netstat)"

    Session->>PortMgr: upsertDaemonSession(paneId, workspaceId, pid=null)
    Note over Session: PTY subprocess spawns
    Session->>Session: Receive Spawned IPC frame
    Session->>PortMgr: upsertDaemonSession(paneId, workspaceId, ptyPid)

    loop Every 2.5s
        PortMgr->>PortMgr: scanAllSessions()
        PortMgr->>PortMgr: Collect PIDs from daemon sessions
        PortMgr->>Scanner: getProcessTree(ptyPid)
        Scanner-->>PortMgr: [pid, child1Pid, child2Pid, ...]
        PortMgr->>Scanner: getListeningPortsForPids(allPids)
        Scanner-->>PortMgr: [{ port, pid, address, processName }]

        PortMgr->>PortMgr: Group ports by paneId
        PortMgr->>PortMgr: Compare with previous scan

        alt New port detected
            PortMgr->>PortMgr: ports.set(key, detectedPort)
            PortMgr->>PortMgr: emit('port:add', detectedPort)
        end

        alt Port disappeared
            PortMgr->>PortMgr: ports.delete(key)
            PortMgr->>PortMgr: emit('port:remove', detectedPort)
        end
    end

    Note over Session: PTY data contains port hint
    Session->>PortMgr: checkOutputForHint(data, paneId)
    alt Contains hint (e.g., "listening on port 3000")
        PortMgr->>PortMgr: scheduleHintScan(paneId)
        PortMgr->>PortMgr: setTimeout(scanPane, 500ms)
    end

    Session->>PortMgr: unregisterDaemonSession(paneId)
    PortMgr->>PortMgr: Remove all ports for paneId
```

The port manager uses two detection strategies:

1. **Periodic scanning**: Every 2.5s, scan all registered session process trees via `lsof` (Unix) or `netstat` (Windows)
2. **Hint-based scanning**: Parse output for patterns like "listening on port 3000" and scan 500ms later

Ports are filtered by `IGNORED_PORTS` (22, 80, 443, 5432, etc.) to exclude common system services.

**Sources:** [apps/desktop/src/main/lib/terminal/port-manager.ts:1-505](), [apps/desktop/src/main/lib/terminal/port-manager.ts:92-114](), [apps/desktop/src/main/lib/terminal/port-scanner.ts:34-49]()

### PID Filtering for Security

Port scanning includes critical PID validation to prevent exposing unrelated system ports:

```typescript
// In parseLsofOutput (port-scanner.ts)
const pidSet = new Set(pids)
for (const line of lines) {
  const pid = parseInt(columns[1], 10)

  // CRITICAL: Verify PID is in requested set
  // lsof ignores -p filter when PIDs don't exist, returning ALL TCP listeners
  if (!pidSet.has(pid)) continue

  // ... parse port info
}
```

This prevents a security issue where `lsof -p 12345` (non-existent PID) returns all listening ports on the system instead of an empty result. Without PID filtering, terminal sessions would incorrectly display ports from unrelated processes.

**Sources:** [apps/desktop/src/main/lib/terminal/port-scanner.ts:54-114](), [apps/desktop/src/main/lib/terminal/port-scanner.test.ts:265-326]()

## Session Disposal and Resource Cleanup

### Dispose Flow and Process Termination

The `dispose` method performs comprehensive cleanup including process tree termination:

Title: **Session Dispose Flow**

```mermaid
graph TB
    Dispose["dispose() called"] --> CheckDisposed{"Already disposed?"}
    CheckDisposed -->|"Yes"| Return["Return immediately"]
    CheckDisposed -->|"No"| SetDisposed["disposed = true"]

    SetDisposed --> CollectPIDs["collectProcessPids()"]
    CollectPIDs --> SubprocessPID["Add subprocess.pid if exists"]
    SubprocessPID --> PtyPID["Add ptyPid if exists"]

    PtyPID --> SendDispose["sendDisposeToSubprocess()"]
    SendDispose --> ResetState["resetProcessState()"]

    ResetState --> ClearSubprocess["subprocess = null"]
    ClearSubprocess --> ClearEmulator["emulator.dispose()"]
    ClearEmulator --> ClearClients["attachedClients.clear()"]
    ClearClients --> ClearWaiters["Resolve all waiters"]

    ClearWaiters --> CheckPIDs{"PIDs to kill?"}
    CheckPIDs -->|"No"| Done["Done"]
    CheckPIDs -->|"Yes"| KillTrees["Promise.all(treeKillAsync(pid, SIGKILL))"]

    KillTrees --> Done

    subgraph "Why both subprocess.pid and ptyPid?"
        Note1["Subprocess PID: Node.js wrapper process"]
        Note2["PTY PID: Actual shell process"]
        Note3["Safety net if shell was reparented"]
    end
```

The `dispose` method kills both the subprocess (Node.js wrapper) and the PTY process (actual shell) to handle edge cases where the shell is reparented after subprocess exit. The `treeKillAsync` function enumerates all descendant processes via `ps`/`pgrep` before sending SIGKILL.

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:807-856](), [apps/desktop/src/main/terminal-host/session.ts:831-836]()

### State Reset and Waiter Resolution

The `resetProcessState` method clears all subprocess-related state and resolves pending waiters:

```typescript
// From session.ts:838-856
private resetProcessState(): void {
  this.subprocess = null;
  this.subprocessReady = false;
  this.subprocessDecoder = null;
  this.subprocessStdinQueue = [];
  this.subprocessStdinQueuedBytes = 0;
  this.subprocessStdinDrainArmed = false;
  this.subprocessStdoutPaused = false;

  this.emulatorWriteQueue = [];
  this.emulatorWriteQueuedBytes = 0;
  this.emulatorWriteProcessedItems = 0;
  this.nextSnapshotBoundaryWaiterId = 1;
  this.emulatorWriteScheduled = false;
  this.resolveAllSnapshotBoundaryWaiters();

  const waiters = this.emulatorFlushWaiters;
  this.emulatorFlushWaiters = [];
  for (const resolve of waiters) resolve();
}
```

Resolving waiters prevents hanging promises when sessions are disposed while operations are in flight (e.g., `attach` waiting for emulator flush during daemon shutdown).

**Sources:** [apps/desktop/src/main/terminal-host/session.ts:838-856](), [apps/desktop/src/main/terminal-host/session.ts:574-579]()

## Session Cleanup

### Unmount and Detach

The `useTerminalLifecycle` hook schedules a 50ms delayed detach on component unmount:

```typescript
// useEffect cleanup in useTerminalLifecycle
return () => {
  const detachTimeout = setTimeout(() => {
    detachRef.current({ paneId })
    pendingDetaches.delete(paneId)
    coldRestoreState.delete(paneId)
  }, 50)
  pendingDetaches.set(paneId, detachTimeout)
}
```

On mount, pending detaches are cancelled:

```typescript
// useEffect mount in useTerminalLifecycle
const pendingDetach = pendingDetaches.get(paneId)
if (pendingDetach) {
  clearTimeout(pendingDetach)
  pendingDetaches.delete(paneId)
}
```

This 50ms delay prevents flickering when switching tabs rapidly. If the component remounts before the timeout fires (e.g., switching back to the tab), the detach is cancelled and the session remains attached.

**Sources:** [apps/desktop/src/renderer/screens/main/components/WorkspaceView/ContentView/TabsContent/Terminal/hooks/useTerminalLifecycle.ts]()

### Kill vs Detach Semantics

| Operation | Effect                                         | Use Case                         |
| --------- | ---------------------------------------------- | -------------------------------- |
| `detach`  | Updates `lastActive`, keeps session alive      | Tab/pane hidden but may return   |
| `kill`    | Sends SIGTERM, waits for exit, removes session | User closes terminal permanently |
| `signal`  | Sends arbitrary signal (default SIGTERM)       | Ctrl+C equivalent                |

The `detach` operation is purely metadata — it updates the session's `lastActive` timestamp but does not affect the running PTY process.

**Sources:** [apps/desktop/src/main/lib/terminal/manager.ts:267-277](), [apps/desktop/src/main/lib/terminal/manager.ts:251-265](), [apps/desktop/src/main/lib/terminal/manager.ts:236-249]()

### Workspace Cleanup

When closing a workspace, the system kills all associated terminal sessions:

```mermaid
graph TB
    CloseWS["Close Workspace"] --> GetSessions["Filter sessions by workspaceId"]
    GetSessions --> KillBatch["killByWorkspaceId()"]

    KillBatch --> ForEach["For each session"]
    ForEach --> SendSigterm["pty.kill('SIGTERM')"]

    SendSigterm --> WaitExit["Wait for exit event"]
    WaitExit --> Timeout1{Exit in 2s?}

    Timeout1 -->|Yes| Success["Cleanup complete"]
    Timeout1 -->|No| SendSigkill["pty.kill('SIGKILL')"]

    SendSigkill --> Timeout2{Exit in 500ms?}
    Timeout2 -->|Yes| Success
    Timeout2 -->|No| ForceCleanup["Force: isAlive=false, delete session"]

    ForceCleanup --> Success
```

The escalation to SIGKILL prevents hanging processes from blocking workspace teardown.

**Sources:** [apps/desktop/src/main/lib/terminal/manager.ts:316-402]()
