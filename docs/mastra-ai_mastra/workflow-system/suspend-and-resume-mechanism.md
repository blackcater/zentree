# Suspend and Resume Mechanism

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/core/src/workflows/default.ts](packages/core/src/workflows/default.ts)
- [packages/core/src/workflows/evented/evented-workflow.test.ts](packages/core/src/workflows/evented/evented-workflow.test.ts)
- [packages/core/src/workflows/evented/execution-engine.ts](packages/core/src/workflows/evented/execution-engine.ts)
- [packages/core/src/workflows/evented/step-executor.test.ts](packages/core/src/workflows/evented/step-executor.test.ts)
- [packages/core/src/workflows/evented/step-executor.ts](packages/core/src/workflows/evented/step-executor.ts)
- [packages/core/src/workflows/evented/workflow-event-processor/index.ts](packages/core/src/workflows/evented/workflow-event-processor/index.ts)
- [packages/core/src/workflows/evented/workflow.ts](packages/core/src/workflows/evented/workflow.ts)
- [packages/core/src/workflows/execution-engine.ts](packages/core/src/workflows/execution-engine.ts)
- [packages/core/src/workflows/step.ts](packages/core/src/workflows/step.ts)
- [packages/core/src/workflows/types.ts](packages/core/src/workflows/types.ts)
- [packages/core/src/workflows/utils.ts](packages/core/src/workflows/utils.ts)
- [packages/core/src/workflows/workflow.test.ts](packages/core/src/workflows/workflow.test.ts)
- [packages/core/src/workflows/workflow.ts](packages/core/src/workflows/workflow.ts)
- [workflows/inngest/src/execution-engine.ts](workflows/inngest/src/execution-engine.ts)
- [workflows/inngest/src/index.test.ts](workflows/inngest/src/index.test.ts)
- [workflows/inngest/src/index.ts](workflows/inngest/src/index.ts)
- [workflows/inngest/src/run.ts](workflows/inngest/src/run.ts)
- [workflows/inngest/src/workflow.ts](workflows/inngest/src/workflow.ts)

</details>

## Purpose and Scope

This document describes the suspend and resume mechanism in Mastra workflows, which allows workflow execution to pause at any step and later continue from that point with new data. This enables human-in-the-loop workflows, external event integration, and long-running processes that require user input or approval.

