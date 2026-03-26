# AgentSession Lifecycle & Architecture

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/coding-agent/src/core/agent-session.ts](packages/coding-agent/src/core/agent-session.ts)
- [packages/coding-agent/src/core/sdk.ts](packages/coding-agent/src/core/sdk.ts)
- [packages/coding-agent/src/modes/interactive/interactive-mode.ts](packages/coding-agent/src/modes/interactive/interactive-mode.ts)
- [packages/coding-agent/src/modes/print-mode.ts](packages/coding-agent/src/modes/print-mode.ts)
- [packages/coding-agent/src/modes/rpc/rpc-mode.ts](packages/coding-agent/src/modes/rpc/rpc-mode.ts)

</details>

## Purpose and Scope

This page documents the `AgentSession` class, which serves as the central orchestrator for the coding agent's runtime. It coordinates between the core agent loop ([pi-agent-core](#3)), session persistence ([SessionManager](#4.3)), configuration ([SettingsManager](#4.6)), and the extension system ([Extension System](#4.4)).

For information about session persistence and history management, see [Session Management & History Tree](#4.3). For tool execution details, see [Tool Execution & Built-in Tools](#4.5). For extension lifecycle and hooks, see [Extension System](#4.4).

## Overview

`AgentSession` wraps an `Agent` instance from `@mariozechner/pi-agent-core` and adds session-specific functionality:

- **Event emission**: Extends `AgentEvent` with session-specific events (`auto_compaction_start`, `auto_retry_start`, etc.)
- **State management**: Coordinates session persistence, model changes, thinking level changes
- **Tool registry**: Manages active tools, extension tools, and tool metadata
- **System prompt building**: Aggregates skills, context files, and extension modifications
- **Auto-compaction**: Monitors context usage and triggers compaction when thresholds are exceeded
- **Auto-retry**: Retries failed requests with exponential backoff
- **Extension integration**: Binds `ExtensionRunner` and emits events to extensions

The class is mode-agnostic and used by all run modes: interactive, print, and RPC.

**Sources:** [packages/coding-agent/src/core/agent-session.ts:1-82]()

## Class Structure

```mermaid
classDiagram
    class AgentSession {
        +Agent agent
        +SessionManager sessionManager
        +SettingsManager settingsManager
        +ModelRegistry modelRegistry
        +ResourceLoader resourceLoader
        -ExtensionRunner _extensionRunner
        -Map~string,AgentTool~ _toolRegistry
        -string _baseSystemPrompt
        -AgentSessionEventListener[] _eventListeners

        +prompt(text, options) Promise~void~
        +subscribe(listener) Function
        +cycleModel(direction) ModelCycleResult
        +setThinkingLevel(level) void
        +compact(signal?) Promise~CompactionResult~
        +executeBash(command, opts) Promise~BashResult~
        +getAllTools() ToolInfo[]
        +addTool(name, def) void
        +removeTool(name) void
        +buildSystemPrompt() string
        +getStats() SessionStats
        -_emit(event) void
        -_handleAgentEvent(event) void
        -_checkCompaction(msg) Promise~void~
        -_buildRuntime(opts) void
    }

    class Agent {
        <<from pi-agent-core>>
        +AgentState state
        +prompt(message) Promise~void~
        +subscribe(listener) Function
    }

    class SessionManager {
        +appendMessage(msg) void
        +appendModelChange(provider, id) void
        +buildSessionContext() SessionContext
        +compact(entries, summary) void
    }

    class SettingsManager {
        +getDefaultModel() string
        +getDefaultThinkingLevel() ThinkingLevel
        +getRetrySettings() RetrySettings
    }

    class ExtensionRunner {
        +emit(event) Promise~void~
        +getRegisteredCommands() SlashCommandInfo[]
        +getRegisteredTools() ToolDefinition[]
    }

    AgentSession --> Agent : wraps
    AgentSession --> SessionManager : persists to
    AgentSession --> SettingsManager : reads config from
    AgentSession --> ExtensionRunner : emits events to
```

**AgentSession Core Properties**

| Property            | Type                          | Purpose                                      |
| ------------------- | ----------------------------- | -------------------------------------------- |
| `agent`             | `Agent`                       | Core agent instance from pi-agent-core       |
| `sessionManager`    | `SessionManager`              | Session persistence and history tree         |
| `settingsManager`   | `SettingsManager`             | Configuration (global and project)           |
| `modelRegistry`     | `ModelRegistry`               | API key resolution and model discovery       |
| `resourceLoader`    | `ResourceLoader`              | Skills, prompts, themes, extensions          |
| `_extensionRunner`  | `ExtensionRunner?`            | Extension lifecycle and event dispatch       |
| `_toolRegistry`     | `Map<string, AgentTool>`      | Active tools available to the LLM            |
| `_baseSystemPrompt` | `string`                      | System prompt before extension modifications |
| `_eventListeners`   | `AgentSessionEventListener[]` | Subscribers to session events                |

**Sources:** [packages/coding-agent/src/core/agent-session.ts:213-276]()

## Creation and Initialization

### Factory Function: `createAgentSession()`

The recommended way to create an `AgentSession` is via the `createAgentSession()` factory function, which handles default initialization and model resolution.

```mermaid
flowchart TB
    Start["createAgentSession(options)"]
    Start --> Init["Initialize defaults<br/>(cwd, agentDir, authStorage)"]
    Init --> Settings["Create/load SettingsManager<br/>SessionManager<br/>ModelRegistry"]
    Settings --> Resources["Create ResourceLoader<br/>resourceLoader.reload()"]
    Resources --> CheckSession{"Existing<br/>session data?"}

    CheckSession -->|Yes| Restore["Restore model from<br/>session context"]
    CheckSession -->|No| FindModel["findInitialModel()<br/>(settings default or provider default)"]
    Restore --> FindModel

    FindModel --> ThinkingLevel["Determine thinking level<br/>(session > settings > DEFAULT_THINKING_LEVEL)"]
    ThinkingLevel --> Clamp["Clamp thinking level<br/>to model capabilities"]
    Clamp --> CreateAgent["new Agent(initialState,<br/>convertToLlm,<br/>getApiKey callback)"]
    CreateAgent --> RestoreMessages{"Existing<br/>messages?"}

    RestoreMessages -->|Yes| ReplayMessages["agent.replaceMessages(<br/>session.messages)"]
    RestoreMessages -->|No| InitSession["sessionManager.appendModelChange()<br/>sessionManager.appendThinkingLevelChange()"]
    ReplayMessages --> InitSession

    InitSession --> CreateSession["new AgentSession(config)"]
    CreateSession --> Return["Return {session,<br/>extensionsResult,<br/>modelFallbackMessage}"]

    style CreateAgent fill:#f9f9f9
    style CreateSession fill:#f9f9f9
```

**Key Initialization Steps:**

1. **Default resolution**: If not provided, creates `AuthStorage`, `ModelRegistry`, `SettingsManager`, `SessionManager`, and `ResourceLoader` with default paths
2. **Model restoration**: If session has existing messages, attempts to restore the previous model
3. **Model fallback**: Falls back to `findInitialModel()` which checks settings defaults, then provider defaults
4. **Thinking level**: Restores from session if available, else uses settings default or `DEFAULT_THINKING_LEVEL`
5. **Capability clamping**: Sets thinking level to `"off"` if model doesn't support reasoning
6. **Agent creation**: Creates `Agent` with initial state and `getApiKey` callback that uses `ModelRegistry`
7. **Message replay**: If continuing a session, replays messages into the agent's state
8. **AgentSession creation**: Wraps the agent with session-specific functionality

**Sources:** [packages/coding-agent/src/core/sdk.ts:165-373]()

### Constructor Configuration

The `AgentSession` constructor accepts a configuration object:

```typescript
interface AgentSessionConfig {
  agent: Agent
  sessionManager: SessionManager
  settingsManager: SettingsManager
  cwd: string
  scopedModels?: Array<{ model: Model<any>; thinkingLevel?: ThinkingLevel }>
  resourceLoader: ResourceLoader
  customTools?: ToolDefinition[]
  modelRegistry: ModelRegistry
  initialActiveToolNames?: string[]
  baseToolsOverride?: Record<string, AgentTool>
  extensionRunnerRef?: { current?: ExtensionRunner }
}
```

The constructor immediately:

1. Subscribes to agent events via `this.agent.subscribe(this._handleAgentEvent)`
2. Calls `this._buildRuntime()` to initialize tools and system prompt

**Sources:** [packages/coding-agent/src/core/agent-session.ts:132-151](), [packages/coding-agent/src/core/agent-session.ts:278-299]()

## Lifecycle Phases

```mermaid
stateDiagram-v2
    [*] --> Created: new AgentSession(config)
    Created --> RuntimeBuilt: _buildRuntime()
    RuntimeBuilt --> ExtensionsBound: initExtensions()
    ExtensionsBound --> Ready: Event subscription active

    Ready --> Prompting: prompt(message)
    Prompting --> AgentLoop: Agent processes message
    AgentLoop --> ToolExecution: LLM requests tools
    ToolExecution --> AgentLoop: Tool results
    AgentLoop --> AssistantResponse: LLM response complete
    AssistantResponse --> Persistence: SessionManager.appendMessage()

    Persistence --> CheckCompaction: agent_end event
    CheckCompaction --> AutoCompaction: Context exceeds threshold
    CheckCompaction --> Ready: Below threshold
    AutoCompaction --> Ready: Compaction complete

    AssistantResponse --> AutoRetry: stopReason: error
    AutoRetry --> Prompting: Retry with backoff
    AutoRetry --> Ready: Max retries exceeded

    Ready --> [*]: dispose()
```

**Phase Descriptions:**

| Phase               | Trigger                             | Actions                                                               |
| ------------------- | ----------------------------------- | --------------------------------------------------------------------- |
| **Created**         | `new AgentSession()`                | Agent event subscription, store config                                |
| **RuntimeBuilt**    | Constructor calls `_buildRuntime()` | Build tool registry, system prompt, wrap tools                        |
| **ExtensionsBound** | `initExtensions()` called by mode   | Load extensions, bind UI/command context, register tools              |
| **Ready**           | After binding complete              | Waiting for `prompt()` calls                                          |
| **Prompting**       | `prompt(message)` called            | Pre-process message, emit `before_agent_start`, call `agent.prompt()` |
| **AgentLoop**       | Agent streaming begins              | Emit `message_start`, `message_update`, `tool_execution_*` events     |
| **Persistence**     | `message_end` event                 | Write message to session file via `SessionManager`                    |
| **CheckCompaction** | `agent_end` event                   | Check context usage vs thresholds                                     |
| **AutoRetry**       | `stopReason: "error"`               | Exponential backoff retry for retryable errors                        |

**Sources:** [packages/coding-agent/src/core/agent-session.ts:291-299](), [packages/coding-agent/src/core/agent-session.ts:914-955](), [packages/coding-agent/src/core/agent-session.ts:320-452]()

## Event System

### Event Types

`AgentSession` extends `AgentEvent` from pi-agent-core with session-specific events:

```typescript
type AgentSessionEvent =
  | AgentEvent // Core events from pi-agent-core
  | { type: 'auto_compaction_start'; reason: 'threshold' | 'overflow' }
  | {
      type: 'auto_compaction_end'
      result?: CompactionResult
      aborted: boolean
      willRetry: boolean
      errorMessage?: string
    }
  | {
      type: 'auto_retry_start'
      attempt: number
      maxAttempts: number
      delayMs: number
      errorMessage: string
    }
  | {
      type: 'auto_retry_end'
      success: boolean
      attempt: number
      finalError?: string
    }
```

**Core Agent Events** (forwarded from `Agent`):

| Event Type              | When Emitted                 | Payload                                           |
| ----------------------- | ---------------------------- | ------------------------------------------------- |
| `agent_start`           | Agent begins processing      | `{ messages: AgentMessage[] }`                    |
| `agent_end`             | Agent completes processing   | `{ messages: AgentMessage[] }`                    |
| `message_start`         | New message begins streaming | `{ message: AgentMessage }`                       |
| `message_update`        | Message content updates      | `{ message: AgentMessage; delta: string }`        |
| `message_end`           | Message complete             | `{ message: AgentMessage }`                       |
| `tool_execution_start`  | Tool execution begins        | `{ toolCall: ToolCall; tool: AgentTool }`         |
| `tool_execution_update` | Tool emits progress update   | `{ toolCall: ToolCall; update: string }`          |
| `tool_execution_end`    | Tool execution completes     | `{ toolCall: ToolCall; result: AgentToolResult }` |
| `turn_start`            | New conversation turn begins | `{ turnIndex: number }`                           |
| `turn_end`              | Conversation turn completes  | `{ turnIndex: number }`                           |

**Sources:** [packages/coding-agent/src/core/agent-session.ts:112-126]()

### Event Flow

```mermaid
sequenceDiagram
    participant Mode as "Mode<br/>(Interactive/Print/RPC)"
    participant Session as "AgentSession"
    participant Agent as "Agent<br/>(pi-agent-core)"
    participant Extensions as "ExtensionRunner"
    participant SessionMgr as "SessionManager"

    Mode->>Session: subscribe(listener)
    Note over Session: Store listener in _eventListeners

    Mode->>Session: prompt(message)
    Session->>Extensions: emit('before_agent_start')
    Extensions-->>Session: Modified message/system prompt
    Session->>Agent: prompt(modified message)

    Agent->>Session: emit('agent_start')
    Session->>Session: _handleAgentEvent()
    Session->>Extensions: emit('agent_start')
    Session->>Mode: listener({ type: 'agent_start' })

    Agent->>Session: emit('message_start')
    Session->>Session: Queue in _agentEventQueue
    Session->>Extensions: emit('message_start')
    Session->>Mode: listener({ type: 'message_start' })

    Agent->>Session: emit('message_update')
    Session->>Extensions: emit('message_update')
    Session->>Mode: listener({ type: 'message_update' })

    Agent->>Session: emit('message_end')
    Session->>Session: Check message role
    alt User/Assistant/ToolResult
        Session->>SessionMgr: appendMessage(message)
    else Custom message
        Session->>SessionMgr: appendCustomMessageEntry()
    end
    Session->>Extensions: emit('message_end')
    Session->>Mode: listener({ type: 'message_end' })

    Agent->>Session: emit('agent_end')
    Session->>Session: _checkCompaction(lastAssistant)
    alt Context overflow
        Session->>Mode: listener({ type: 'auto_compaction_start' })
        Session->>Session: _runAutoCompaction()
        Session->>Mode: listener({ type: 'auto_compaction_end' })
    end
    Session->>Extensions: emit('agent_end')
    Session->>Mode: listener({ type: 'agent_end' })
```

**Event Processing Details:**

1. **Serialized queue**: All agent events are processed through `_agentEventQueue` to ensure sequential handling and avoid race conditions
2. **Extension priority**: Extensions receive events before mode listeners
3. **Automatic persistence**: `message_end` events trigger automatic session persistence via `SessionManager`
4. **Queue tracking**: User message starts remove corresponding messages from `_steeringMessages` or `_followUpMessages` queues before emission
5. **Auto-compaction trigger**: `agent_end` events check last assistant message usage and trigger compaction if needed

**Sources:** [packages/coding-agent/src/core/agent-session.ts:320-452](), [packages/coding-agent/src/core/agent-session.ts:310-336]()

## Component Orchestration

```mermaid
graph TB
    subgraph "AgentSession Orchestration Layer"
        Session["AgentSession"]
    end

    subgraph "Core Agent Runtime"
        Agent["Agent<br/>(pi-agent-core)"]
        AgentState["AgentState<br/>{messages, model,<br/>thinkingLevel, tools}"]
        Agent --> AgentState
    end

    subgraph "Persistence Layer"
        SessionMgr["SessionManager"]
        SessionFile["context.jsonl<br/>(session file)"]
        SessionMgr --> SessionFile
    end

    subgraph "Configuration Layer"
        SettingsMgr["SettingsManager"]
        GlobalSettings["~/.pi/agent/settings.json"]
        ProjectSettings[".pi/settings.json"]
        SettingsMgr --> GlobalSettings
        SettingsMgr --> ProjectSettings
    end

    subgraph "Resource Layer"
        ResourceLoader["ResourceLoader"]
        Skills["Skills<br/>(SKILL.md files)"]
        Prompts["Prompt Templates"]
        Extensions["Extensions"]
        ContextFiles["Context Files<br/>(CONTEXT.md)"]
        ResourceLoader --> Skills
        ResourceLoader --> Prompts
        ResourceLoader --> Extensions
        ResourceLoader --> ContextFiles
    end

    subgraph "Extension Layer"
        ExtRunner["ExtensionRunner"]
        ExtTools["Extension Tools"]
        ExtCommands["Extension Commands"]
        ExtHooks["Extension Hooks"]
        ExtRunner --> ExtTools
        ExtRunner --> ExtCommands
        ExtRunner --> ExtHooks
    end

    subgraph "Model Layer"
        ModelReg["ModelRegistry"]
        AuthStorage["AuthStorage"]
        ModelsJson["models.json<br/>(custom models)"]
        ModelReg --> AuthStorage
        ModelReg --> ModelsJson
    end

    Session --> Agent
    Session --> SessionMgr
    Session --> SettingsMgr
    Session --> ResourceLoader
    Session --> ExtRunner
    Session --> ModelReg

    Session -.reads model/thinking level.-> SettingsMgr
    Session -.loads skills/prompts.-> ResourceLoader
    Session -.emits events to.-> ExtRunner
    Session -.persists messages to.-> SessionMgr
    Session -.resolves API keys via.-> ModelReg
    Session -.builds system prompt from.-> Skills
    Session -.builds system prompt from.-> ContextFiles
    Session -.wraps tools from.-> ExtRunner
    Agent -.streams to.-> Session
```

**Orchestration Responsibilities:**

| Component           | AgentSession's Role                                                          |
| ------------------- | ---------------------------------------------------------------------------- |
| **Agent**           | Wraps instance, subscribes to events, delegates prompt calls                 |
| **SessionManager**  | Persists messages, model changes, thinking level changes, compaction entries |
| **SettingsManager** | Reads defaults, retry settings, tool toggles, compaction thresholds          |
| **ResourceLoader**  | Loads skills, prompts, extensions, context files for system prompt           |
| **ExtensionRunner** | Binds after initialization, emits events, collects registered tools/commands |
| **ModelRegistry**   | Resolves API keys dynamically via `getApiKey` callback to Agent              |

**Sources:** [packages/coding-agent/src/core/agent-session.ts:213-276](), [packages/coding-agent/src/core/agent-session.ts:1092-1202]()

## Runtime Building

### Tool Registry Management

The tool registry is built in `_buildRuntime()` and can be modified at runtime:

```mermaid
flowchart LR
    Base["Base Tools<br/>(read, bash, edit, write)"]
    Custom["SDK Custom Tools<br/>(customTools option)"]
    ExtReg["Extension Registered Tools<br/>(registerTool())"]

    Base --> Wrap["wrapRegisteredTools()"]
    Custom --> Wrap
    ExtReg --> Wrap

    Wrap --> Filter["Filter by activeToolNames"]
    Filter --> ExtWrap["wrapToolsWithExtensions()<br/>(apply tool hooks)"]
    ExtWrap --> Registry["_toolRegistry<br/>Map&lt;string, AgentTool&gt;"]
    Registry --> AgentState["agent.state.tools"]

    ExtReg -.runtime.-> Refresh["refreshTools()<br/>(dynamic tool registration)"]
    Refresh --> Filter
```

**Tool Registration Flow:**

1. **Initial tools** (constructor): Loads base tools from `createAllTools()`, SDK custom tools, and extension tools
2. **Wrapping**: `wrapRegisteredTools()` adds metadata (name, description, parameters, `promptSnippet`, `promptGuidelines`)
3. **Filtering**: Only tools in `activeToolNames` are included
4. **Extension wrapping**: `wrapToolsWithExtensions()` applies `tool_execution_start`/`end` hooks
5. **Registry update**: Updates `_toolRegistry` and `agent.state.tools`

**Dynamic Tool Methods:**

- `addTool(name, definition)`: Activates a previously registered tool or adds a new one
- `removeTool(name)`: Deactivates a tool (removes from active list)
- `getAllTools()`: Returns `ToolInfo[]` with name, description, parameters for all active tools
- `refreshTools()`: Called by extensions to apply runtime tool registrations

**Sources:** [packages/coding-agent/src/core/agent-session.ts:1092-1202](), [packages/coding-agent/src/core/agent-session.ts:1204-1257]()

### System Prompt Building

System prompt is built from multiple sources and cached as `_baseSystemPrompt`:

```mermaid
flowchart TB
    Start["buildSystemPrompt()"]
    Start --> Skills["Load skills from ResourceLoader"]
    Start --> Context["Load context files from ResourceLoader"]
    Start --> Base["Load base system prompt<br/>(skills-based or docs/base-system-prompt.md)"]

    Skills --> SkillsBlock["Build Available Skills section<br/>(name, description, file path)"]
    Context --> ContextBlock["Build Context Files section<br/>(file paths)"]
    Base --> BasePrompt["Base instructions"]

    SkillsBlock --> Concat["Concatenate all sections"]
    ContextBlock --> Concat
    BasePrompt --> Concat

    Concat --> Cache["Cache as _baseSystemPrompt"]
    Cache --> ExtAppends["Apply extension appends<br/>(promptSnippet, promptGuidelines)"]
    ExtAppends --> Final["Return final system prompt"]
```

**System Prompt Sections:**

1. **Base system prompt**: From `docs/base-system-prompt.md` or skills-based if enabled
2. **Available Skills**: Lists all discovered skills with name, description, and file path
3. **Context Files**: Lists paths to `CONTEXT.md`, `README.md`, etc. for current directory
4. **Extension Tool Snippets**: `promptSnippet` from active tools (one-line descriptions)
5. **Extension Guidelines**: `promptGuidelines` from active tools (bullet points appended to Guidelines section)

**Extension modifications** are applied on every turn by prepending tool snippets to "Available tools" and appending guidelines to "Guidelines".

**Sources:** [packages/coding-agent/src/core/agent-session.ts:1259-1355]()

## Message Flow

```mermaid
sequenceDiagram
    participant Caller
    participant Session as "AgentSession"
    participant Ext as "ExtensionRunner"
    participant Agent as "Agent"
    participant LLM as "LLM Provider"
    participant SessionMgr as "SessionManager"

    Caller->>Session: prompt(text, options)
    Note over Session: expandPromptTemplates<br/>if enabled
    Session->>Session: buildSystemPrompt()
    Session->>Ext: emit('before_agent_start')
    Note over Ext: Extensions can modify<br/>message, systemPrompt,<br/>attachments
    Ext-->>Session: { message?, systemPrompt?, images? }
    Session->>Agent: prompt(final message)

    loop Agent Loop
        Agent->>Agent: Build LLM messages<br/>via convertToLlm()
        Agent->>LLM: Stream request
        LLM-->>Agent: Stream response
        Agent->>Session: emit('message_update')<br/>{ delta: ... }
        Session->>Caller: Forward event

        alt Tool Call
            Agent->>Session: emit('tool_execution_start')
            Session->>Ext: emit('tool_execution_start')<br/>(can block via {block: true})
            alt Not blocked
                Agent->>Agent: Execute tool
                Agent->>Session: emit('tool_execution_end')
                Session->>Ext: emit('tool_execution_end')<br/>(can modify result)
            end
        end
    end

    Agent->>Session: emit('message_end')
    Session->>SessionMgr: appendMessage(message)
    SessionMgr->>SessionMgr: Write to context.jsonl

    Agent->>Session: emit('agent_end')
    Session->>Session: _checkCompaction()
    alt Context overflow
        Session->>Session: _runAutoCompaction()
    end
```

**Prompt Processing Steps:**

1. **Template expansion**: If `expandPromptTemplates` is enabled, replaces prompt template syntax with content from loaded templates
2. **System prompt building**: Calls `buildSystemPrompt()` to aggregate skills, context files, and extension modifications
3. **Extension preprocessing**: Emits `before_agent_start` to allow extensions to modify message, system prompt, or add attachments
4. **Agent delegation**: Calls `agent.prompt()` with final message and updated state
5. **Event forwarding**: Subscribes to agent events and forwards to session listeners
6. **Persistence**: On `message_end`, writes message to session file via `SessionManager`
7. **Post-processing**: On `agent_end`, checks for auto-compaction triggers

**Sources:** [packages/coding-agent/src/core/agent-session.ts:957-1090]()

## Auto-Compaction

Auto-compaction is triggered after an assistant message completes if context usage exceeds configured thresholds.

```mermaid
flowchart TD
    AgentEnd["agent_end event"]
    AgentEnd --> CheckLast{"Last message<br/>was assistant?"}
    CheckLast -->|No| Skip["Skip compaction check"]
    CheckLast -->|Yes| CheckUsage["Calculate context usage<br/>from lastAssistantMessage"]

    CheckUsage --> CheckEnabled{"autoCompactionEnabled<br/>in settings?"}
    CheckEnabled -->|No| Skip
    CheckEnabled -->|Yes| CheckThreshold{"Usage > threshold<br/>OR context overflow?"}

    CheckThreshold -->|No| Skip
    CheckThreshold -->|Yes| EmitStart["Emit auto_compaction_start<br/>{reason: 'threshold' | 'overflow'}"]

    EmitStart --> CreateAbort["Create _autoCompactionAbortController"]
    CreateAbort --> RunCompaction["_runAutoCompaction()"]

    RunCompaction --> PrepareEntries["prepareCompaction()<br/>(select messages to summarize)"]
    PrepareEntries --> CallLLM["compact()<br/>(call LLM with summarization prompt)"]
    CallLLM --> WriteEntry["SessionManager.compact()<br/>(write compaction entry, rebuild session)"]

    WriteEntry --> CheckQueuedMsgs{"Queued steering/<br/>follow-up messages?"}
    CheckQueuedMsgs -->|Yes| ResumeAgent["agent.continue()"]
    CheckQueuedMsgs -->|No| EmitEnd["Emit auto_compaction_end<br/>{result, aborted: false}"]

    ResumeAgent --> EmitEnd

    CallLLM -->|Error: Overflow| MarkOverflow["Set _overflowRecoveryAttempted = true"]
    MarkOverflow --> EmitEndRetry["Emit auto_compaction_end<br/>{aborted: false, willRetry: true}"]
    EmitEndRetry --> RetryPrompt["agent.prompt(original message)"]

    CallLLM -->|Other Error| EmitEndError["Emit auto_compaction_end<br/>{aborted: false, willRetry: false, errorMessage}"]

    style RunCompaction fill:#f9f9f9
    style WriteEntry fill:#f9f9f9
```

**Threshold Calculation:**

Auto-compaction triggers when:

- `(usageTokens / maxContextTokens) >= autoCompactThreshold` (default 0.80)
- OR context overflow error from LLM provider

**Compaction Process:**

1. **Entry selection**: `prepareCompaction()` selects messages between the last compaction entry and current position
2. **Summarization**: `compact()` calls the LLM with a special summarization prompt
3. **Session rebuild**: `SessionManager.compact()` writes a compaction entry and rebuilds the session from the tree
4. **Resume**: If messages were queued during compaction, calls `agent.continue()` to resume processing

**Overflow Recovery:**

If compaction itself fails with an overflow error, sets `_overflowRecoveryAttempted` flag and retries the original prompt. This prevents infinite compaction loops.

**Sources:** [packages/coding-agent/src/core/agent-session.ts:1357-1497](), [packages/coding-agent/src/core/compaction/index.ts]()

## Auto-Retry

Auto-retry handles transient errors (rate limits, server overload) with exponential backoff.

```mermaid
stateDiagram-v2
    [*] --> CheckRetryable: agent_end with error
    CheckRetryable --> IsRetryable: stopReason: "error" AND<br/>errorMessage matches patterns
    IsRetryable --> CheckAttempts: Is retryable error
    CheckRetryable --> [*]: Not retryable

    CheckAttempts --> StartRetry: attempt < maxAttempts
    CheckAttempts --> [*]: Max attempts exceeded

    StartRetry --> EmitRetryStart: Emit auto_retry_start<br/>{attempt, delayMs}
    EmitRetryStart --> Sleep: await sleep(delayMs)
    Sleep --> RemoveError: Remove error assistant message
    RemoveError --> Retry: agent.prompt(original message)
    Retry --> [*]: Retry in progress
```

**Retryable Error Patterns:**

- `"overloaded"`, `"529"` (server overloaded)
- `"rate_limit_error"`, `"429"` (rate limit)
- `"500"`, `"502"`, `"503"`, `"504"` (server errors)
- `"ECONNRESET"`, `"ETIMEDOUT"` (network errors)

**Retry Configuration** (from `SettingsManager.getRetrySettings()`):

| Setting             | Default | Purpose                            |
| ------------------- | ------- | ---------------------------------- |
| `enabled`           | `true`  | Enable/disable auto-retry          |
| `maxAttempts`       | `3`     | Maximum retry attempts             |
| `initialDelayMs`    | `1000`  | Base delay for exponential backoff |
| `maxDelayMs`        | `60000` | Cap on retry delay                 |
| `backoffMultiplier` | `2`     | Multiplier for each retry          |

**Retry Flow:**

1. **Error detection**: `agent_end` event checks if last assistant message has `stopReason: "error"` and matches retry patterns
2. **Retry promise**: Creates `_retryPromise` that resolves when retry completes (for `waitForRetry()`)
3. **Backoff calculation**: `delayMs = min(initialDelayMs * (backoffMultiplier ** attempt), maxDelayMs)`
4. **Cleanup**: Removes error assistant message from agent state
5. **Retry**: Calls `agent.prompt()` with original message
6. **Success tracking**: On successful assistant response, emits `auto_retry_end` and resets counter

**Sources:** [packages/coding-agent/src/core/agent-session.ts:1499-1606]()

## Extension Integration

Extensions integrate via `ExtensionRunner`, which is bound after AgentSession creation:

```mermaid
sequenceDiagram
    participant Mode
    participant Session as "AgentSession"
    participant Runner as "ExtensionRunner"
    participant Extension as "Extension"

    Mode->>Session: new AgentSession(config)
    Note over Session: extensionRunnerRef stored

    Mode->>Session: initExtensions(loader, bindings)
    Session->>Runner: new ExtensionRunner(extensions)
    Note over Runner: Load extension files,<br/>call factory functions

    Session->>Runner: bindCore(actions, contextActions)
    Note over Runner: Populate runtime with<br/>session methods

    Session->>Session: extensionRunnerRef.current = runner
    Session->>Session: refreshTools()<br/>(register extension tools)
    Session->>Runner: emit('session_start')
    Runner->>Extension: session_start handler

    Mode->>Session: prompt(message)
    Session->>Runner: emit('before_agent_start')
    Runner->>Extension: Handler returns<br/>{message?, systemPrompt?}
    Extension-->>Runner: Modified values
    Runner-->>Session: Merged result

    Session->>Agent: prompt(modified message)
    Note over Agent: LLM requests tool
    Session->>Runner: emit('tool_execution_start')
    Runner->>Extension: Handler returns<br/>{block?: true}
    alt Not blocked
        Session->>Tool: Execute tool
        Session->>Runner: emit('tool_execution_end')
        Runner->>Extension: Handler returns<br/>{content?: [...]}
        Extension-->>Runner: Modified result
    end
```

**Extension Binding Flow:**

1. **ExtensionRunner creation**: Mode calls `initExtensions()` with loaded extension paths
2. **Core binding**: Calls `bindCore()` with session methods (sendMessage, newSession, etc.)
3. **Tool registration**: Calls `refreshTools()` to register extension tools in the tool registry
4. **Session start**: Emits `session_start` event to notify extensions
5. **Runtime interaction**: Extensions receive events on every message, tool execution, etc.

**Extension Runtime Access:**

Extensions access session functionality via the `ExtensionAPI` passed to their factory function:

```typescript
pi.sendMessage(text) // Queue a custom message for next turn
pi.sendUserMessage(text) // Send user message immediately
pi.newSession() // Create a new session
pi.getAllTools() // Get active tool list
pi.registerTool(definition) // Register a custom tool
pi.registerCommand(definition) // Register a slash command
```

**Sources:** [packages/coding-agent/src/core/agent-session.ts:860-912](), [packages/coding-agent/src/core/extensions/extension-runner.ts]()
