# Tool System

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [examples/bird-checker-with-express/src/index.ts](examples/bird-checker-with-express/src/index.ts)
- [examples/bird-checker-with-nextjs-and-eval/src/lib/mastra/actions.ts](examples/bird-checker-with-nextjs-and-eval/src/lib/mastra/actions.ts)
- [packages/core/src/action/index.ts](packages/core/src/action/index.ts)
- [packages/core/src/agent/**tests**/utils.test.ts](packages/core/src/agent/__tests__/utils.test.ts)
- [packages/core/src/agent/agent-legacy.ts](packages/core/src/agent/agent-legacy.ts)
- [packages/core/src/agent/agent.test.ts](packages/core/src/agent/agent.test.ts)
- [packages/core/src/agent/agent.ts](packages/core/src/agent/agent.ts)
- [packages/core/src/agent/agent.types.ts](packages/core/src/agent/agent.types.ts)
- [packages/core/src/agent/index.ts](packages/core/src/agent/index.ts)
- [packages/core/src/agent/trip-wire.ts](packages/core/src/agent/trip-wire.ts)
- [packages/core/src/agent/types.ts](packages/core/src/agent/types.ts)
- [packages/core/src/agent/utils.ts](packages/core/src/agent/utils.ts)
- [packages/core/src/agent/workflows/prepare-stream/index.ts](packages/core/src/agent/workflows/prepare-stream/index.ts)
- [packages/core/src/agent/workflows/prepare-stream/map-results-step.ts](packages/core/src/agent/workflows/prepare-stream/map-results-step.ts)
- [packages/core/src/agent/workflows/prepare-stream/prepare-memory-step.ts](packages/core/src/agent/workflows/prepare-stream/prepare-memory-step.ts)
- [packages/core/src/agent/workflows/prepare-stream/prepare-tools-step.ts](packages/core/src/agent/workflows/prepare-stream/prepare-tools-step.ts)
- [packages/core/src/agent/workflows/prepare-stream/stream-step.ts](packages/core/src/agent/workflows/prepare-stream/stream-step.ts)
- [packages/core/src/llm/index.ts](packages/core/src/llm/index.ts)
- [packages/core/src/llm/model/model.loop.ts](packages/core/src/llm/model/model.loop.ts)
- [packages/core/src/llm/model/model.loop.types.ts](packages/core/src/llm/model/model.loop.types.ts)
- [packages/core/src/llm/model/model.test.ts](packages/core/src/llm/model/model.test.ts)
- [packages/core/src/llm/model/model.ts](packages/core/src/llm/model/model.ts)
- [packages/core/src/loop/**snapshots**/loop.test.ts.snap](packages/core/src/loop/__snapshots__/loop.test.ts.snap)
- [packages/core/src/loop/index.ts](packages/core/src/loop/index.ts)
- [packages/core/src/loop/loop.test.ts](packages/core/src/loop/loop.test.ts)
- [packages/core/src/loop/loop.ts](packages/core/src/loop/loop.ts)
- [packages/core/src/loop/test-utils/fullStream.ts](packages/core/src/loop/test-utils/fullStream.ts)
- [packages/core/src/loop/test-utils/generateText.ts](packages/core/src/loop/test-utils/generateText.ts)
- [packages/core/src/loop/test-utils/options.ts](packages/core/src/loop/test-utils/options.ts)
- [packages/core/src/loop/test-utils/resultObject.ts](packages/core/src/loop/test-utils/resultObject.ts)
- [packages/core/src/loop/test-utils/streamObject.ts](packages/core/src/loop/test-utils/streamObject.ts)
- [packages/core/src/loop/test-utils/textStream.ts](packages/core/src/loop/test-utils/textStream.ts)
- [packages/core/src/loop/test-utils/tools.ts](packages/core/src/loop/test-utils/tools.ts)
- [packages/core/src/loop/test-utils/utils.ts](packages/core/src/loop/test-utils/utils.ts)
- [packages/core/src/loop/types.ts](packages/core/src/loop/types.ts)
- [packages/core/src/loop/workflows/agentic-execution/llm-execution-step.test.ts](packages/core/src/loop/workflows/agentic-execution/llm-execution-step.test.ts)
- [packages/core/src/loop/workflows/agentic-execution/llm-execution-step.ts](packages/core/src/loop/workflows/agentic-execution/llm-execution-step.ts)
- [packages/core/src/loop/workflows/agentic-execution/tool-call-step.test.ts](packages/core/src/loop/workflows/agentic-execution/tool-call-step.test.ts)
- [packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts](packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts)
- [packages/core/src/mastra/index.ts](packages/core/src/mastra/index.ts)
- [packages/core/src/observability/types/tracing.ts](packages/core/src/observability/types/tracing.ts)
- [packages/core/src/stream/aisdk/v5/compat/prepare-tools.test.ts](packages/core/src/stream/aisdk/v5/compat/prepare-tools.test.ts)
- [packages/core/src/stream/aisdk/v5/compat/prepare-tools.ts](packages/core/src/stream/aisdk/v5/compat/prepare-tools.ts)
- [packages/core/src/stream/aisdk/v5/execute.ts](packages/core/src/stream/aisdk/v5/execute.ts)
- [packages/core/src/stream/aisdk/v5/output-helpers.ts](packages/core/src/stream/aisdk/v5/output-helpers.ts)
- [packages/core/src/stream/base/output.ts](packages/core/src/stream/base/output.ts)
- [packages/core/src/stream/types.ts](packages/core/src/stream/types.ts)
- [packages/core/src/tools/index.ts](packages/core/src/tools/index.ts)
- [packages/core/src/tools/provider-tool-utils.test.ts](packages/core/src/tools/provider-tool-utils.test.ts)
- [packages/core/src/tools/provider-tool-utils.ts](packages/core/src/tools/provider-tool-utils.ts)
- [packages/core/src/tools/tool-builder/builder.test.ts](packages/core/src/tools/tool-builder/builder.test.ts)
- [packages/core/src/tools/tool-builder/builder.ts](packages/core/src/tools/tool-builder/builder.ts)
- [packages/core/src/tools/tool.ts](packages/core/src/tools/tool.ts)
- [packages/core/src/tools/toolchecks.test.ts](packages/core/src/tools/toolchecks.test.ts)
- [packages/core/src/tools/toolchecks.ts](packages/core/src/tools/toolchecks.ts)
- [packages/core/src/tools/types.ts](packages/core/src/tools/types.ts)

