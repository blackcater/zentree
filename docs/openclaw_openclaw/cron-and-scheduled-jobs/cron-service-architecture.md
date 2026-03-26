# Cron Service Architecture

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [src/cron/isolated-agent.auth-profile-propagation.test.ts](src/cron/isolated-agent.auth-profile-propagation.test.ts)
- [src/cron/isolated-agent.delivers-response-has-heartbeat-ok-but-includes.test.ts](src/cron/isolated-agent.delivers-response-has-heartbeat-ok-but-includes.test.ts)
- [src/cron/isolated-agent.delivery.test-helpers.ts](src/cron/isolated-agent.delivery.test-helpers.ts)
- [src/cron/isolated-agent.direct-delivery-core-channels.test.ts](src/cron/isolated-agent.direct-delivery-core-channels.test.ts)
- [src/cron/isolated-agent.direct-delivery-forum-topics.test.ts](src/cron/isolated-agent.direct-delivery-forum-topics.test.ts)
- [src/cron/isolated-agent.mocks.ts](src/cron/isolated-agent.mocks.ts)
- [src/cron/isolated-agent.skips-delivery-without-whatsapp-recipient-besteffortdeliver-true.test.ts](src/cron/isolated-agent.skips-delivery-without-whatsapp-recipient-besteffortdeliver-true.test.ts)
- [src/cron/isolated-agent.test-harness.ts](src/cron/isolated-agent.test-harness.ts)
- [src/cron/isolated-agent.test-setup.ts](src/cron/isolated-agent.test-setup.ts)
- [src/cron/isolated-agent.uses-last-non-empty-agent-text-as.test.ts](src/cron/isolated-agent.uses-last-non-empty-agent-text-as.test.ts)
- [src/cron/isolated-agent/delivery-dispatch.double-announce.test.ts](src/cron/isolated-agent/delivery-dispatch.double-announce.test.ts)
- [src/cron/isolated-agent/delivery-dispatch.ts](src/cron/isolated-agent/delivery-dispatch.ts)
- [src/cron/isolated-agent/run.skill-filter.test.ts](src/cron/isolated-agent/run.skill-filter.test.ts)
- [src/cron/isolated-agent/run.ts](src/cron/isolated-agent/run.ts)
- [src/cron/legacy-delivery.ts](src/cron/legacy-delivery.ts)
- [src/cron/service.delivery-plan.test.ts](src/cron/service.delivery-plan.test.ts)
- [src/cron/service.every-jobs-fire.test.ts](src/cron/service.every-jobs-fire.test.ts)
- [src/cron/service.issue-16156-list-skips-cron.test.ts](src/cron/service.issue-16156-list-skips-cron.test.ts)
- [src/cron/service.issue-regressions.test.ts](src/cron/service.issue-regressions.test.ts)
- [src/cron/service.jobs.test.ts](src/cron/service.jobs.test.ts)
- [src/cron/service.prevents-duplicate-timers.test.ts](src/cron/service.prevents-duplicate-timers.test.ts)
- [src/cron/service.read-ops-nonblocking.test.ts](src/cron/service.read-ops-nonblocking.test.ts)
- [src/cron/service.rearm-timer-when-running.test.ts](src/cron/service.rearm-timer-when-running.test.ts)
- [src/cron/service.restart-catchup.test.ts](src/cron/service.restart-catchup.test.ts)
- [src/cron/service.runs-one-shot-main-job-disables-it.test.ts](src/cron/service.runs-one-shot-main-job-disables-it.test.ts)
- [src/cron/service.skips-main-jobs-empty-systemevent-text.test.ts](src/cron/service.skips-main-jobs-empty-systemevent-text.test.ts)
- [src/cron/service.store-migration.test.ts](src/cron/service.store-migration.test.ts)
- [src/cron/service.store.migration.test.ts](src/cron/service.store.migration.test.ts)
- [src/cron/service.test-harness.ts](src/cron/service.test-harness.ts)
- [src/cron/service/initial-delivery.ts](src/cron/service/initial-delivery.ts)
- [src/cron/service/jobs.ts](src/cron/service/jobs.ts)
- [src/cron/service/locked.ts](src/cron/service/locked.ts)
- [src/cron/service/ops.ts](src/cron/service/ops.ts)
- [src/cron/service/state.ts](src/cron/service/state.ts)
- [src/cron/service/timer.ts](src/cron/service/timer.ts)
- [src/cron/types.ts](src/cron/types.ts)
- [src/gateway/protocol/schema/cron.ts](src/gateway/protocol/schema/cron.ts)
- [src/gateway/server-cron.ts](src/gateway/server-cron.ts)

