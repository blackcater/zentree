# Tool System Architecture

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [src/agent/codex/core/ErrorService.ts](src/agent/codex/core/ErrorService.ts)
- [src/agent/codex/handlers/CodexEventHandler.ts](src/agent/codex/handlers/CodexEventHandler.ts)
- [src/agent/codex/handlers/CodexFileOperationHandler.ts](src/agent/codex/handlers/CodexFileOperationHandler.ts)
- [src/agent/codex/handlers/CodexSessionManager.ts](src/agent/codex/handlers/CodexSessionManager.ts)
- [src/agent/codex/handlers/CodexToolHandlers.ts](src/agent/codex/handlers/CodexToolHandlers.ts)
- [src/agent/codex/messaging/CodexMessageProcessor.ts](src/agent/codex/messaging/CodexMessageProcessor.ts)
- [src/agent/gemini/cli/atCommandProcessor.ts](src/agent/gemini/cli/atCommandProcessor.ts)
- [src/agent/gemini/cli/config.ts](src/agent/gemini/cli/config.ts)
- [src/agent/gemini/cli/errorParsing.ts](src/agent/gemini/cli/errorParsing.ts)
- [src/agent/gemini/cli/tools/web-fetch.ts](src/agent/gemini/cli/tools/web-fetch.ts)
- [src/agent/gemini/cli/tools/web-search.ts](src/agent/gemini/cli/tools/web-search.ts)
- [src/agent/gemini/cli/types.ts](src/agent/gemini/cli/types.ts)
- [src/agent/gemini/cli/useReactToolScheduler.ts](src/agent/gemini/cli/useReactToolScheduler.ts)
- [src/agent/gemini/index.ts](src/agent/gemini/index.ts)
- [src/agent/gemini/utils.ts](src/agent/gemini/utils.ts)
- [src/common/codex/types/eventData.ts](src/common/codex/types/eventData.ts)
- [src/common/codex/types/eventTypes.ts](src/common/codex/types/eventTypes.ts)
- [src/process/services/mcpServices/McpOAuthService.ts](src/process/services/mcpServices/McpOAuthService.ts)

</details>

## Purpose and Scope

This document describes the **tool execution framework** in AionUi, which enables AI agents to perform actions beyond text generation. The system provides a unified architecture for tool registration, execution, approval workflows, and result handling across multiple agent types (Gemini, ACP, Codex).