For information about workflow execution in general, see [Workflow System](#4). For control flow patterns like loops and conditionals, see [Control Flow Patterns](#4.5). For workflow state management beyond suspend/resume, see [Workflow State Management and Persistence](#4.3).

---

## Suspend and Resume Lifecycle

The suspend and resume mechanism follows a specific lifecycle where a running workflow can pause execution, persist its state, and later continue from the exact point of suspension.

### Lifecycle Diagram

```mermaid
stateDiagram-v2
    [*] --> Running: workflow.start()
    Running --> Suspended: step.suspend()
    Suspended --> Storage: Persist WorkflowRunState
    Storage --> Suspended: State saved
    Suspended --> Running: run.resume()
    Running --> Success: Complete
    Running --> Failed: Error
    Success --> [*]
    Failed --> [*]

    note right of Suspended
        suspendPayload stored
        suspendedPaths tracked
        resumeLabels available
    end note

    note right of Running
        resumeData passed to step
        execution continues from
        suspended step
    end note
```

**Sources:** [packages/core/src/workflows/types.ts:106-114](), [packages/core/src/workflows/types.ts:260-270]()

---

## Step Suspend Function

Steps can suspend workflow execution by calling the `suspend` function provided in their execution context. The suspend function is typed to enforce schema validation when a `suspendSchema` is defined.

### Suspend Function Signature

```mermaid
graph TB
    subgraph "ExecuteFunctionParams"
        SUSPEND["suspend function"]
        SUSPEND_SIG["suspend(payload, options)"]
        OPTIONS["SuspendOptions"]
    end

    subgraph "SuspendOptions"
        RESUME_LABEL["resumeLabel?: string | string[]"]
        CUSTOM_PROPS["...custom properties"]
    end

    subgraph "Return Type"
        INNER_OUTPUT["InnerOutput"]
        BRANDED["void & { [SuspendBrand]: never }"]
    end

    SUSPEND --> SUSPEND_SIG
    SUSPEND_SIG --> OPTIONS
    OPTIONS --> RESUME_LABEL
    OPTIONS --> CUSTOM_PROPS
    SUSPEND_SIG --> INNER_OUTPUT
    INNER_OUTPUT --> BRANDED

    note1["Branded type ensures only
    suspend() can return this value"]
    BRANDED -.-> note1
```

**Type Definition:**

| Component        | Type                                                           | Purpose                               |
| ---------------- | -------------------------------------------------------------- | ------------------------------------- |
| `suspend`        | `(payload: TSuspend, options?: SuspendOptions) => InnerOutput` | Function to pause execution           |
| `TSuspend`       | Inferred from `suspendSchema`                                  | Type-safe suspend payload             |
| `SuspendOptions` | `{ resumeLabel?: string \| string[], ...custom }`              | Suspend configuration                 |
| `InnerOutput`    | `void & { readonly [SuspendBrand]: never }`                    | Branded type preventing misuse        |
| `resumeLabel`    | `string \| string[]`                                           | Named resume points for multi-suspend |

**Sources:** [packages/core/src/workflows/step.ts:13-22](), [packages/core/src/workflows/step.ts:48-50]()

### Suspend Execution Example

When a step calls `suspend()`, the execution engine detects the special return value and triggers the suspend process:

```mermaid
sequenceDiagram
    participant Step as "Step execute()"
    participant Engine as "ExecutionEngine"
    participant Storage as "WorkflowStore"
    participant Context as "ExecutionContext"

    Step->>Engine: return suspend(payload, options)
    Engine->>Engine: Detect InnerOutput type
    Engine->>Context: Mark suspendedPaths[stepId]
    Engine->>Context: Store resumeLabels (if provided)
    Engine->>Storage: persistWorkflowSnapshot()
    Storage-->>Engine: Snapshot saved
    Engine-->>Step: Workflow suspended

    Note over Storage: WorkflowRunState:<br/>status='suspended'<br/>suspendedPaths={}<br/>resumeLabels={}
```

**Sources:** [packages/core/src/workflows/workflow.ts:546-579](), [packages/core/src/workflows/default.ts:414-473]()

---

## Suspend Data Flow

The suspend mechanism captures the current workflow state and persists it for later resumption. The data flows through validation, serialization, and storage layers.

### Suspend State Capture

```mermaid
graph LR
    subgraph "Step Execution"
        EXEC["step.execute()"]
        SUSPEND_CALL["suspend(payload, options)"]
    end

    subgraph "Validation"
        VALIDATE_SUSPEND["validateStepSuspendData()"]
        SUSPEND_SCHEMA["suspendSchema (Zod)"]
    end

    subgraph "Execution Context"
        SUSPENDED_PATHS["suspendedPaths<br/>{stepId: [path]}"]
        RESUME_LABELS["resumeLabels<br/>{label: {stepId, foreachIndex}}"]
        STEP_RESULTS["stepResults<br/>{stepId: StepSuspended}"]
    end

    subgraph "Persistence"
        SNAPSHOT["WorkflowRunState"]
        STORAGE["WorkflowStore"]
    end

    EXEC --> SUSPEND_CALL
    SUSPEND_CALL --> VALIDATE_SUSPEND
    VALIDATE_SUSPEND --> SUSPEND_SCHEMA
    VALIDATE_SUSPEND --> SUSPENDED_PATHS
    SUSPEND_CALL --> RESUME_LABELS
    SUSPENDED_PATHS --> STEP_RESULTS
    STEP_RESULTS --> SNAPSHOT
    SNAPSHOT --> STORAGE
```

**Suspend Data Structure:**

| Field            | Type                                     | Description                            |
| ---------------- | ---------------------------------------- | -------------------------------------- |
| `suspendPayload` | `TSuspend`                               | User data to persist during suspension |
| `suspendedPaths` | `Record<string, number[]>`               | Execution paths that are suspended     |
| `resumeLabels`   | `Record<string, {stepId, foreachIndex}>` | Named resume points                    |
| `status`         | `'suspended'`                            | Workflow run status                    |
| `context`        | `Record<string, StepResult>`             | All step results including suspended   |

**Sources:** [packages/core/src/workflows/types.ts:814-837](), [packages/core/src/workflows/utils.ts:94-131]()

### StepSuspended Result

When a step suspends, its result is stored with status `'suspended'`:

```typescript
{
  status: 'suspended',
  payload: any,              // Input data that was passed to the step
  suspendPayload: TSuspend,  // Data provided in suspend() call
  suspendOutput?: TOutput,   // Optional output snapshot
  startedAt: number,         // Timestamp when step started
  suspendedAt: number,       // Timestamp when suspend() was called
  metadata?: StepMetadata    // Optional custom metadata
}
```

**Sources:** [packages/core/src/workflows/types.ts:106-114]()

---

## Resume Mechanism

Resuming a suspended workflow loads the persisted state from storage and continues execution from the suspended step, passing the `resumeData` to the step's execute function.

### Resume Data Flow

```mermaid
graph TB
    subgraph "Client Call"
        RESUME_CALL["run.resume({<br/>step, resumeData,<br/>label, forEachIndex})"]
    end

    subgraph "Storage Retrieval"
        GET_SNAPSHOT["getWorkflowRunById()"]
        LOAD_STATE["Load WorkflowRunState"]
        SUSPENDED_PATHS_LOAD["Extract suspendedPaths"]
    end

    subgraph "Validation"
        VALIDATE_RESUME["validateStepResumeData()"]
        RESUME_SCHEMA["resumeSchema (Zod)"]
    end

    subgraph "Resume Execution"
        RESOLVE_STEP["Resolve step from label or stepId"]
        BUILD_CONTEXT["Build ExecutionContext<br/>with resumeData"]
        EXECUTE_FROM["executeEntry() from<br/>suspended execution path"]
    end

    subgraph "Step Execution"
        STEP_EXEC["step.execute({<br/>resumeData,<br/>...context})"]
        CONTINUE["Continue workflow"]
    end

    RESUME_CALL --> GET_SNAPSHOT
    GET_SNAPSHOT --> LOAD_STATE
    LOAD_STATE --> SUSPENDED_PATHS_LOAD
    SUSPENDED_PATHS_LOAD --> RESOLVE_STEP
    RESOLVE_STEP --> VALIDATE_RESUME
    VALIDATE_RESUME --> RESUME_SCHEMA
    VALIDATE_RESUME --> BUILD_CONTEXT
    BUILD_CONTEXT --> EXECUTE_FROM
    EXECUTE_FROM --> STEP_EXEC
    STEP_EXEC --> CONTINUE
```

**Sources:** [packages/core/src/workflows/workflow.ts:1485-1583](), [packages/core/src/workflows/utils.ts:63-92]()

### Resume API Methods

The `Run` instance provides methods for resuming suspended workflows:

| Method           | Signature                                                 | Purpose                        |
| ---------------- | --------------------------------------------------------- | ------------------------------ |
| `resume()`       | `resume(options: ResumeOptions): Promise<WorkflowResult>` | Resume and wait for completion |
| `resumeStream()` | `resumeStream(options: ResumeOptions): WorkflowRunOutput` | Resume with streaming output   |

**ResumeOptions:**

```typescript
{
  step?: Step | string,        // Step to resume (or use label)
  label?: string,              // Resume label (alternative to step)
  resumeData?: TResume,        // Data to pass to resumed step
  forEachIndex?: number        // Index when resuming foreach loops
}
```

**Sources:** [packages/core/src/workflows/workflow.ts:1485-1583]()

---

## Schema Validation

Suspend and resume operations support Zod schema validation to ensure type safety and data integrity across suspension boundaries.

### Validation Flow

```mermaid
graph TB
    subgraph "Step Definition"
        STEP_DEF["createStep({<br/>suspendSchema,<br/>resumeSchema})"]
    end

    subgraph "Suspend Validation"
        SUSPEND_CALL["suspend(payload)"]
        VALIDATE_SUSPEND["validateStepSuspendData()"]
        SUSPEND_PARSE["suspendSchema.safeParseAsync()"]
        SUSPEND_ERROR["MastraError:<br/>WORKFLOW_STEP_SUSPEND_<br/>DATA_VALIDATION_FAILED"]
    end

    subgraph "Resume Validation"
        RESUME_CALL["resume({resumeData})"]
        VALIDATE_RESUME["validateStepResumeData()"]
        RESUME_PARSE["resumeSchema.safeParseAsync()"]
        RESUME_ERROR["MastraError:<br/>WORKFLOW_STEP_RESUME_<br/>DATA_VALIDATION_FAILED"]
    end

    subgraph "Runtime Check"
        IS_ZOD["isZodType(schema)"]
        VALIDATE_INPUTS["validateInputs option"]
    end

    STEP_DEF --> SUSPEND_CALL
    STEP_DEF --> RESUME_CALL

    SUSPEND_CALL --> VALIDATE_SUSPEND
    VALIDATE_SUSPEND --> IS_ZOD
    IS_ZOD --> VALIDATE_INPUTS
    VALIDATE_INPUTS --> SUSPEND_PARSE
    SUSPEND_PARSE -->|error| SUSPEND_ERROR

    RESUME_CALL --> VALIDATE_RESUME
    VALIDATE_RESUME --> IS_ZOD
    VALIDATE_INPUTS --> RESUME_PARSE
    RESUME_PARSE -->|error| RESUME_ERROR
```

**Validation Error Format:**

When validation fails, a `MastraError` is thrown with detailed path information:

```
Step suspend data validation failed:
- field.path: expected string, received number
- nested.field: required
```

**Sources:** [packages/core/src/workflows/utils.ts:94-131](), [packages/core/src/workflows/utils.ts:63-92]()

### Schema Definition Example

```typescript
const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({ request: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
  suspendSchema: z.object({
    requestId: z.string(),
    timestamp: z.number(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    approverEmail: z.string(),
  }),
  execute: async ({ suspend, resumeData }) => {
    if (!resumeData) {
      // First execution - suspend for approval
      return suspend({
        requestId: generateId(),
        timestamp: Date.now(),
      })
    }
    // Resumed - process approval
    return { approved: resumeData.approved }
  },
})
```

**Sources:** [packages/core/src/workflows/step.ts:144-171]()

---

## State Persistence

When a workflow suspends, its complete state is persisted to storage, enabling resume operations even after server restarts.

### WorkflowRunState Structure

```mermaid
graph TB
    subgraph "WorkflowRunState"
        RUN_ID["runId: string"]
        STATUS["status: 'suspended'"]
        CONTEXT["context: Record<string, StepResult>"]
        SUSPENDED["suspendedPaths:<br/>Record<string, number[]>"]
        RESUME_LBL["resumeLabels:<br/>Record<string, {stepId, foreachIndex}>"]
        ACTIVE["activePaths: number[]"]
        EXEC_PATH["stepExecutionPath?: string[]"]
        STATE["Custom state:<br/>Record<string, any>"]
    end

    subgraph "Persistence Layer"
        STORE["WorkflowStore"]
        PERSIST["persistWorkflowSnapshot()"]
        RETRIEVE["getWorkflowRunById()"]
    end

    subgraph "Storage Implementations"
        PG["@mastra/pg<br/>PostgreSQL"]
        LIBSQL["@mastra/libsql<br/>LibSQL/Turso"]
        MOCK["MockStore<br/>(in-memory)"]
    end

    RUN_ID --> PERSIST
    STATUS --> PERSIST
    CONTEXT --> PERSIST
    SUSPENDED --> PERSIST
    RESUME_LBL --> PERSIST
    ACTIVE --> PERSIST
    EXEC_PATH --> PERSIST
    STATE --> PERSIST

    PERSIST --> STORE
    STORE --> PG
    STORE --> LIBSQL
    STORE --> MOCK

    RETRIEVE --> CONTEXT
```

**Key State Fields:**

| Field               | Purpose                                    | Example                                                |
| ------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `suspendedPaths`    | Tracks which execution paths are suspended | `{ "step1": [0, 1] }`                                  |
| `resumeLabels`      | Maps labels to suspended steps             | `{ "approval": { stepId: "step1", foreachIndex: 0 } }` |
| `context`           | All step results including suspended ones  | `{ "step1": { status: "suspended", ... } }`            |
| `stepExecutionPath` | Linear path of executed steps              | `["input", "step1", "step2"]`                          |
| `activePaths`       | Current execution indices in step graph    | `[2, 1]`                                               |

**Sources:** [packages/core/src/workflows/types.ts:328-353](), [packages/core/src/workflows/workflow.ts:1713-1789]()

### Snapshot Persistence Trigger

Snapshots are persisted based on the `shouldPersistSnapshot` option:

```typescript
createWorkflow({
  // ...
  options: {
    shouldPersistSnapshot: ({ stepResults, workflowStatus }) => {
      // Persist on suspend, fail, or every 10 steps
      return (
        workflowStatus === 'suspended' ||
        workflowStatus === 'failed' ||
        Object.keys(stepResults).length % 10 === 0
      )
    },
  },
})
```

**Sources:** [packages/core/src/workflows/types.ts:419-440]()

---

## Execution Engine Implementations

Different execution engines handle suspend and resume with varying levels of durability and features.

### Engine Comparison

```mermaid
graph TB
    subgraph "DefaultExecutionEngine"
        DEFAULT_SUSPEND["In-memory suspension"]
        DEFAULT_RESUME["Direct step continuation"]
        DEFAULT_STORAGE["Requires storage for<br/>cross-restart resume"]
    end

    subgraph "EventedExecutionEngine"
        EVENTED_SUSPEND["Event-driven suspension"]
        EVENTED_RESUME["Async resume via events"]
        EVENTED_PUBSUB["PubSub coordination"]
    end

    subgraph "InngestExecutionEngine"
        INNGEST_SUSPEND["Durable suspension"]
        INNGEST_RESUME["Platform-managed resume"]
        INNGEST_WAIT["step.waitForEvent()"]
    end

    subgraph "Common Mechanism"
        SUSPEND_FUNC["suspend() function"]
        RESUME_DATA["resumeData passing"]
        VALIDATION["Schema validation"]
    end

    SUSPEND_FUNC --> DEFAULT_SUSPEND
    SUSPEND_FUNC --> EVENTED_SUSPEND
    SUSPEND_FUNC --> INNGEST_SUSPEND

    RESUME_DATA --> DEFAULT_RESUME
    RESUME_DATA --> EVENTED_RESUME
    RESUME_DATA --> INNGEST_RESUME

    VALIDATION --> DEFAULT_STORAGE
    VALIDATION --> EVENTED_PUBSUB
    VALIDATION --> INNGEST_WAIT
```

**Sources:** [packages/core/src/workflows/default.ts:53-185](), [packages/core/src/workflows/evented/execution-engine.ts:19-149](), [workflows/inngest/src/execution-engine.ts:21-184]()

### DefaultExecutionEngine Suspend Flow

The default engine uses a straightforward in-memory approach with optional storage persistence:

```mermaid
sequenceDiagram
    participant Step
    participant Engine as DefaultExecutionEngine
    participant Context as ExecutionContext
    participant Storage

    Step->>Engine: suspend(payload, options)
    Engine->>Context: suspendedPaths[stepId] = executionPath
    alt resumeLabel provided
        Engine->>Context: resumeLabels[label] = {stepId, foreachIndex}
    end
    Engine->>Storage: persistWorkflowSnapshot()
    Storage-->>Engine: Snapshot saved
    Engine-->>Step: Return StepSuspended result

    Note over Engine,Storage: Status: 'suspended'<br/>Execution halted
```

**Sources:** [packages/core/src/workflows/default.ts:662-840]()

### InngestExecutionEngine Suspend Flow

Inngest provides durable suspension with platform-level support:

```mermaid
sequenceDiagram
    participant Step
    participant Engine as InngestExecutionEngine
    participant InngestStep as inngest.step
    participant Platform as Inngest Platform

    Step->>Engine: suspend(payload, options)
    Engine->>InngestStep: step.waitForEvent(eventName)
    InngestStep->>Platform: Register event listener
    Platform-->>Engine: Workflow paused (durable)

    Note over Platform: Workflow state persisted<br/>by Inngest platform

    Platform->>InngestStep: Event received (resume)
    InngestStep->>Engine: Continue execution
    Engine->>Step: resumeData from event payload
```

**Sources:** [workflows/inngest/src/execution-engine.ts:185-298]()

---

## Resume Labels

Resume labels enable workflows with multiple suspension points to resume at specific locations without knowing the exact step ID.

### Resume Label Mechanism

```mermaid
graph TB
    subgraph "Suspend with Labels"
        SUSPEND_1["suspend(data1, {<br/>resumeLabel: 'approval'})"]
        SUSPEND_2["suspend(data2, {<br/>resumeLabel: 'payment'})"]
        SUSPEND_3["suspend(data3, {<br/>resumeLabel: ['approval', 'payment']})"]
    end

    subgraph "Resume Label Registry"
        LABELS["resumeLabels: {<br/>'approval': {stepId: 'step1'},<br/>'payment': {stepId: 'step3'}<br/>}"]
    end

    subgraph "Resume by Label"
        RESUME_APPROVAL["resume({<br/>label: 'approval',<br/>resumeData})"]
        RESUME_PAYMENT["resume({<br/>label: 'payment',<br/>resumeData})"]
    end

    subgraph "Resolution"
        FIND_STEP["Find stepId from<br/>resumeLabels[label]"]
        EXECUTE["Execute from<br/>resolved step"]
    end

    SUSPEND_1 --> LABELS
    SUSPEND_2 --> LABELS
    SUSPEND_3 --> LABELS

    RESUME_APPROVAL --> FIND_STEP
    RESUME_PAYMENT --> FIND_STEP
    LABELS --> FIND_STEP
    FIND_STEP --> EXECUTE
```

**Use Case Example:**

```typescript
// Multi-stage approval workflow
const step1 = createStep({
  id: 'request-approval',
  execute: async ({ suspend, resumeData }) => {
    if (!resumeData) {
      return suspend(
        { timestamp: Date.now() },
        {
          resumeLabel: 'approval-needed',
        }
      )
    }
    return { approved: resumeData.approved }
  },
})

// Later, resume by label without knowing step ID
await run.resume({
  label: 'approval-needed',
  resumeData: { approved: true },
})
```

**Sources:** [packages/core/src/workflows/workflow.ts:1485-1583](), [packages/core/src/workflows/types.ts:814-837]()

---

## Parallel Step Suspension

When parallel steps suspend, the workflow tracks multiple suspended paths and requires all to be resumed before continuing.

### Parallel Suspend Pattern

```mermaid
graph TB
    subgraph "Parallel Execution"
        PARALLEL[".parallel([step1, step2, step3])"]
        STEP1["step1: suspend({id: 1})"]
        STEP2["step2: suspend({id: 2})"]
        STEP3["step3: complete"]
    end

    subgraph "SuspendedPaths State"
        PATH1["suspendedPaths: {<br/>'step1': [1, 0],<br/>'step2': [1, 1]<br/>}"]
    end

    subgraph "Resume Coordination"
        RESUME1["resume({step: 'step1',<br/>resumeData: {result: 'A'}})"]
        RESUME2["resume({step: 'step2',<br/>resumeData: {result: 'B'}})"]
        CHECK["Check if all parallel<br/>paths resumed"]
    end

    subgraph "Continuation"
        MERGE["Merge results from<br/>all parallel branches"]
        NEXT["Continue to next step"]
    end

    PARALLEL --> STEP1
    PARALLEL --> STEP2
    PARALLEL --> STEP3

    STEP1 --> PATH1
    STEP2 --> PATH1

    PATH1 --> RESUME1
    PATH1 --> RESUME2

    RESUME1 --> CHECK
    RESUME2 --> CHECK
    CHECK --> MERGE
    MERGE --> NEXT
```

**Parallel Suspended Result:**

When parallel steps suspend, the workflow result includes a `suspended` field with all suspended paths:

```typescript
{
  status: 'suspended',
  steps: {
    step1: { status: 'suspended', suspendPayload: {id: 1}, ... },
    step2: { status: 'suspended', suspendPayload: {id: 2}, ... },
    step3: { status: 'success', output: {...}, ... }
  },
  suspended: [
    ['step1'],
    ['step2']
  ],
  suspendPayload: {
    step1: {id: 1},
    step2: {id: 2}
  }
}
```

**Sources:** [packages/core/src/workflows/types.ts:688-706](), [packages/core/src/workflows/default.ts:589-603]()

---

## Code Entities Reference

### Core Classes and Functions

```mermaid
graph TB
    subgraph "Step Definition"
        createStep["createStep()"]
        Step["Step<TSuspend, TResume>"]
        ExecuteFunction["ExecuteFunction"]
    end

    subgraph "Execution"
        Workflow["Workflow"]
        Run["Run"]
        ExecutionEngine["ExecutionEngine"]
        DefaultExecutionEngine["DefaultExecutionEngine"]
    end

    subgraph "State Management"
        ExecutionContext["ExecutionContext"]
        WorkflowRunState["WorkflowRunState"]
        StepResult["StepResult"]
        StepSuspended["StepSuspended"]
    end

    subgraph "Validation"
        validateStepSuspendData["validateStepSuspendData()"]
        validateStepResumeData["validateStepResumeData()"]
        isZodType["isZodType()"]
    end

    subgraph "Storage"
        WorkflowStore["WorkflowStore"]
        persistWorkflowSnapshot["persistWorkflowSnapshot()"]
        getWorkflowRunById["getWorkflowRunById()"]
    end

    createStep --> Step
    Step --> ExecuteFunction
    ExecuteFunction -.->|provides| suspend

    Workflow --> Run
    Run --> resume
    Run --> resumeStream

    ExecutionEngine --> DefaultExecutionEngine
    DefaultExecutionEngine --> ExecutionContext

    ExecutionContext --> suspendedPaths
    ExecutionContext --> resumeLabels

    suspend --> validateStepSuspendData
    resume --> validateStepResumeData
    validateStepSuspendData --> isZodType
    validateStepResumeData --> isZodType

    ExecutionContext --> WorkflowRunState
    WorkflowRunState --> persistWorkflowSnapshot
    persistWorkflowSnapshot --> WorkflowStore

    resume --> getWorkflowRunById
    getWorkflowRunById --> WorkflowStore
```

**Key Files:**

| File                                              | Key Exports                                                |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `packages/core/src/workflows/step.ts`             | `Step`, `ExecuteFunction`, `SuspendOptions`, `InnerOutput` |
| `packages/core/src/workflows/workflow.ts`         | `createStep()`, `createWorkflow()`, `Workflow`, `Run`      |
| `packages/core/src/workflows/types.ts`            | `StepSuspended`, `WorkflowRunState`, `ExecutionContext`    |
| `packages/core/src/workflows/utils.ts`            | `validateStepSuspendData()`, `validateStepResumeData()`    |
| `packages/core/src/workflows/default.ts`          | `DefaultExecutionEngine`                                   |
| `packages/core/src/workflows/execution-engine.ts` | `ExecutionEngine` (base class)                             |

**Sources:** [packages/core/src/workflows/step.ts:1-188](), [packages/core/src/workflows/workflow.ts:1-2362](), [packages/core/src/workflows/types.ts:1-880](), [packages/core/src/workflows/utils.ts:1-476]()

---

## Advanced Features

### ForEach Loop Suspension

Workflows can suspend within `foreach` loops, requiring the `forEachIndex` parameter to resume the correct iteration:

```typescript
const workflow = createWorkflow({...})
  .foreach(processItems, itemsArray, { concurrency: 3 })
  .commit();

// Step suspends during iteration 2
const result = await run.start({ inputData });
// result.status === 'suspended'

// Resume specific iteration
await run.resume({
  step: processItems,
  forEachIndex: 2,
  resumeData: { processed: true }
});
```

**Sources:** [packages/core/src/workflows/workflow.ts:1485-1583]()

### Nested Workflow Suspension

When a nested workflow suspends, the parent workflow also enters a suspended state. Resume must target the nested workflow step:

```mermaid
graph TB
    subgraph "Parent Workflow"
        P_STEP1["step1"]
        P_NESTED["nestedWorkflow<br/>(step)"]
        P_STEP3["step3"]
    end

    subgraph "Nested Workflow"
        N_STEP1["nested-step1"]
        N_SUSPEND["nested-step2<br/>suspend()"]
        N_STEP3["nested-step3"]
    end

    P_STEP1 --> P_NESTED
    P_NESTED --> N_STEP1
    N_STEP1 --> N_SUSPEND
    N_SUSPEND -.->|suspends parent| P_NESTED

    P_NESTED -->|when resumed| N_STEP3
    N_STEP3 --> P_STEP3
```

**Resume Nested Workflow:**

```typescript
// Parent workflow includes nested workflow as a step
const parentWorkflow = createWorkflow({...})
  .then(nestedWorkflow)  // nestedWorkflow is another workflow
  .commit();

// Resume the nested workflow's suspended step
await run.resume({
  step: 'nested-step2',  // Step ID within nested workflow
  resumeData: { value: 123 }
});
```

**Sources:** [packages/core/src/workflows/evented/workflow-event-processor/index.ts:156-396]()

### Workflow Metadata in Suspend Payload

Internal workflow metadata is automatically added to suspend payloads for coordination but filtered out when exposed to user code:

```typescript
{
  suspendPayload: {
    // User data
    requestId: '123',
    timestamp: 1234567890,

    // Internal metadata (filtered before exposure)
    __workflow_meta: {
      path: ['nestedStep1', 'nestedStep2'],
      runId: 'nested-run-id'
    }
  }
}
```

**Filtering occurs in:**

- Step execution context preparation
- Resume data extraction
- Workflow result formatting

**Sources:** [packages/core/src/workflows/evented/step-executor.ts:105-120](), [packages/core/src/workflows/default.ts:592-597]()

---

## API Quick Reference

### Suspend API

```typescript
// In step execute function
execute: async ({ suspend, resumeData, ...context }) => {
  if (!resumeData) {
    // First execution - suspend
    return suspend(
      { requestId: '123', timestamp: Date.now() },
      { resumeLabel: 'approval' }
    )
  }

  // Resumed execution
  return { approved: resumeData.approved }
}
```

### Resume API

```typescript
// Resume by step ID
await run.resume({
  step: 'approval-step',
  resumeData: { approved: true },
})

// Resume by label
await run.resume({
  label: 'approval',
  resumeData: { approved: true },
})

// Resume specific foreach iteration
await run.resume({
  step: 'process-item',
  forEachIndex: 2,
  resumeData: { result: 'processed' },
})

// Resume with streaming
const stream = run.resumeStream({
  step: 'approval-step',
  resumeData: { approved: true },
})

for await (const event of stream.fullStream) {
  console.log(event)
}

const result = await stream.result
```

### Schema Definition

```typescript
createStep({
  id: 'approval',
  suspendSchema: z.object({
    requestId: z.string(),
    timestamp: z.number(),
    metadata: z.record(z.any()).optional(),
  }),
  resumeSchema: z.object({
    approved: z.boolean(),
    approverEmail: z.string().email(),
    comments: z.string().optional(),
  }),
  execute: async ({ suspend, resumeData }) => {
    // Typed suspend and resumeData based on schemas
  },
})
```

**Sources:** [packages/core/src/workflows/step.ts:13-171](), [packages/core/src/workflows/workflow.ts:1485-1583]()