</details>

## Purpose and Scope

This document describes the architecture of the **Cron Service**, which provides background job scheduling and execution for OpenClaw agents. The cron service runs a persistent timer loop, manages job state, executes scheduled agent turns, and delivers results to configured channels.

For job configuration and scheduling syntax, see [Job Configuration & Scheduling](#6.2). For delivery modes and channel targeting, see [Delivery & Webhooks](#6.4). For the isolated agent execution model, see [Isolated Agent Execution](#6.3).

---

## Service Components

### Core Service Structure

```mermaid
graph TB
    GatewayInit["Gateway Initialization<br/>createGatewayCronState()"]
    CronService["CronService<br/>src/cron/service.ts"]
    State["CronServiceState<br/>src/cron/service/state.ts"]
    Store["CronStoreFile<br/>jobs: CronJob[]"]

    subgraph "Service Dependencies"
        Deps["CronServiceDeps"]
        Logger["Logger (pino)"]
        RunIsolated["runIsolatedAgentJob()"]
        EnqueueSys["enqueueSystemEvent()"]
        ReqHeartbeat["requestHeartbeatNow()"]
    end

    subgraph "State Management"
        State
        Store
        StorePath["storePath<br/>~/.openclaw/state/cron/jobs.json"]
        Lock["Async Lock<br/>locked() wrapper"]
    end

    subgraph "Timer Loop"
        Timer["state.timer<br/>NodeJS.Timeout"]
        ArmTimer["armTimer(state)"]
        OnTimer["onTimer(state)"]
        MaxDelay["MAX_TIMER_DELAY_MS = 60s"]
    end

    GatewayInit --> CronService
    CronService --> State
    CronService --> Deps
    State --> Store
    Store --> StorePath
    State --> Timer
    Timer --> ArmTimer
    ArmTimer --> OnTimer
    OnTimer --> MaxDelay
    OnTimer --> Lock

    Deps --> Logger
    Deps --> RunIsolated
    Deps --> EnqueueSys
    Deps --> ReqHeartbeat
```

**Sources:** [src/cron/service.ts](), [src/cron/service/state.ts:1-135](), [src/gateway/server-cron.ts:1-50]()

The `CronService` class manages the lifecycle of scheduled jobs. It maintains an in-memory `CronServiceState` that holds the loaded job store, an active timer, and a running flag. All state mutations happen within the `locked()` wrapper to prevent concurrent modifications.

| Component          | Type     | Purpose                                                        |
| ------------------ | -------- | -------------------------------------------------------------- |
| `CronService`      | Class    | Public API for job management (add, update, remove, list, run) |
| `CronServiceState` | Type     | Internal state container with store, timer, lock, and deps     |
| `CronStoreFile`    | Type     | Persisted job list (`{ version: 1, jobs: CronJob[] }`)         |
| `locked()`         | Function | Async mutex wrapper for state operations                       |

---

## Service Lifecycle

### Startup Sequence

```mermaid
sequenceDiagram
    participant Gateway as Gateway Server
    participant Svc as CronService
    participant Ops as service/ops.start()
    participant Store as ensureLoaded()
    participant Timer as armTimer()
    participant Missed as runMissedJobs()

    Gateway->>Svc: new CronService(deps)
    Gateway->>Svc: await start()
    Svc->>Ops: start(state)
    Ops->>Store: ensureLoaded(skipRecompute=true)
    Store->>Store: Load jobs.json from disk
    Store->>Store: Clear stale runningAtMs markers
    Ops->>Missed: runMissedJobs(state)
    Missed->>Missed: Find jobs with pastDue nextRunAtMs
    Missed->>Missed: Execute up to maxMissedJobsPerRestart
    Missed->>Missed: Stagger remaining with missedJobStaggerMs
    Ops->>Store: ensureLoaded(forceReload=true)
    Ops->>Ops: recomputeNextRuns(state)
    Ops->>Store: persist(state)
    Ops->>Timer: armTimer(state)
    Timer->>Timer: Calculate nextWakeAtMs from jobs
    Timer->>Timer: setTimeout(onTimer, clampedDelay)
```

**Sources:** [src/cron/service/ops.ts:92-131](), [src/cron/service/timer.ts:507-559](), [src/cron/service/timer.ts:729-925]()

**Startup phases:**

1. **Store Load:** Read `jobs.json` and clear any stale `runningAtMs` markers (from crashes)
2. **Missed Job Catchup:** Execute past-due jobs with staggering to prevent gateway overload
3. **Schedule Recompute:** Calculate `nextRunAtMs` for all enabled jobs
4. **Timer Arm:** Set initial timer based on earliest `nextRunAtMs`

**Staggering parameters** (configurable via `CronServiceDeps`):

| Parameter                 | Default | Purpose                                |
| ------------------------- | ------- | -------------------------------------- |
| `missedJobStaggerMs`      | 5000    | Delay between missed job executions    |
| `maxMissedJobsPerRestart` | 5       | Max jobs to run immediately on startup |

---

## Timer Loop Architecture

### Timer State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: armTimer()
    Idle --> TimerFired: setTimeout expires
    TimerFired --> CheckRunning: onTimer()
    CheckRunning --> RearmRecheck: state.running == true
    CheckRunning --> ExecuteJobs: state.running == false
    RearmRecheck --> Idle: armRunningRecheckTimer()
    ExecuteJobs --> LoadStore: locked()
    LoadStore --> CollectDue: ensureLoaded(forceReload)
    CollectDue --> SetRunningMarkers: findDueJobs(nowMs)
    SetRunningMarkers --> PersistMarkers: job.state.runningAtMs = now
    PersistMarkers --> RunConcurrent: persist()
    RunConcurrent --> ApplyResults: executeJobCoreWithTimeout()
    ApplyResults --> locked2: locked()
    locked2 --> ReloadStore: ensureLoaded(forceReload)
    ReloadStore --> UpdateJobs: applyOutcomeToStoredJob()
    UpdateJobs --> Recompute: recomputeNextRunsForMaintenance()
    Recompute --> Persist: persist()
    Persist --> Rearm: armTimer()
    Rearm --> Idle
```

**Sources:** [src/cron/service/timer.ts:572-690](), [src/cron/service/timer.ts:507-570]()

### Timer Loop Execution Flow

```mermaid
graph TB
    Wake["onTimer() fires"]
    CheckRunning{"state.running?"}
    RearmRecheck["armRunningRecheckTimer()<br/>60s fixed delay"]
    SetRunning["state.running = true"]
    ArmWatchdog["armRunningRecheckTimer()<br/>60s watchdog"]

    LoadDue["locked() &#123;<br/>ensureLoaded(forceReload=true)<br/>collectRunnableJobs(nowMs)<br/>&#125;"]

    MarkRunning["Set job.state.runningAtMs = now<br/>persist()"]
    ExecuteJobs["runDueJob() concurrent<br/>up to maxConcurrentRuns"]

    ApplyOutcome["locked() &#123;<br/>ensureLoaded(forceReload=true)<br/>applyOutcomeToStoredJob(result)<br/>recomputeNextRunsForMaintenance()<br/>persist()<br/>&#125;"]

    SessionReaper["sweepCronRunSessions()<br/>(piggyback reaper)"]
    ClearRunning["state.running = false"]
    ArmNext["armTimer(state)"]

    Wake --> CheckRunning
    CheckRunning -->|true| RearmRecheck
    CheckRunning -->|false| SetRunning
    SetRunning --> ArmWatchdog
    ArmWatchdog --> LoadDue
    LoadDue --> MarkRunning
    MarkRunning --> ExecuteJobs
    ExecuteJobs --> ApplyOutcome
    ApplyOutcome --> SessionReaper
    SessionReaper --> ClearRunning
    ClearRunning --> ArmNext
```

**Sources:** [src/cron/service/timer.ts:572-690](), [src/cron/service/timer.ts:507-559]()

**Key timer constants:**

```
MAX_TIMER_DELAY_MS = 60_000           // Max timer delay (60s)
MIN_REFIRE_GAP_MS = 2_000             // Min gap between same job fires
STUCK_RUN_MS = 2 * 60 * 60 * 1000     // 2 hours stuck marker timeout
```

**Timer loop guarantees:**

- **Non-blocking reads:** `list()`, `status()` do not block timer execution
- **Watchdog rearm:** Timer re-arms while `state.running = true` to prevent scheduler death during long jobs
- **Concurrent execution:** Controlled by `maxConcurrentRuns` (default 1)
- **Session reaper:** Piggybacked on timer tick, self-throttled to 5-minute intervals

---

## Job State Management

### Job State Fields

```mermaid
graph LR
    subgraph "Schedule State"
        NextRun["nextRunAtMs<br/>Scheduled fire time"]
        LastRun["lastRunAtMs<br/>Last execution start"]
        Running["runningAtMs<br/>In-flight marker"]
    end

    subgraph "Execution Outcome"
        Status["lastRunStatus<br/>ok | error | skipped"]
        Error["lastError<br/>Error text"]
        ErrorReason["lastErrorReason<br/>FailoverReason"]
        Duration["lastDurationMs<br/>Execution time"]
    end

    subgraph "Retry State"
        ConsecErrors["consecutiveErrors<br/>Backoff counter"]
        ScheduleErrors["scheduleErrorCount<br/>Auto-disable counter"]
    end

    subgraph "Delivery State"
        DeliveryStatus["lastDeliveryStatus<br/>delivered | not-delivered | unknown"]
        DeliveryError["lastDeliveryError<br/>Delivery failure text"]
        Delivered["lastDelivered<br/>Boolean outcome"]
    end

    subgraph "Alert State"
        AlertTime["lastFailureAlertAtMs<br/>Cooldown timestamp"]
    end

    NextRun -.-> Running
    Running -.-> LastRun
    LastRun -.-> Status
    Status -.-> ConsecErrors
    Status -.-> DeliveryStatus
```

**Sources:** [src/cron/types.ts:109-133]()

### State Transitions During Execution

```mermaid
sequenceDiagram
    participant Timer as onTimer()
    participant Collect as collectRunnableJobs()
    participant Run as executeJobCoreWithTimeout()
    participant Apply as applyJobResult()
    participant Compute as computeJobNextRunAtMs()

    Note over Timer,Collect: Phase 1: Mark Running
    Timer->>Collect: findDueJobs(nowMs)
    Collect->>Collect: nextRunAtMs <= nowMs && !runningAtMs
    Collect->>Collect: job.state.runningAtMs = nowMs
    Collect->>Timer: persist() [running markers]

    Note over Timer,Run: Phase 2: Execute
    Timer->>Run: runDueJob(job)
    Run->>Run: executeJobCore(state, job, abortSignal)
    Run->>Run: Timeout after jobTimeoutMs
    Run-->>Timer: result: status, error, startedAt, endedAt

    Note over Timer,Apply: Phase 3: Apply Outcome
    Timer->>Apply: locked(applyOutcomeToStoredJob)
    Apply->>Apply: job.state.runningAtMs = undefined
    Apply->>Apply: job.state.lastRunAtMs = startedAt
    Apply->>Apply: job.state.lastRunStatus = status

    alt status == "error"
        Apply->>Apply: consecutiveErrors++
        Apply->>Apply: Check transient error patterns
        alt one-shot && transient && attempts <= maxRetries
            Apply->>Compute: nextRunAtMs = endedAt + backoffMs
        else one-shot && !transient
            Apply->>Apply: enabled = false
        else recurring
            Apply->>Compute: nextRunAtMs = max(normalNext, backoffNext)
        end
    else status == "ok" || "skipped"
        Apply->>Apply: consecutiveErrors = 0
        alt one-shot (kind=="at")
            Apply->>Apply: enabled = false (unless deleteAfterRun)
        else recurring
            Apply->>Compute: computeJobNextRunAtMs(job, endedAt)
        end
    end

    Apply->>Timer: persist() [updated state]
```

**Sources:** [src/cron/service/timer.ts:290-474](), [src/cron/service/timer.ts:623-690]()

---

## Job Execution Pipeline

### Isolated Agent Turn Execution

```mermaid
graph TB
    Start["runIsolatedAgentJob(job, message)"]
    ResolveAgent["Resolve agentId, agentConfig, workspace"]
    ResolveModel["Model Selection Pipeline"]
    ResolveSession["resolveCronSession(sessionKey, agentId)"]
    ResolveDelivery["resolveCronDeliveryContext(job, agentId)"]
    BuildPrompt["Build commandBody with timeLine"]
    WrapExternal["Wrap external hook content<br/>(if isExternalHookSession)"]
    ResolveAuth["resolveSessionAuthProfileOverride()"]

    RunAttempt["runWithModelFallback()"]
    RunEmbedded["runEmbeddedPiAgent() or runCliAgent()"]

    CheckInterim{"Interim ack?"}
    FollowUp["Run continuation prompt<br/>(guardrail for interim acks)"]

    UpdateSession["Update session store<br/>(tokens, model, cliSessionId)"]

    DispatchDelivery["dispatchCronDelivery()"]

    Return["Return RunCronAgentTurnResult"]

    Start --> ResolveAgent
    ResolveAgent --> ResolveModel
    ResolveModel --> ResolveSession
    ResolveSession --> ResolveDelivery
    ResolveDelivery --> BuildPrompt
    BuildPrompt --> WrapExternal
    WrapExternal --> ResolveAuth
    ResolveAuth --> RunAttempt
    RunAttempt --> RunEmbedded
    RunEmbedded --> CheckInterim
    CheckInterim -->|Yes + no descendants| FollowUp
    CheckInterim -->|No| UpdateSession
    FollowUp --> UpdateSession
    UpdateSession --> DispatchDelivery
    DispatchDelivery --> Return
```

**Sources:** [src/cron/isolated-agent/run.ts:202-886]()

### Model Selection Precedence

The isolated runner applies a strict model selection cascade:

```mermaid
graph TB
    Start["Model Selection Start"]
    Default["resolveConfiguredModelRef(cfg)<br/>DEFAULT_PROVIDER/DEFAULT_MODEL"]

    CheckSubagent{"subagents.model<br/>defined?"}
    CheckAllowed1["resolveAllowedModelRef(subagentModel)"]
    ApplySubagent["provider, model = subagentModel"]

    CheckGmail{"sessionKey starts with<br/>'hook:gmail:'?"}
    ResolveGmail["resolveHooksGmailModel(cfg)"]
    CheckAllowed2["getModelRefStatus(gmailModel)"]
    ApplyGmail["provider, model = gmailModel"]

    CheckPayload{"job.payload.model<br/>defined?"}
    CheckAllowed3["resolveAllowedModelRef(payloadModel)"]
    ApplyPayload["provider, model = payloadModel"]

    CheckSession{"session.modelOverride<br/>defined?"}
    CheckAllowed4["resolveAllowedModelRef(sessionOverride)"]
    ApplySession["provider, model = sessionOverride"]

    Final["Final: provider, model"]

    Start --> Default
    Default --> CheckSubagent
    CheckSubagent -->|Yes| CheckAllowed1
    CheckAllowed1 -->|Allowed| ApplySubagent
    CheckAllowed1 -->|Not Allowed| CheckGmail
    CheckSubagent -->|No| CheckGmail
    ApplySubagent --> CheckGmail

    CheckGmail -->|Yes| ResolveGmail
    ResolveGmail --> CheckAllowed2
    CheckAllowed2 -->|Allowed| ApplyGmail
    CheckAllowed2 -->|Not Allowed| CheckPayload
    CheckGmail -->|No| CheckPayload
    ApplyGmail --> CheckPayload

    CheckPayload -->|Yes| CheckAllowed3
    CheckAllowed3 -->|Allowed| ApplyPayload
    CheckAllowed3 -->|Not Allowed| CheckSession
    CheckPayload -->|No| CheckSession
    ApplyPayload --> CheckSession

    CheckSession -->|Yes| CheckAllowed4
    CheckAllowed4 -->|Allowed| ApplySession
    CheckAllowed4 -->|Not Allowed| Final
    CheckSession -->|No| Final
    ApplySession --> Final
```

**Sources:** [src/cron/isolated-agent/run.ts:259-402]()

**Model selection order** (highest to lowest priority):

1. **Session override:** Persisted from `/model` directive
2. **Payload override:** `job.payload.model` field
3. **Gmail hook override:** `hooks.gmail.model` (for `hook:gmail:*` sessions)
4. **Subagent model:** `agents.defaults.subagents.model` (isolated runs are subagents)
5. **Default model:** `agents.defaults.model.primary`

All overrides pass through `resolveAllowedModelRef()` to enforce agent-level model allowlists.

---

## Error Handling & Retry

### Error Classification

```mermaid
graph TB
    Error["Execution Error"]
    Classify["isTransientCronError(error, retryOn)"]

    subgraph "Transient Patterns"
        RateLimit["rate_limit<br/>429, rate limit, tokens per day"]
        Overloaded["overloaded<br/>529, high demand, capacity exceeded"]
        Network["network<br/>ECONNRESET, fetch failed"]
        Timeout["timeout<br/>ETIMEDOUT"]
        ServerError["server_error<br/>5xx codes"]
    end

    Classify --> RateLimit
    Classify --> Overloaded
    Classify --> Network
    Classify --> Timeout
    Classify --> ServerError

    RateLimit -.-> Transient["Transient: Retry"]
    Overloaded -.-> Transient
    Network -.-> Transient
    Timeout -.-> Transient
    ServerError -.-> Transient

    Classify --> Permanent["Permanent: Disable Job"]
```

**Sources:** [src/cron/service/timer.ts:133-149]()

### Backoff & Retry Logic

```mermaid
sequenceDiagram
    participant Job as CronJob
    participant Apply as applyJobResult()
    participant Retry as Retry Config
    participant Backoff as errorBackoffMs()

    Job->>Apply: status="error", error="429 rate limit"
    Apply->>Apply: consecutiveErrors++

    alt One-Shot Job (kind="at")
        Apply->>Retry: Check retryOn patterns
        alt Transient && attempts <= maxAttempts
            Apply->>Backoff: errorBackoffMs(consecutiveErrors)
            Backoff-->>Apply: backoffMs (30s, 60s, 5m, 15m, 60m)
            Apply->>Job: nextRunAtMs = endedAt + backoffMs
            Apply->>Job: enabled = true
        else Not Transient || Exhausted
            Apply->>Job: enabled = false
            Apply->>Job: nextRunAtMs = undefined
        end
    else Recurring Job
        Apply->>Backoff: errorBackoffMs(consecutiveErrors)
        Backoff-->>Apply: backoffMs
        Apply->>Apply: normalNext = computeJobNextRunAtMs(endedAt)
        Apply->>Job: nextRunAtMs = max(normalNext, endedAt + backoffMs)
        Apply->>Job: enabled = true (still)
    end
```

**Sources:** [src/cron/service/timer.ts:114-128](), [src/cron/service/timer.ts:290-474]()

**Default backoff schedule:**

| Consecutive Errors | Delay      |
| ------------------ | ---------- |
| 1                  | 30 seconds |
| 2                  | 60 seconds |
| 3                  | 5 minutes  |
| 4                  | 15 minutes |
| 5+                 | 60 minutes |

**Retry configuration** (via `CronConfig.retry`):

| Field         | Default          | Description                               |
| ------------- | ---------------- | ----------------------------------------- |
| `maxAttempts` | 3                | Max retries for one-shot transient errors |
| `backoffMs`   | `[30s, 60s, 5m]` | Custom backoff schedule                   |
| `retryOn`     | All patterns     | Limit retry to specific error types       |

---

## Delivery System

### Delivery Modes

```mermaid
graph TB
    Delivery["job.delivery.mode"]

    None["none<br/>No delivery"]
    Announce["announce<br/>Send to channel"]
    Webhook["webhook<br/>HTTP POST"]

    Delivery --> None
    Delivery --> Announce
    Delivery --> Webhook

    subgraph "Announce Delivery"
        ResolveChannel["resolveDeliveryTarget()<br/>channel, to, accountId"]
        MatchTool{"message tool<br/>already sent?"}
        DirectSend["deliverOutboundPayloads()<br/>(direct channel send)"]
        SubagentFlow["runSubagentAnnounceFlow()<br/>(spawn announce subagent)"]
    end

    subgraph "Webhook Delivery"
        BuildPayload["Build JSON payload<br/>(job, status, summary, error)"]
        PostWebhook["fetchWithSsrFGuard(webhookUrl)"]
        RetryWebhook["Retry with backoff<br/>(transient failures)"]
    end

    Announce --> ResolveChannel
    ResolveChannel --> MatchTool
    MatchTool -->|Yes| Return["delivered = true"]
    MatchTool -->|No| DirectSend
    DirectSend -->|Success| Return
    DirectSend -->|Failure & bestEffort=false| Error["delivered = false, error"]
    DirectSend -->|Failure & bestEffort=true| SubagentFlow
    SubagentFlow --> Return

    Webhook --> BuildPayload
    BuildPayload --> PostWebhook
    PostWebhook -->|Transient Error| RetryWebhook
    PostWebhook -->|Success| Return
    RetryWebhook --> Return
```

**Sources:** [src/cron/isolated-agent/delivery-dispatch.ts:67-510](), [src/gateway/server-cron.ts:94-145]()

### Delivery Dispatch Flow

The delivery system follows a multi-tier fallback strategy to ensure cron results reach their destination:

**Tier 1: Message Tool Suppression**

If the agent used the `message` tool to send to the exact delivery target during execution, skip announce delivery to prevent duplicates.

```
matchesMessagingToolDeliveryTarget(messagingToolSentTargets, deliveryTarget)
```

**Tier 2: Direct Channel Delivery**

Send payloads directly via `deliverOutboundPayloads()`:

```
await deliverOutboundPayloads({
  payloads: [deliveryPayload],
  channel: resolvedDelivery.channel,
  to: resolvedDelivery.to,
  accountId: resolvedDelivery.accountId,
  ...
})
```

**Tier 3: Subagent Announce Flow**

On direct delivery failure with `bestEffort=true`, spawn an announce subagent:

```
await runSubagentAnnounceFlow({
  channel: resolvedDelivery.channel,
  to: resolvedDelivery.to,
  text: synthesizedText,
  ...
})
```

**Tier 4: System Event Fallback**

If all delivery attempts fail or delivery was not requested, the timer loop falls back to `enqueueSystemEvent()` for `wakeMode="now"` jobs.

**Sources:** [src/cron/isolated-agent/delivery-dispatch.ts:148-510](), [src/cron/service/timer.ts:930-1019]()

### Heartbeat Suppression

The delivery system skips announce delivery for **heartbeat-only responses** to prevent notification spam:

```javascript
function isHeartbeatOnlyResponse(payloads, ackMaxChars) {
  const deliveryPayload = pickLastDeliverablePayload(payloads)
  const hasStructuredContent =
    deliveryPayload?.mediaUrl ||
    deliveryPayload?.mediaUrls?.length > 0 ||
    Object.keys(deliveryPayload?.channelData ?? {}).length > 0

  if (hasStructuredContent) return false

  const text = pickLastNonEmptyTextFromPayloads(payloads)?.trim() ?? ''
  const charLimit = ackMaxChars >= 0 ? ackMaxChars : 50

  return /^HEARTBEAT_OK\b/i.test(text) && text.length <= charLimit
}
```

**Sources:** [src/cron/isolated-agent/helpers.ts:77-107](), [src/cron/isolated-agent/run.ts:826-827]()

---

## Integration Points

### Gateway Integration

The cron service integrates with the gateway via `createGatewayCronState()`:

```mermaid
graph LR
    Gateway["Gateway Server<br/>setupGateway()"]
    CreateState["createGatewayCronState(cfg)"]
    CronService["new CronService(deps)"]

    subgraph "Dependencies"
        RunIsolated["runIsolatedAgentJob<br/>(runCronIsolatedAgentTurn)"]
        EnqueueSys["enqueueSystemEvent"]
        ReqHeart["requestHeartbeatNow"]
        RunHeart["runHeartbeatOnce"]
        SendFailure["sendCronFailureAlert"]
    end

    Gateway --> CreateState
    CreateState --> CronService
    CronService --> RunIsolated
    CronService --> EnqueueSys
    CronService --> ReqHeart
    CronService --> RunHeart
    CronService --> SendFailure
```

**Sources:** [src/gateway/server-cron.ts:146-338]()

**Key integration points:**

| Dependency             | Purpose                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| `runIsolatedAgentJob`  | Wraps `runCronIsolatedAgentTurn()` with logging and run log persistence |
| `enqueueSystemEvent`   | Fallback delivery for `wakeMode="now"` jobs when announce fails         |
| `requestHeartbeatNow`  | Triggers heartbeat for `wakeMode="next-heartbeat"` jobs                 |
| `runHeartbeatOnce`     | Synchronous heartbeat execution for `wakeMode="now"` jobs               |
| `sendCronFailureAlert` | Delivers failure alerts via announce or webhook                         |

### RPC Methods

The cron service exposes these RPC methods via the gateway protocol:

| Method           | Operation            | Scope      |
| ---------------- | -------------------- | ---------- |
| `cron.status`    | Get service status   | `operator` |
| `cron.list`      | List jobs (filtered) | `operator` |
| `cron.list_page` | Paginated job list   | `operator` |
| `cron.add`       | Create new job       | `operator` |
| `cron.update`    | Update job config    | `operator` |
| `cron.remove`    | Delete job           | `operator` |
| `cron.run`       | Manual job execution | `operator` |
| `cron.runs_list` | List run history     | `operator` |

**Sources:** [src/gateway/protocol/schema/cron.ts:1-246]()

---

## Concurrency & Locking

### Async Lock Wrapper

All state mutations use the `locked()` wrapper to prevent race conditions:

```typescript
async function locked<T>(
  state: CronServiceState,
  fn: () => Promise<T>
): Promise<T> {
  await state.lock.acquire()
  try {
    return await fn()
  } finally {
    state.lock.release()
  }
}
```

**Critical sections protected by lock:**

- Job add/update/remove operations
- Timer tick (due job collection + result application)
- Manual `run()` execution
- Store load/persist operations

**Non-blocking operations:**

- `list()` and `status()` use `skipRecompute=true` and maintenance-only recompute to avoid advancing past-due jobs during reads
- Timer re-arm uses fixed delays when `state.running=true` to prevent scheduler death

**Sources:** [src/cron/service/locked.ts:1-15](), [src/cron/service/ops.ts:79-90]()

### Concurrent Execution

Jobs can execute concurrently within a timer tick, controlled by `maxConcurrentRuns`:

```typescript
const concurrency = Math.min(
  resolveRunConcurrency(state), // Default: 1
  Math.max(1, dueJobs.length)
)

const workers = Array.from({ length: concurrency }, async () => {
  for (;;) {
    const index = cursor++
    if (index >= dueJobs.length) return
    results[index] = await runDueJob(dueJobs[index])
  }
})

await Promise.all(workers)
```

**Sources:** [src/cron/service/timer.ts:653-669]()

This worker pool pattern ensures:

- Jobs execute in parallel up to `maxConcurrentRuns`
- Results preserve original job order for deterministic application
- Timer remains responsive during long-running jobs via watchdog re-arm