For information about individual agent implementations, see [AI Agent Systems](#4). For MCP server management, see [MCP Integration](#4.5). For permission/approval workflows, see [Permission & Confirmation System](#10.4).

---

## System Overview

The tool system consists of three main layers:

1. **Tool Definition Layer**: Declarative tool classes that define capabilities, parameters, and validation
2. **Execution Layer**: Schedulers and invocation handlers that manage tool lifecycle
3. **Integration Layer**: Protocol adapters that bridge AI model responses to tool invocations

```mermaid
graph TB
    subgraph "AI Models"
        Gemini["Gemini API"]
        Claude["Claude ACP"]
        OpenAI["OpenAI"]
    end

    subgraph "Tool Definition Layer"
        ImageGenTool["ImageGenerationTool"]
        WebSearchTool["WebSearchTool"]
        WebFetchTool["WebFetchTool"]
        MCPTools["MCP Server Tools"]
        CoreTools["aioncli-core Built-in Tools"]
    end

    subgraph "Execution Layer"
        CoreToolScheduler["CoreToolScheduler"]
        ToolInvocation["BaseToolInvocation"]
        ToolRegistry["ToolRegistry"]
    end

    subgraph "Integration Layer"
        GeminiAdapter["processGeminiFunctionCalls"]
        AcpAdapter["AcpAdapter toolCallUpdate"]
        ConvToolConfig["ConversationToolConfig"]
    end

    subgraph "Approval System"
        ApprovalStore["GeminiApprovalStore / AcpApprovalStore"]
        PermissionDialog["Permission Dialog UI"]
    end

    Gemini --> GeminiAdapter
    Claude --> AcpAdapter
    OpenAI --> GeminiAdapter

    GeminiAdapter --> CoreToolScheduler
    AcpAdapter --> PermissionDialog

    ConvToolConfig --> ImageGenTool
    ConvToolConfig --> WebSearchTool
    ConvToolConfig --> WebFetchTool

    CoreToolScheduler --> ToolRegistry
    ToolRegistry --> ImageGenTool
    ToolRegistry --> WebSearchTool
    ToolRegistry --> CoreTools
    ToolRegistry --> MCPTools

    CoreToolScheduler --> ToolInvocation
    ToolInvocation --> ApprovalStore

    ToolInvocation --> PermissionDialog
```

**Tool Execution Flow**:

1. AI model generates function call requests
2. Adapter layer converts model-specific format to unified tool invocation
3. Scheduler validates parameters and checks approval requirements
4. Tool invocation executes with progress tracking
5. Results are formatted and returned to the model

Sources: [src/agent/gemini/index.ts:1-865](), [src/agent/gemini/utils.ts:1-450](), [src/agent/gemini/cli/tools/conversation-tool-config.ts:1-181]()

---

## Tool Registration Architecture

### ConversationToolConfig: Conversation-Level Tool Management

`ConversationToolConfig` manages tool configuration for each conversation, determining which tools are available based on authentication type and user preferences.

```mermaid
graph TB
    ConvCreation["Conversation Creation"]
    ConvToolConfig["ConversationToolConfig"]

    ConvCreation --> ConvToolConfig

    ConvToolConfig --> InitForConv["initializeForConversation(authType)"]
    InitForConv --> DecideTools["Decide Tool Enablement"]

    DecideTools --> WebFetchCheck{{"Enable aionui_web_fetch?"}}
    WebFetchCheck -->|"All Auth Types"| EnableWebFetch["useAionuiWebFetch = true<br/>excludeTools.push('web_fetch')"]

    DecideTools --> WebSearchCheck{{"webSearchEngine === 'google'?"}}
    WebSearchCheck -->|"Yes + OAuth"| EnableGeminiSearch["useGeminiWebSearch = true<br/>excludeTools.push('google_web_search')"]
    WebSearchCheck -->|"No or non-OAuth"| SkipGeminiSearch["useGeminiWebSearch = false"]

    DecideTools --> ImageGenCheck{{"imageGenerationModel exists?"}}
    ImageGenCheck -->|"Yes"| EnableImageGen["Register ImageGenerationTool"]

    ConvToolConfig --> RegisterTools["registerCustomTools(config, geminiClient)"]
    RegisterTools --> ToolRegistry["ToolRegistry.registerTool()"]

    ToolRegistry --> SyncToClient["geminiClient.setTools()"]
```

**Key Design Decisions**:

- **Conversation-scoped**: Tool configuration is fixed when conversation is created
- **Auth-aware**: Google OAuth-only tools (like `gemini_web_search`) are only enabled for `LOGIN_WITH_GOOGLE` auth
- **Excludes conflicts**: Built-in tools are excluded when custom replacements are registered

Sources: [src/agent/gemini/cli/tools/conversation-tool-config.ts:1-181]()

### Tool Registry and Discovery

```mermaid
graph LR
    subgraph "Tool Sources"
        BuiltinTools["aioncli-core Built-in Tools<br/>(ReadFileTool, WriteFileTool, etc.)"]
        CustomTools["Custom Tools<br/>(ImageGenerationTool, WebSearchTool)"]
        MCPServers["MCP Server Tools<br/>(Loaded from mcp.json)"]
        SkillsDir["Skills from Directory<br/>(loadSkillsFromDir)"]
    end

    subgraph "Registration Flow"
        Config["Config.initialize()"]
        ToolRegistry["ToolRegistry"]
        FilterExcluded["Filter excludeTools"]

        Config --> ToolRegistry
        BuiltinTools --> ToolRegistry
        CustomTools --> ToolRegistry
        MCPServers --> ToolRegistry
        SkillsDir --> Config

        ToolRegistry --> FilterExcluded
        FilterExcluded --> FinalTools["Available Tools"]
    end
```

**Exclusion Mechanism**: Tools in `excludeTools` array are filtered out after registration, allowing custom replacements to override built-ins [src/agent/gemini/cli/tools/conversation-tool-config.ts:48]().

Sources: [src/agent/gemini/cli/config.ts:1-250](), [src/agent/gemini/cli/tools/conversation-tool-config.ts:130-179]()

---

## Tool Execution Lifecycle

### CoreToolScheduler: Central Execution Coordinator

`CoreToolScheduler` from `aioncli-core` manages the complete tool execution lifecycle with approval workflows, parallel execution support, and protection against premature cancellation.

```mermaid
sequenceDiagram
    participant Model as AI Model
    participant Stream as handleMessage
    participant Guard as globalToolCallGuard
    participant Scheduler as CoreToolScheduler
    participant Invocation as ToolInvocation
    participant ApprovalUI as Permission Dialog

    Model->>Stream: tool_call_request events
    Stream->>Guard: protect(callId)
    Stream->>Scheduler: schedule(toolRequests, signal)

    loop For each tool request
        Scheduler->>Invocation: Create invocation
        Invocation->>Invocation: validateToolParams()
        Invocation->>Invocation: shouldConfirmExecute()

        alt Requires Approval
            alt Not cached or denied
                Invocation->>ApprovalUI: Show permission dialog
                ApprovalUI->>Invocation: User decision
            end

            alt Approval granted
                Invocation->>Invocation: execute(signal, updateOutput)
                Invocation->>Guard: complete(callId)
            else Approval denied
                Invocation->>Scheduler: Return cancelled status
                Invocation->>Guard: complete(callId)
            end
        else No approval needed
            Invocation->>Invocation: execute(signal, updateOutput)
            Invocation->>Guard: complete(callId)
        end

        Invocation->>Scheduler: Return CompletedToolCall
    end

    Scheduler->>Stream: onAllToolCallsComplete(completedCalls)
    Stream->>Stream: handleCompletedTools()
    Stream->>Model: submitQuery(response, isContinuation: true)
```

**Scheduler Configuration** [src/agent/gemini/index.ts:398-469]():

- `onAllToolCallsComplete`: Callback when all tools finish, filters for Gemini-initiated tools and submits their responses back to the model via `handleCompletedTools()` [src/agent/gemini/utils.ts:409-501]()
- `onToolCallsUpdate`: UI update callback that transforms core tool calls into display format and emits `tool_group` events [src/agent/gemini/index.ts:438-461]()
- `config`: Provides access to file system, workspace, authentication, and tool registry
- `getPreferredEditor`: Returns editor preference for tools that support code editing

**Protection Mechanism** [src/agent/gemini/cli/streamResilience.ts:1-150]():

- `globalToolCallGuard.protect(callId)`: Marks tool as protected immediately upon request to prevent misidentification as cancelled during stream interruptions
- `globalToolCallGuard.complete(callId)`: Removes protection when tool reaches terminal state (success/error)
- `globalToolCallGuard.isProtected(callId)`: Checked in `handleCompletedTools()` to avoid treating protected tools as cancelled [src/agent/gemini/utils.ts:449-455]()

Sources: [src/agent/gemini/index.ts:398-469](), [src/agent/gemini/utils.ts:409-501](), [src/agent/gemini/cli/streamResilience.ts:1-150]()
</thinking>

<old_str>

## Tool Execution Lifecycle

### CoreToolScheduler: Central Execution Coordinator

`CoreToolScheduler` from `aioncli-core` manages the complete tool execution lifecycle with approval workflows and parallel execution support.

```mermaid
sequenceDiagram
    participant Model as AI Model
    participant Adapter as processGeminiFunctionCalls
    participant Scheduler as CoreToolScheduler
    participant Invocation as ToolInvocation
    participant ApprovalUI as Permission Dialog
    participant ApprovalStore as ApprovalStore

    Model->>Adapter: Function call requests
    Adapter->>Adapter: normalizeToolParams()
    Adapter->>Scheduler: schedule(toolRequests, signal)

    loop For each tool request
        Scheduler->>Invocation: Create invocation
        Invocation->>Invocation: validateToolParams()
        Invocation->>Invocation: shouldConfirmExecute()

        alt Requires Approval
            Invocation->>ApprovalStore: Check cached approval
            alt Not cached or denied
                Invocation->>ApprovalUI: Show permission dialog
                ApprovalUI->>Invocation: User decision
            end

            alt Approval granted
                Invocation->>Invocation: execute(signal, updateOutput)
            else Approval denied
                Invocation->>Scheduler: Return cancelled status
            end
        else No approval needed
            Invocation->>Invocation: execute(signal, updateOutput)
        end

        Invocation->>Scheduler: Return ToolResult
    end

    Scheduler->>Adapter: onAllToolCallsComplete(completedCalls)
    Adapter->>Model: Submit tool responses
```

**Scheduler Configuration** [src/agent/gemini/index.ts:395-467]():

- `onAllToolCallsComplete`: Callback when all tools finish, triggers continuation with results
- `onToolCallsUpdate`: UI update callback with tool execution progress
- `config`: Access to file system, workspace, and authentication

Sources: [src/agent/gemini/index.ts:395-467](), [src/agent/gemini/utils.ts:332-450]()
</str>

<new_str>

## Tool Execution Lifecycle

### CoreToolScheduler: Central Execution Coordinator

`CoreToolScheduler` from `aioncli-core` manages the complete tool execution lifecycle with approval workflows, parallel execution support, and protection against premature cancellation.

```mermaid
sequenceDiagram
    participant Model as AI Model
    participant Stream as handleMessage
    participant Guard as globalToolCallGuard
    participant Scheduler as CoreToolScheduler
    participant Invocation as ToolInvocation
    participant ApprovalUI as Permission Dialog

    Model->>Stream: tool_call_request events
    Stream->>Guard: protect(callId)
    Stream->>Scheduler: schedule(toolRequests, signal)

    loop For each tool request
        Scheduler->>Invocation: Create invocation
        Invocation->>Invocation: validateToolParams()
        Invocation->>Invocation: shouldConfirmExecute()

        alt Requires Approval
            alt Not cached or denied
                Invocation->>ApprovalUI: Show permission dialog
                ApprovalUI->>Invocation: User decision
            end

            alt Approval granted
                Invocation->>Invocation: execute(signal, updateOutput)
                Invocation->>Guard: complete(callId)
            else Approval denied
                Invocation->>Scheduler: Return cancelled status
                Invocation->>Guard: complete(callId)
            end
        else No approval needed
            Invocation->>Invocation: execute(signal, updateOutput)
            Invocation->>Guard: complete(callId)
        end

        Invocation->>Scheduler: Return CompletedToolCall
    end

    Scheduler->>Stream: onAllToolCallsComplete(completedCalls)
    Stream->>Stream: handleCompletedTools()
    Stream->>Model: submitQuery(response, isContinuation: true)
```

**Scheduler Configuration** [src/agent/gemini/index.ts:398-469]():

- `onAllToolCallsComplete`: Callback when all tools finish, filters for Gemini-initiated tools and submits their responses back to the model via `handleCompletedTools()` [src/agent/gemini/utils.ts:409-501]()
- `onToolCallsUpdate`: UI update callback that transforms core tool calls into display format and emits `tool_group` events [src/agent/gemini/index.ts:438-461]()
- `config`: Provides access to file system, workspace, authentication, and tool registry
- `getPreferredEditor`: Returns editor preference for tools that support code editing

**Protection Mechanism** [src/agent/gemini/cli/streamResilience.ts:1-150]():

- `globalToolCallGuard.protect(callId)`: Marks tool as protected immediately upon request to prevent misidentification as cancelled during stream interruptions [src/agent/gemini/index.ts:517]()
- `globalToolCallGuard.complete(callId)`: Removes protection when tool reaches terminal state (success/error) [src/agent/gemini/utils.ts:417]()
- `globalToolCallGuard.isProtected(callId)`: Checked in `handleCompletedTools()` to avoid treating protected tools as cancelled [src/agent/gemini/utils.ts:449-455]()

Sources: [src/agent/gemini/index.ts:398-469](), [src/agent/gemini/utils.ts:409-501](), [src/agent/gemini/cli/streamResilience.ts:1-150]()

### Tool Parameter Normalization

Different AI models may use inconsistent parameter names. The `normalizeToolParams` function standardizes them before execution.

```mermaid
graph TB
    RawParams["Raw Tool Parameters<br/>from AI Model"]

    RawParams --> StripAt["Strip leading '@' from file paths"]
    StripAt --> MapFileTools["Map 'path' → 'file_path'<br/>(ReadFileTool, WriteFileTool, EditTool)"]
    MapFileTools --> MapDirTools["Map various keys → 'dir_path'<br/>(list_directory, glob, search_file_content)"]
    MapDirTools --> DefaultDirPath["Default dir_path to '.' if missing<br/>(list_directory)"]
    DefaultDirPath --> NormalizedParams["Normalized Parameters"]
```

**Examples** [src/agent/gemini/utils.ts:288-331]():

- `@file.txt` → `file.txt`
- `{ path: "foo.txt" }` → `{ file_path: "foo.txt" }` for file tools
- `{ directory: "/usr" }` → `{ dir_path: "/usr" }` for directory tools

Sources: [src/agent/gemini/utils.ts:288-331]()

---

## Built-in Tools

### ImageGenerationTool: AI Image Generation and Analysis

`ImageGenerationTool` provides image generation, editing, and analysis capabilities using configurable image generation models (OpenAI, Gemini, etc.).

```mermaid
graph TB
    subgraph "ImageGenerationTool Architecture"
        ToolDef["ImageGenerationTool<br/>(BaseDeclarativeTool)"]
        Invocation["ImageGenerationInvocation<br/>(BaseToolInvocation)"]
        RotatingClient["RotatingClient<br/>(Multi-key API client)"]
    end

    subgraph "Input Processing"
        PromptInput["prompt: string<br/>(English text prompt)"]
        ImageUris["image_uris?: string[]<br/>(Local paths or HTTP URLs)"]

        PromptInput --> ValidatePrompt["validateToolParams()"]
        ImageUris --> ProcessUris["processImageUri()"]

        ProcessUris --> CheckHttp{{"isHttpUrl?"}}
        CheckHttp -->|Yes| DirectUrl["Use URL directly"]
        CheckHttp -->|No| ReadLocal["fileToBase64()<br/>Convert to data URL"]
    end

    subgraph "Execution Flow"
        Execute["execute(signal, updateOutput)"]
        BuildMessage["Build OpenAI chat completion message"]
        CallAPI["RotatingClient.chat.completions.create()"]
        ParseResponse["Parse response for images or text"]
        SaveImage["saveGeneratedImage()<br/>Save to workspace"]
        ReturnResult["Return ToolResult with<br/>image path and description"]
    end

    ToolDef --> Invocation
    Invocation --> Execute
    Execute --> BuildMessage
    BuildMessage --> CallAPI
    RotatingClient --> CallAPI
    CallAPI --> ParseResponse
    ParseResponse --> SaveImage
    SaveImage --> ReturnResult
```

**Key Features** [src/agent/gemini/cli/tools/img-gen.ts:1-600]():

- **Multi-mode**: Generation, editing, analysis based on prompt prefix
- **Multi-key rotation**: Uses `RotatingClient` for API key fallback
- **Flexible input**: Supports local files, HTTP URLs, and @-references
- **Workspace integration**: Saves generated images with timestamp naming

**Parameter Validation** [src/agent/gemini/cli/tools/img-gen.ts:197-253]():

- Validates `prompt` is non-empty
- Checks `image_uris` files exist and have valid image extensions
- Supports JSON string format from model for array parameters

Sources: [src/agent/gemini/cli/tools/img-gen.ts:1-600]()

### WebSearchTool: Google Search Integration

`WebSearchTool` provides Google search capabilities for Gemini agents with OAuth authentication.

```mermaid
graph TB
    subgraph "WebSearchTool Setup"
        ConvToolConfig["ConversationToolConfig"]
        CheckAuth{{"webSearchEngine === 'google' &&<br/>authType === LOGIN_WITH_GOOGLE?"}}
        FindModel["findBestGeminiModel()"]
        CreateConfig["Create dedicated Config<br/>with OAuth client"]
        RegisterTool["Register WebSearchTool"]
    end

    subgraph "Execution"
        SearchQuery["User query"]
        SearchExec["WebSearchTool.execute()"]
        GeminiSearch["Gemini SDK search"]
        FormatResults["Format search results"]
    end

    ConvToolConfig --> CheckAuth
    CheckAuth -->|Yes| FindModel
    CheckAuth -->|No| Skip["Skip registration"]
    FindModel --> CreateConfig
    CreateConfig --> RegisterTool

    SearchQuery --> SearchExec
    SearchExec --> GeminiSearch
    GeminiSearch --> FormatResults
```

**Authentication Requirement**: Only enabled for `LOGIN_WITH_GOOGLE` or `USE_VERTEX_AI` auth types because it requires creating a Google OAuth client [src/agent/gemini/cli/tools/conversation-tool-config.ts:52-68]().

**Dedicated Config**: Uses a separate `Config` instance with its own `GeminiClient` to avoid auth conflicts with the main conversation [src/agent/gemini/cli/tools/conversation-tool-config.ts:99-112]().

Sources: [src/agent/gemini/cli/tools/conversation-tool-config.ts:1-181](), [src/agent/gemini/cli/tools/web-search.ts:1-100]()

### WebFetchTool: HTTP Content Retrieval

`WebFetchTool` replaces the built-in `web_fetch` tool with enhanced error handling and content extraction.

**Registration** [src/agent/gemini/cli/tools/conversation-tool-config.ts:46-49]():

```typescript
// All auth types use aionui_web_fetch
this.useAionuiWebFetch = true
this.excludeTools.push('web_fetch') // Exclude built-in
```

Sources: [src/agent/gemini/cli/tools/conversation-tool-config.ts:1-181](), [src/agent/gemini/cli/tools/web-fetch.ts:1-200]()

---

## MCP Tool Integration

MCP (Multi-Client Protocol) servers provide additional tools that are dynamically loaded and registered.

```mermaid
graph TB
    subgraph "MCP Configuration"
        McpJson["mcp.json configuration"]
        McpServers["MCP Server Definitions"]
    end

    subgraph "Loading Process"
        ConfigInit["Config.initialize()"]
        LoadMcp["Load MCP servers from config"]
        ConnectServers["Connect to MCP servers"]
        DiscoverTools["Discover tools from servers"]
    end

    subgraph "Tool Registration"
        ToolRegistry["ToolRegistry"]
        McpToolWrapper["MCP Tool Wrapper"]
        FilterEnabled["Filter by allowedMcpServerNames"]
    end

    McpJson --> McpServers
    McpServers --> ConfigInit
    ConfigInit --> LoadMcp
    LoadMcp --> ConnectServers
    ConnectServers --> DiscoverTools
    DiscoverTools --> McpToolWrapper
    McpToolWrapper --> FilterEnabled
    FilterEnabled --> ToolRegistry
```

**Configuration Location**: MCP servers are configured in conversation's `mcpServers` property, passed during `Config` initialization [src/agent/gemini/cli/config.ts:70]().

**Server Filtering**: Only servers listed in `allowedMcpServerNames` are loaded if specified [src/agent/gemini/cli/settings.ts:1-300]().

Sources: [src/agent/gemini/cli/config.ts:1-250](), [src/agent/gemini/cli/settings.ts:1-300]()

---

## Codex Tool Protocol

Codex agents handle tools through event-based JSON-RPC protocol with specialized handlers for different tool types.

### Codex Tool Event Flow

```mermaid
sequenceDiagram
    participant Codex as Codex CLI
    participant EventHandler as CodexEventHandler
    participant ToolHandlers as CodexToolHandlers
    participant Emitter as ICodexMessageEmitter
    participant UI as Message List UI

    Codex->>EventHandler: exec_command_begin
    EventHandler->>ToolHandlers: handleExecCommandBegin(msg)
    ToolHandlers->>ToolHandlers: pendingConfirmations.add(callId)
    ToolHandlers->>Emitter: emitCodexToolCall(status: 'pending')

    Codex->>EventHandler: exec_command_output_delta
    EventHandler->>ToolHandlers: handleExecCommandOutputDelta(msg)
    ToolHandlers->>ToolHandlers: Buffer stdout/stderr
    ToolHandlers->>Emitter: emitCodexToolCall(status: 'executing', content: output)

    Codex->>EventHandler: exec_command_end
    EventHandler->>ToolHandlers: handleExecCommandEnd(msg)
    ToolHandlers->>ToolHandlers: Determine status from exit_code
    ToolHandlers->>Emitter: emitCodexToolCall(status: 'success'|'error')
    ToolHandlers->>ToolHandlers: pendingConfirmations.delete(callId)

    Emitter->>UI: Update tool call UI with final output
```

**Tool Call Types** [src/agent/codex/handlers/CodexToolHandlers.ts:1-437]():

| Event Type                  | Handler Method                 | Status Flow                               |
| --------------------------- | ------------------------------ | ----------------------------------------- |
| `exec_command_begin`        | `handleExecCommandBegin`       | `pending` → `executing`                   |
| `exec_command_output_delta` | `handleExecCommandOutputDelta` | `executing` (with buffered output)        |
| `exec_command_end`          | `handleExecCommandEnd`         | `success` or `error` based on exit_code   |
| `patch_apply_begin`         | `handlePatchApplyBegin`        | `pending` or `executing` if auto-approved |
| `patch_apply_end`           | `handlePatchApplyEnd`          | `success` or `error`                      |
| `mcp_tool_call_begin`       | `handleMcpToolCallBegin`       | `executing`                               |
| `mcp_tool_call_end`         | `handleMcpToolCallEnd`         | `success` or `error`                      |
| `web_search_begin`          | `handleWebSearchBegin`         | `pending`                                 |
| `web_search_end`            | `handleWebSearchEnd`           | `success`                                 |

**Permission Handling** [src/agent/codex/handlers/CodexEventHandler.ts:98-180]():

- Unified handler for `exec_approval_request` and `apply_patch_approval_request`
- Deduplication via `pendingConfirmations` set using `permission_{callId}` key
- Auto-approval check through `checkExecApproval` and `checkPatchApproval` methods
- Stores exec/patch metadata for ApprovalStore caching [src/agent/codex/handlers/CodexToolHandlers.ts:196]()

**Output Buffering** [src/agent/codex/handlers/CodexToolHandlers.ts:59-92]():

- Base64 decoding of command output chunks (Codex sends base64-encoded strings)
- Separate buffers for stdout, stderr, and combined output
- Progressive UI updates via `emitCodexToolCall` with buffered content

Sources: [src/agent/codex/handlers/CodexEventHandler.ts:1-350](), [src/agent/codex/handlers/CodexToolHandlers.ts:1-437]()

---

## Permission and Approval System

### Multi-Tier Approval Strategy

```mermaid
graph TB
    ToolRequest["Tool Execution Request"]

    ToolRequest --> CheckYolo{{"YOLO Mode Enabled?"}}
    CheckYolo -->|Yes| AutoApprove["Auto-approve all tools"]
    CheckYolo -->|No| CheckCache{{"Check ApprovalStore"}}

    CheckCache --> CacheHit{{"Cached Decision?"}}
    CacheHit -->|"allow_always"| AutoApprove
    CacheHit -->|"deny_always"| AutoDeny["Auto-deny"]
    CacheHit -->|No cache| ShowDialog["Show Permission Dialog"]

    ShowDialog --> UserDecision{{"User Choice"}}
    UserDecision -->|"Allow Once"| ExecuteOnce["Execute tool<br/>Don't cache"]
    UserDecision -->|"Allow Always"| ExecuteCache["Execute tool<br/>Cache approval"]
    UserDecision -->|"Reject Once"| RejectOnce["Cancel tool<br/>Don't cache"]
    UserDecision -->|"Reject Always"| RejectCache["Cancel tool<br/>Cache denial"]

    ExecuteCache --> StoreApproval["ApprovalStore.set(key, 'allow')"]
    RejectCache --> StoreDenial["ApprovalStore.set(key, 'deny')"]
```

**Approval Key Generation** [src/agent/acp/ApprovalStore.ts:1-100]():

```typescript
// ACP: Hash of kind, title, and input
createAcpApprovalKey({ kind, title, rawInput })

// Gemini: Hash of tool name and arguments
createGeminiApprovalKey({ toolName, args })
```

**Session-Scoped Cache**: Approval cache is cleared when conversation ends [src/agent/acp/index.ts:291-294]().

Sources: [src/agent/gemini/GeminiApprovalStore.ts:1-150](), [src/agent/acp/ApprovalStore.ts:1-150]()

### Permission Dialog UI

**Gemini Tool Confirmation** [src/agent/gemini/index.ts:435-459]():

- `onToolCallsUpdate`: Emits tool group with confirmation details
- Frontend shows dialog with tool name, description, locations
- User choice sent back via IPC to `onConfirm` callback

**ACP Permission Request** [src/agent/acp/AcpConnection.ts:690-721]():

- `request_permission` method from ACP server
- Shows dialog with permission kind, title, suggested options
- Returns `outcome` with selected `optionId`

Sources: [src/agent/gemini/index.ts:395-467](), [src/agent/acp/AcpConnection.ts:690-721]()

---

## Tool Result Handling

### Result Display Format

```mermaid
graph TB
    ToolResult["ToolResult from execute()"]

    ToolResult --> LlmContent["llmContent: string<br/>(For AI model consumption)"]
    ToolResult --> ReturnDisplay["returnDisplay?: string<br/>(For user display)"]
    ToolResult --> ResultDisplay["resultDisplay?: ToolResultDisplay<br/>(Structured UI data)"]

    ResultDisplay --> FileChanges["fileChanges?: FileChange[]"]
    ResultDisplay --> Artifacts["artifacts?: Artifact[]"]
    ResultDisplay --> PreviewData["preview?: PreviewData"]

    FileChanges --> UIDiff["Show file diffs in UI"]
    Artifacts --> UIArtifact["Show downloadable artifacts"]
    PreviewData --> UIPreview["Show in preview panel"]
```

**Result Types** [src/agent/gemini/cli/tools/img-gen.ts:387-600]():

| Field           | Purpose                      | Example                            |
| --------------- | ---------------------------- | ---------------------------------- |
| `llmContent`    | Text for AI model to process | `"Generated image at img-123.png"` |
| `returnDisplay` | User-friendly text           | `"✓ Image generated successfully"` |
| `resultDisplay` | Structured UI data           | File paths, previews, artifacts    |

**Image Generation Result** [src/agent/gemini/cli/tools/img-gen.ts:550-580]():

```typescript
return {
  llmContent: analysisText,
  returnDisplay: analysisText,
  resultDisplay: {
    artifacts: [
      {
        label: 'Generated Image',
        content: imagePath,
        contentType: 'image',
      },
    ],
  },
}
```

Sources: [src/agent/gemini/cli/tools/img-gen.ts:387-600]()

### Continuation After Tools

**Gemini Agent** [src/agent/gemini/index.ts:398-428]():

- `onAllToolCallsComplete`: Callback that processes completed tools via `handleCompletedTools()` [src/agent/gemini/utils.ts:409-501]()
- Filters tools using `globalToolCallGuard.isProtected()` to avoid treating protected tools as cancelled
- Detects `save_memory` tool calls and triggers memory refresh via `refreshServerHierarchicalMemory()` [src/agent/gemini/utils.ts:429-436]()
- Submits Gemini-initiated tool results back to model using `submitQuery(response, isContinuation: true)` [src/agent/gemini/index.ts:424]()
- Merges response parts from multiple tools into single continuation request [src/agent/gemini/utils.ts:489-500]()

**Codex Agent**:

- Tool results automatically flow back through Codex CLI protocol
- Final message includes all tool execution context
- No explicit continuation call needed from AionUi side

**Tool Response Compaction** [src/agent/gemini/utils.ts:523-604]():

- After agentic loop completes, `compactToolResponsesInHistory()` is called to reduce context window usage
- Replaces base64 `inlineData` (images/PDFs) with lightweight text placeholders [src/agent/gemini/utils.ts:544-549]()
- Truncates large text responses (>10KB) to first 2KB with truncation notice [src/agent/gemini/utils.ts:553-557]()
- Preserves functionCall ↔ functionResponse pairing to maintain Gemini API compatibility

Sources: [src/agent/gemini/index.ts:398-428](), [src/agent/gemini/utils.ts:409-501](), [src/agent/gemini/utils.ts:523-604]()

---

## Tool Configuration Schema

### Complete Tool Configuration Structure

| Property               | Type                    | Source                 | Description                             |
| ---------------------- | ----------------------- | ---------------------- | --------------------------------------- |
| `proxy`                | string                  | ConversationToolConfig | HTTP proxy for tool network requests    |
| `imageGenerationModel` | TProviderWithModel      | ConversationToolConfig | Model config for image generation       |
| `webSearchEngine`      | 'google' \| 'default'   | ConversationToolConfig | Which search engine to use              |
| `yoloMode`             | boolean                 | GeminiAgent            | Auto-approve all tool executions        |
| `mcpServers`           | Record<string, unknown> | Config                 | MCP server configurations               |
| `excludeTools`         | string[]                | ConversationToolConfig | Tools to exclude from registration      |
| `skillsDir`            | string                  | Config                 | Directory for loading skill definitions |
| `enabledSkills`        | string[]                | Config                 | Filter for which skills to load         |

**Configuration Flow**:

1. User selects preferences in Guid page
2. `ConversationToolConfig` initialized with settings
3. `initializeForConversation()` called with auth type
4. Tools registered during `Config.initialize()`
5. Scheduler configured in `GeminiAgent.initToolScheduler()`

Sources: [src/agent/gemini/cli/tools/conversation-tool-config.ts:15-39](), [src/agent/gemini/index.ts:63-114]()

---

## Summary Table: Tool System Components

| Component                    | Location                                                   | Role                                                 |
| ---------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `CoreToolScheduler`          | `aioncli-core`                                             | Central execution coordinator with approval workflow |
| `ConversationToolConfig`     | [src/agent/gemini/cli/tools/conversation-tool-config.ts]() | Conversation-level tool enablement decisions         |
| `ImageGenerationTool`        | [src/agent/gemini/cli/tools/img-gen.ts]()                  | Image generation, editing, and analysis              |
| `WebSearchTool`              | [src/agent/gemini/cli/tools/web-search.ts]()               | Google search with OAuth                             |
| `WebFetchTool`               | [src/agent/gemini/cli/tools/web-fetch.ts]()                | HTTP content retrieval                               |
| `ToolRegistry`               | `aioncli-core`                                             | Tool discovery and lookup                            |
| `normalizeToolParams`        | [src/agent/gemini/utils.ts:288-331]()                      | Parameter standardization across models              |
| `GeminiApprovalStore`        | [src/agent/gemini/GeminiApprovalStore.ts]()                | Session-level approval caching for Gemini            |
| `AcpApprovalStore`           | [src/agent/acp/ApprovalStore.ts]()                         | Session-level approval caching for ACP               |
| `processGeminiFunctionCalls` | [src/agent/gemini/utils.ts:332-450]()                      | Bridge from Gemini API to CoreToolScheduler          |

Sources: [src/agent/gemini/index.ts:1-865](), [src/agent/gemini/utils.ts:1-450](), [src/agent/gemini/cli/tools/]()