</details>

The Tool System provides a unified interface for defining, converting, and executing functions that agents and workflows can call. It handles schema validation, context injection, observability tracing, and format conversion between Mastra tools, Vercel AI SDK tools, and provider-defined tools. For model provider integration, see [Model Provider System](#5). For agent execution that calls tools, see [Agent System](#3).

## Tool Definition and Types

Tools in Mastra are defined using the `Tool` class or the `createTool` helper function. A tool consists of an identifier, description, input/output schemas, and an execute function.

```mermaid
graph TB
    subgraph "Tool Definition Layer"
        CreateTool["createTool()<br/>packages/core/src/tools/tool.ts"]
        ToolClass["Tool class<br/>MASTRA_TOOL_MARKER symbol"]
        ToolAction["ToolAction interface<br/>packages/core/src/tools/types.ts"]
    end

    subgraph "Tool Format Types"
        MastraTool["Mastra Tools<br/>Tool<TSchemaIn, TSchemaOut>"]
        VercelTool["Vercel AI SDK Tools<br/>Tool (v4), ToolV5 (v5)"]
        ProviderTool["Provider-Defined Tools<br/>type: 'provider-defined'<br/>id: 'provider.toolName'"]
        McpTool["MCP Tools<br/>From external MCP servers"]
    end

    subgraph "Schema Types"
        InputSchema["inputSchema<br/>StandardSchemaWithJSON<TSchemaIn>"]
        OutputSchema["outputSchema<br/>StandardSchemaWithJSON<TSchemaOut>"]
        SuspendSchema["suspendSchema<br/>For suspend/resume"]
        ResumeSchema["resumeSchema<br/>For resume data"]
        RequestContextSchema["requestContextSchema<br/>For context validation"]
    end

    subgraph "Execution Signature"
        MastraExecute["execute(inputData, context)<br/>Mastra signature"]
        AISDKExecute["execute(params, options)<br/>AI SDK signature"]
    end

    CreateTool --> ToolClass
    ToolClass -.implements.-> ToolAction

    ToolAction --> MastraTool
    ToolAction --> InputSchema
    ToolAction --> OutputSchema
    ToolAction --> SuspendSchema
    ToolAction --> ResumeSchema
    ToolAction --> RequestContextSchema

    MastraTool --> MastraExecute
    VercelTool --> AISDKExecute
    ProviderTool --> AISDKExecute
    McpTool --> MastraExecute
```

**Tool Format Types**

| Format                    | Signature                     | Use Case                                    |
| ------------------------- | ----------------------------- | ------------------------------------------- |
| **Mastra Tool**           | `execute(inputData, context)` | User-defined tools with full Mastra context |
| **Vercel AI SDK Tool**    | `execute(params, options)`    | AI SDK v4/v5 compatibility                  |
| **Provider-Defined Tool** | `execute(params, options)`    | Native LLM tools like `openai.web_search`   |
| **MCP Tool**              | `execute(inputData, context)` | Tools from Model Context Protocol servers   |

Sources: [packages/core/src/tools/tool.ts:1-450](), [packages/core/src/tools/types.ts:1-350]()

## Tool Execution Context

Tools receive different execution contexts based on their invocation source. The `ToolExecutionContext` type is a discriminated union that provides appropriate properties for each execution environment.

```mermaid
graph TB
    subgraph "Execution Context Types"
        BaseContext["Common Context<br/>mastra, memory, runId<br/>requestContext, workspace<br/>writer, abortSignal<br/>suspend, resumeData"]

        AgentContext["AgentToolExecutionContext<br/>toolCallId, messages<br/>threadId, resourceId<br/>writableStream"]

        WorkflowContext["WorkflowToolExecutionContext<br/>runId, workflowId<br/>state, setState"]

        MCPContext["MCPToolExecutionContext<br/>extra (RequestHandlerExtra)<br/>elicitation.sendRequest"]
    end

    subgraph "Context Injection Points"
        CoreToolBuilder["CoreToolBuilder<br/>packages/core/src/tools/tool-builder/builder.ts:310-556"]
        ToolCallStep["Tool Call Step<br/>packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts"]
        MCPClient["MCP Client<br/>Adds mcpMetadata"]
    end

    subgraph "Context Properties"
        Suspend["suspend(payload, options)<br/>Pause execution"]
        ResumeData["resumeData<br/>Resume from suspension"]
        Writer["ToolStream writer<br/>Stream tool output"]
        Workspace["Workspace<br/>File operations"]
        Mastra["mastra/MastraPrimitives<br/>Access to agents, storage"]
    end

    BaseContext --> AgentContext
    BaseContext --> WorkflowContext
    BaseContext --> MCPContext

    CoreToolBuilder --> BaseContext
    ToolCallStep --> AgentContext
    MCPClient --> MCPContext

    BaseContext --> Suspend
    BaseContext --> ResumeData
    BaseContext --> Writer
    BaseContext --> Workspace
    BaseContext --> Mastra
```

**Agent Context Properties**

- `toolCallId`: Unique identifier for this tool invocation
- `messages`: Full conversation history for context-aware tools
- `threadId`/`resourceId`: Memory identifiers for stateful operations
- `writableStream`: Original AI SDK WritableStream for streaming responses

**Workflow Context Properties**

- `runId`: Workflow execution identifier
- `workflowId`: Workflow definition identifier
- `state`: Current workflow state (read)
- `setState`: Function to update workflow state

**MCP Context Properties**

- `extra`: MCP protocol context from the server
- `elicitation.sendRequest`: Handler for interactive user input during execution

Sources: [packages/core/src/tools/types.ts:32-105](), [packages/core/src/tools/tool-builder/builder.ts:400-456]()

## CoreToolBuilder: Format Conversion

The `CoreToolBuilder` class converts between different tool formats and creates the AI SDK-compatible `CoreTool` format. It acts as an adapter layer between Mastra's tool system and the AI SDK's expectations.

```mermaid
graph TB
    subgraph "Input Tool Formats"
        MastraInput["Mastra Tool<br/>ToolAction interface"]
        VercelInput["Vercel AI SDK Tool<br/>Tool/ToolV5"]
        ProviderInput["Provider-Defined Tool<br/>type: 'provider-defined'"]
    end

    subgraph "CoreToolBuilder Conversion"
        Constructor["CoreToolBuilder constructor<br/>packages/core/src/tools/tool-builder/builder.ts:66-118"]
        Build["build() method<br/>Returns CoreTool"]

        GetParameters["getParameters()<br/>Extract input schema"]
        GetOutputSchema["getOutputSchema()<br/>Extract output schema"]
        CreateExecute["createExecute()<br/>Wrap with context injection"]
        BuildProviderTool["buildProviderTool()<br/>Handle provider-defined tools"]
    end

    subgraph "Schema Conversion"
        ZodToAISDK["Zod → AI SDK Schema<br/>convertZodSchemaToAISDKSchema"]
        StandardToJSON["StandardSchema → JSON<br/>standardSchemaToJSONSchema"]
        JSONToAISDK["JSON → AI SDK Schema<br/>jsonSchema wrapper"]
        CompatLayers["Schema Compat Layers<br/>OpenAI, Anthropic, Google, etc."]
    end

    subgraph "Output Format"
        CoreTool["CoreTool<br/>AI SDK-compatible format"]
        Parameters["parameters: Schema"]
        Execute["execute(params, options)"]
        ProviderOptions["providerOptions<br/>Provider-specific config"]
        MCPProperties["mcp?: MCPToolProperties<br/>annotations, _meta"]
    end

    MastraInput --> Constructor
    VercelInput --> Constructor
    ProviderInput --> Constructor

    Constructor --> Build
    Build --> GetParameters
    Build --> GetOutputSchema
    Build --> CreateExecute
    Build --> BuildProviderTool

    GetParameters --> ZodToAISDK
    GetParameters --> StandardToJSON
    GetParameters --> JSONToAISDK
    ZodToAISDK --> CompatLayers

    CreateExecute --> CoreTool
    GetParameters --> Parameters
    Parameters --> CoreTool
    GetOutputSchema --> CoreTool
    BuildProviderTool --> CoreTool

    CoreTool --> Execute
    CoreTool --> ProviderOptions
    CoreTool --> MCPProperties
```

**Conversion Flow**

1. **Construction**: `CoreToolBuilder` receives original tool and options
2. **Schema Extraction**: `getParameters()` and `getOutputSchema()` extract schemas
3. **Schema Conversion**: Convert Zod/StandardSchema/JSONSchema to AI SDK Schema format
4. **Execution Wrapping**: `createExecute()` wraps tool execution with:
   - Observability spans (TOOL_CALL or MCP_TOOL_CALL)
   - Input/output validation
   - Context injection (mastra, memory, workspace, etc.)
   - Error handling and logging
5. **Output**: Returns `CoreTool` with AI SDK-compatible signature

Sources: [packages/core/src/tools/tool-builder/builder.ts:61-556]()

## Schema Validation System

Tools support four types of schemas for comprehensive validation and type safety. All schemas use `StandardSchemaWithJSON` for cross-library compatibility.

```mermaid
graph TB
    subgraph "Schema Types"
        InputSchema["inputSchema<br/>Validates tool parameters"]
        OutputSchema["outputSchema<br/>Validates tool results"]
        SuspendSchema["suspendSchema<br/>Validates suspend payload"]
        ResumeSchema["resumeSchema<br/>Validates resume data"]
    end

    subgraph "Schema Formats"
        ZodSchema["Zod Schema<br/>z.object(...)"]
        JSONSchema7["JSON Schema<br/>JSONSchema7"]
        StandardSchema["StandardSchemaWithJSON<br/>Cross-library format"]
    end

    subgraph "Validation Points"
        ValidateInput["validateToolInput()<br/>packages/core/src/tools/validation.ts:32-83"]
        ValidateOutput["validateToolOutput()<br/>packages/core/src/tools/validation.ts:85-136"]
        ValidateSuspend["validateToolSuspendData()<br/>packages/core/src/tools/validation.ts:138-189"]
        ValidateContext["validateRequestContext()<br/>packages/core/src/tools/validation.ts:191-242"]
    end

    subgraph "Validation Errors"
        ValidationError["ValidationError<br/>Structured error with issues"]
        SchemaIssue["issues: SchemaIssue[]<br/>path, message, expected"]
    end

    ZodSchema --> StandardSchema
    JSONSchema7 --> StandardSchema

    InputSchema -.uses.-> StandardSchema
    OutputSchema -.uses.-> StandardSchema
    SuspendSchema -.uses.-> StandardSchema
    ResumeSchema -.uses.-> StandardSchema

    InputSchema --> ValidateInput
    OutputSchema --> ValidateOutput
    SuspendSchema --> ValidateSuspend

    ValidateInput --> ValidationError
    ValidateOutput --> ValidationError
    ValidateSuspend --> ValidationError
    ValidateContext --> ValidationError

    ValidationError --> SchemaIssue
```

**Validation Lifecycle**

| Stage                | Function                    | Purpose                                      |
| -------------------- | --------------------------- | -------------------------------------------- |
| **Before Execution** | `validateToolInput()`       | Validate tool parameters before execute()    |
| **After Execution**  | `validateToolOutput()`      | Validate tool result before returning to LLM |
| **On Suspend**       | `validateToolSuspendData()` | Validate suspension payload                  |
| **Context Check**    | `validateRequestContext()`  | Validate requestContext against schema       |

**Auto-Resume Schema Injection**

For tools that call agents or workflows, `CoreToolBuilder` automatically extends the input schema with suspend/resume fields:

```typescript
// Original schema
z.object({ query: z.string() })

// Extended schema for agent/workflow tools
z.object({
  query: z.string(),
  suspendedToolRunId: z.string().nullable().optional(),
  resumeData: z.any().optional(),
})
```

This allows suspended tools to be automatically resumed when the LLM calls them again with resume data.

Sources: [packages/core/src/tools/validation.ts:1-242](), [packages/core/src/tools/tool-builder/builder.ts:78-117]()

## Tool Execution and Observability

Tool execution is wrapped with observability spans, context injection, and error handling. The execution flow varies based on tool format (Mastra vs Vercel AI SDK).

```mermaid
graph TB
    subgraph "Execution Entry Point"
        CoreToolExecute["CoreTool.execute()<br/>AI SDK signature"]
        BuilderExecute["CoreToolBuilder.createExecute()<br/>packages/core/src/tools/tool-builder/builder.ts:310-556"]
    end

    subgraph "Span Creation"
        GetOrCreateSpan["getOrCreateSpan()<br/>Create tool span"]
        SpanType["SpanType.TOOL_CALL or<br/>SpanType.MCP_TOOL_CALL"]
        SpanAttributes["attributes:<br/>toolDescription, toolType<br/>mcpServer, serverVersion"]
    end

    subgraph "Context Assembly"
        BaseContext["Base Context<br/>mastra, memory, runId<br/>requestContext, workspace"]
        AgentProps["Agent Properties<br/>toolCallId, messages<br/>threadId, resourceId"]
        WorkflowProps["Workflow Properties<br/>workflowId, state<br/>setState"]
        MCPProps["MCP Properties<br/>extra, elicitation"]
    end

    subgraph "Tool Type Execution"
        VercelExec["Vercel Tool<br/>tool.execute(args, options)"]
        MastraExec["Mastra Tool<br/>tool.execute(inputData, context)"]
    end

    subgraph "Result Handling"
        ValidateOutput["validateToolOutput()<br/>If outputSchema present"]
        ValidateSuspend["validateToolSuspendData()<br/>If suspended"]
        EndSpan["span.end(result)<br/>Record successful execution"]
        ErrorSpan["span.error(error)<br/>Record failure"]
    end

    CoreToolExecute --> BuilderExecute
    BuilderExecute --> GetOrCreateSpan
    GetOrCreateSpan --> SpanType
    GetOrCreateSpan --> SpanAttributes

    BuilderExecute --> BaseContext
    BaseContext --> AgentProps
    BaseContext --> WorkflowProps
    BaseContext --> MCPProps

    AgentProps --> MastraExec
    WorkflowProps --> MastraExec
    MCPProps --> MastraExec

    BuilderExecute --> VercelExec
    BuilderExecute --> MastraExec

    VercelExec --> ValidateOutput
    MastraExec --> ValidateOutput
    ValidateOutput --> ValidateSuspend
    ValidateSuspend --> EndSpan
    ValidateSuspend --> ErrorSpan
```

**Span Types and Attributes**

**Regular Tool Call:**

- `type`: `SpanType.TOOL_CALL`
- `name`: `"tool: '<toolName>'"`
- `attributes`: `{ toolDescription, toolType }`

**MCP Tool Call:**

- `type`: `SpanType.MCP_TOOL_CALL`
- `name`: `"mcp_tool: '<toolName>' on '<serverName>'"`
- `attributes`: `{ mcpServer, serverVersion, toolDescription }`

**Context Injection Logic**

The builder determines execution context based on presence of properties:

```typescript
// Agent execution: has toolCallId and messages
const isAgentExecution =
  (options.toolCallId && options.messages) ||
  (agentName && threadId && !workflowId)

// Workflow execution: has workflow properties
const isWorkflowExecution = !isAgentExecution && (workflow || workflowId)

// MCP execution: has MCP context
const isMCPExecution = options.mcp !== undefined
```

Sources: [packages/core/src/tools/tool-builder/builder.ts:333-556](), [packages/core/src/observability/types/tracing.ts:1-500]()

## Tool Integration Points

Tools integrate with multiple Mastra subsystems, each providing different capabilities and constraints.

```mermaid
graph TB
    subgraph "Agent Integration"
        AgentTools["agent.tools<br/>Static or dynamic function"]
        AgentToolsets["agent toolsets<br/>Per-generation tools"]
        ClientTools["Client-side tools<br/>options.clientTools"]
        WorkspaceTools["Workspace tools<br/>Auto-injected from workspace"]
        SkillTools["Skill tools<br/>Auto-generated from workspace.skills"]
    end

    subgraph "Workflow Integration"
        WorkflowTools["workflow tools<br/>Per-step tools"]
        AgentStep["Agent step<br/>Inherits agent's tools"]
        ToolStep["Tool step<br/>createStep(tool)"]
    end

    subgraph "MCP Integration"
        MCPServer["MCPServerBase<br/>packages/core/src/mcp"]
        ListTools["listTools()<br/>Discover available tools"]
        CallTool["callTool(name, args)<br/>Execute remote tool"]
        MCPClient["MCP Client<br/>Creates local tool wrappers"]
    end

    subgraph "Tool Registry"
        MastraTools["mastra.tools<br/>Global tool registry"]
        AddTool["mastra.addTool(tool, key)<br/>Register tool"]
        GetTool["mastra.getTool(key)<br/>Retrieve tool"]
    end

    subgraph "Tool Builder Pipeline"
        PrepareTools["Prepare Tools Step<br/>packages/core/src/agent/workflows/prepare-stream/prepare-tools-step.ts"]
        CoreToolBuilder["CoreToolBuilder<br/>Convert to CoreTool format"]
        MakeCoreTool["makeCoreTool()<br/>AI SDK conversion"]
    end

    AgentTools --> PrepareTools
    AgentToolsets --> PrepareTools
    ClientTools --> PrepareTools
    WorkspaceTools --> PrepareTools
    SkillTools --> PrepareTools

    WorkflowTools --> ToolStep
    AgentStep --> AgentTools

    MCPServer --> ListTools
    MCPServer --> CallTool
    ListTools --> MCPClient
    MCPClient --> PrepareTools

    MastraTools --> AddTool
    AddTool --> GetTool

    PrepareTools --> CoreToolBuilder
    CoreToolBuilder --> MakeCoreTool
```

**Tool Source Hierarchy**

Tools are collected from multiple sources and merged in priority order:

1. **Client tools** (highest priority): Tools passed in `generate()`/`stream()` options
2. **Toolsets**: Integration toolsets (per-generation)
3. **Workspace tools**: Auto-generated from workspace configuration
4. **Skill tools**: Auto-generated from `workspace.skills`
5. **Agent tools**: Static tools from agent constructor
6. **Workflow tools**: Generated from `agent.workflows`

**MCP Tool Discovery**

MCP servers expose tools via the Model Context Protocol:

1. `MCPServerBase.listTools()` returns available tools with schemas
2. MCP client creates local `Tool` instances with `execute()` wrappers
3. Wrappers call `server.callTool(name, args)` over MCP transport
4. `mcpMetadata` property identifies tools as MCP-originated for tracing

Sources: [packages/core/src/agent/workflows/prepare-stream/prepare-tools-step.ts:1-324](), [packages/core/src/tools/tool-builder/builder.ts:61-556](), [packages/core/src/mcp/types.ts:1-200]()

## Provider-Defined Tools

Provider-defined tools are native LLM tools executed server-side by the model provider. These tools have special handling for execution and result processing.

```mermaid
graph TB
    subgraph "Provider Tool Format"
        ProviderType["type: 'provider-defined'<br/>AI SDK v5/v6"]
        ProviderID["id: 'provider.toolName'<br/>e.g., 'openai.web_search'"]
        Parameters["parameters: Schema<br/>Input schema"]
        OutputSchema["outputSchema?: Schema<br/>Optional output schema"]
    end

    subgraph "Detection and Handling"
        FindProviderTool["findProviderToolByName()<br/>packages/core/src/tools/provider-tool-utils.ts:14-28"]
        InferExecuted["inferProviderExecuted()<br/>Determine if provider executed"]
        ProviderExecutedFlag["providerExecuted: boolean<br/>Attached to tool calls/results"]
    end

    subgraph "Execution Flow"
        LLMCall["LLM generates tool call<br/>May execute immediately"]
        ToolCallChunk["tool-call chunk<br/>providerExecuted flag set"]
        SkipClientExec["Skip client execution<br/>If providerExecuted = true"]
        ToolResultChunk["tool-result chunk<br/>Contains provider result"]
    end

    subgraph "Message Storage"
        MessageList["MessageList<br/>Store tool call and result"]
        ProviderMetadata["providerMetadata<br/>Provider-specific data"]
        ToolInvocation["Tool invocation part<br/>In message content"]
    end

    ProviderType --> ProviderID
    ProviderID --> Parameters
    Parameters --> OutputSchema

    ProviderID --> FindProviderTool
    FindProviderTool --> InferExecuted
    InferExecuted --> ProviderExecutedFlag

    LLMCall --> ToolCallChunk
    ToolCallChunk --> ProviderExecutedFlag
    ProviderExecutedFlag --> SkipClientExec
    SkipClientExec --> ToolResultChunk

    ToolCallChunk --> MessageList
    ToolResultChunk --> MessageList
    MessageList --> ProviderMetadata
    MessageList --> ToolInvocation
```

**Provider Tool Identification**

Provider tools are identified by their `id` format:

- **Format**: `"provider.toolName"` (contains a dot separator)
- **Examples**:
  - `"openai.web_search"`: OpenAI web search
  - `"anthropic.computer_use"`: Anthropic computer use
  - `"google.code_execution"`: Google code execution

**Execution Determination**

The `inferProviderExecuted()` function determines if a tool was executed by the provider:

1. Check explicit `providerExecuted` flag on chunk
2. If undefined, check if tool definition has `execute` function
3. If tool has no `execute`, assume provider-executed
4. Otherwise, assume client-executed

**Tool Call Step Handling**

The tool call step skips execution for provider-executed tools:

```typescript
// In tool-call-step.ts
if (providerExecuted) {
  // Provider already executed, just record the result
  return { result: alreadyExecutedResult }
}
// Otherwise, execute client-side
const result = await tool.execute(args, context)
```

Sources: [packages/core/src/tools/provider-tool-utils.ts:1-50](), [packages/core/src/loop/workflows/agentic-execution/llm-execution-step.ts:475-496](), [packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts:47-175]()

## Suspend and Resume Mechanism

Tools can suspend execution to request human approval or additional input, then resume later with the provided data. This enables human-in-the-loop workflows.

```mermaid
graph TB
    subgraph "Suspension Flow"
        ToolExecute["Tool calls context.suspend()"]
        SuspendPayload["suspendPayload<br/>Data for approval UI"]
        SuspendOptions["SuspendOptions<br/>resumeSchema"]
        WorkflowSuspend["Workflow suspend()<br/>Throws SUSPEND error"]
    end

    subgraph "Metadata Storage"
        AddMetadata["addToolMetadata()<br/>packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts:59-115"]
        SuspendedTools["metadata.suspendedTools<br/>Keyed by toolName"]
        ToolMetadata["{ toolCallId, toolName,<br/>args, runId,<br/>suspendPayload,<br/>resumeSchema }"]
    end

    subgraph "Resume Flow"
        ResumeRequest["Client calls agent with<br/>tool args + resumeData"]
        AutoResumeSchema["Auto-injected schema fields<br/>suspendedToolRunId<br/>resumeData"]
        ToolExecuteResume["Tool receives resumeData<br/>in context"]
        CompleteExecution["Tool completes execution"]
    end

    subgraph "Tool Approval"
        RequireApproval["tool.requireApproval = true"]
        PendingApprovals["metadata.pendingToolApprovals"]
        ApprovalData["{ toolCallId, toolName,<br/>args, type: 'approval',<br/>runId }"]
    end

    ToolExecute --> SuspendPayload
    SuspendPayload --> SuspendOptions
    SuspendOptions --> WorkflowSuspend

    WorkflowSuspend --> AddMetadata
    AddMetadata --> SuspendedTools
    SuspendedTools --> ToolMetadata

    RequireApproval --> AddMetadata
    AddMetadata --> PendingApprovals
    PendingApprovals --> ApprovalData

    ResumeRequest --> AutoResumeSchema
    AutoResumeSchema --> ToolExecuteResume
    ToolExecuteResume --> CompleteExecution
```

**Suspension Types**

| Type                | Trigger                 | Metadata Key           | Use Case                                           |
| ------------------- | ----------------------- | ---------------------- | -------------------------------------------------- |
| **Tool Suspension** | Tool calls `suspend()`  | `suspendedTools`       | Tool needs additional input mid-execution          |
| **Tool Approval**   | `requireApproval: true` | `pendingToolApprovals` | Tool needs explicit user approval before execution |

**Resume Schema Auto-Injection**

For tools that may suspend (agents, workflows), `CoreToolBuilder` extends the input schema:

```typescript
// packages/core/src/tools/tool-builder/builder.ts:78-117
if (tool.id?.startsWith('agent-') || tool.id?.startsWith('workflow-')) {
  tool.inputSchema = baseSchema.extend({
    suspendedToolRunId: z.string().nullable().optional(),
    resumeData: z.any().optional(),
  })
}
```

**Resume Flow**

1. Tool suspends with payload: `await context.suspend({ needsConfirmation: true })`
2. Payload stored in `metadata.suspendedTools[toolName]`
3. Client displays suspension UI to user
4. User provides resume data
5. Client calls agent with: `{ ...toolArgs, suspendedToolRunId, resumeData }`
6. Tool receives `context.resumeData` and completes execution

Sources: [packages/core/src/loop/workflows/agentic-execution/tool-call-step.ts:59-200](), [packages/core/src/tools/tool-builder/builder.ts:78-117](), [packages/core/src/workflows/types.ts:150-180]()

## Tool Streaming and Output

Tools can stream partial results during execution using the `ToolStream` writer. This enables real-time feedback for long-running operations.

```mermaid
graph TB
    subgraph "ToolStream Writer"
        Writer["context.writer<br/>ToolStream instance"]
        Prefix["prefix: 'tool'"]
        CallId["callId: toolCallId"]
        RunId["runId: execution ID"]
        OutputWriter["outputWriter<br/>Workflow OutputWriter"]
    end

    subgraph "Streaming Methods"
        WriteText["writeText(text)<br/>Stream text content"]
        WriteJSON["writeJSON(data)<br/>Stream JSON data"]
        WriteError["writeError(error)<br/>Stream error"]
        WriteToolCall["writeToolCall()<br/>Nested tool calls"]
        WriteToolResult["writeToolResult()<br/>Nested tool results"]
    end

    subgraph "Chunk Format"
        ChunkType["ChunkType<br/>packages/core/src/stream/types.ts"]
        ToolStreamChunk["{ type: 'tool-stream',<br/>from: ChunkFrom.AGENT,<br/>runId, payload }"]
        Payload["payload: {<br/>prefix, callId,<br/>name, data }"]
    end

    subgraph "Output Writer Pipeline"
        WorkflowWriter["Workflow OutputWriter"]
        ChunkEnqueue["Enqueue chunks to stream"]
        ClientConsume["Client consumes stream"]
    end

    Writer --> Prefix
    Writer --> CallId
    Writer --> RunId
    Writer --> OutputWriter

    Writer --> WriteText
    Writer --> WriteJSON
    Writer --> WriteError
    Writer --> WriteToolCall
    Writer --> WriteToolResult

    WriteText --> ChunkType
    WriteJSON --> ChunkType
    WriteError --> ChunkType
    ChunkType --> ToolStreamChunk
    ToolStreamChunk --> Payload

    OutputWriter --> WorkflowWriter
    WorkflowWriter --> ChunkEnqueue
    ChunkEnqueue --> ClientConsume
```

**ToolStream API**

**Basic Streaming:**

```typescript
await context.writer.writeText('Processing...')
await context.writer.writeJSON({ progress: 50 })
```

**Nested Tool Calls:**

```typescript
await context.writer.writeToolCall({
  toolName: 'subTool',
  toolCallId: 'call-123',
  args: { query: 'test' },
})

await context.writer.writeToolResult({
  toolName: 'subTool',
  toolCallId: 'call-123',
  result: { data: 'response' },
})
```

**Chunk Format**

All tool stream chunks have this structure:

```typescript
{
  type: 'tool-stream',
  from: ChunkFrom.AGENT,
  runId: string,
  payload: {
    prefix: 'tool',
    callId: string,    // Tool call ID
    name: string,      // Tool name
    data: unknown      // Stream data
  }
}
```

Sources: [packages/core/src/tools/stream.ts:1-150](), [packages/core/src/stream/types.ts:270-320]()

## MCP Tool Properties and Annotations

Tools can include MCP-specific properties for Model Context Protocol integration. These properties control how tools are presented in MCP clients and provide behavior hints.

```mermaid
graph TB
    subgraph "MCP Tool Properties"
        MCPProp["tool.mcp<br/>MCPToolProperties"]
        ToolType["toolType: MCPToolType<br/>'agent' | 'workflow' | undefined"]
        Annotations["annotations:<br/>ToolAnnotations"]
        Meta["_meta:<br/>Record<string, unknown>"]
    end

    subgraph "Tool Annotations"
        Title["title: string<br/>Display name"]
        ReadOnly["readOnlyHint: boolean<br/>No side effects"]
        Destructive["destructiveHint: boolean<br/>Destructive updates"]
        Idempotent["idempotentHint: boolean<br/>Idempotent behavior"]
        OpenWorld["openWorldHint: boolean<br/>External interactions"]
    end

    subgraph "CoreTool Conversion"
        BuildTool["CoreToolBuilder.build()"]
        PreserveMCP["Preserve mcp properties"]
        CoreToolMCP["CoreTool.mcp<br/>Passed to AI SDK"]
    end

    subgraph "MCP Server Usage"
        ListTools["server.listTools()"]
        ToolInfo["ListToolsResult"]
        ClientReceives["MCP client receives<br/>tool metadata"]
        UIPresentation["UI presentation<br/>Based on annotations"]
    end

    MCPProp --> ToolType
    MCPProp --> Annotations
    MCPProp --> Meta

    Annotations --> Title
    Annotations --> ReadOnly
    Annotations --> Destructive
    Annotations --> Idempotent
    Annotations --> OpenWorld

    MCPProp --> BuildTool
    BuildTool --> PreserveMCP
    PreserveMCP --> CoreToolMCP

    CoreToolMCP --> ListTools
    ListTools --> ToolInfo
    ToolInfo --> ClientReceives
    ClientReceives --> UIPresentation
```

**Annotation Examples**

**Read-only Tool (e.g., search):**

```typescript
mcp: {
  annotations: {
    title: 'Search Database',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  }
}
```

**Destructive Tool (e.g., delete):**

```typescript
mcp: {
  annotations: {
    title: 'Delete File',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false
  }
}
```

**External API Tool (e.g., web search):**

```typescript
mcp: {
  annotations: {
    title: 'Web Search',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true  // Interacts with external world
  }
}
```

**Tool Type Classification**

The `toolType` field categorizes tools in the MCP playground:

- `'agent'`: Tool invokes a Mastra agent
- `'workflow'`: Tool invokes a Mastra workflow
- `undefined`: Regular function tool

Sources: [packages/core/src/tools/types.ts:110-186](), [packages/core/src/tools/tool.ts:145-167]()
