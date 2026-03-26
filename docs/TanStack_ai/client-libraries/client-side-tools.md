# Client-Side Tools

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [docs/api/ai.md](docs/api/ai.md)
- [docs/getting-started/overview.md](docs/getting-started/overview.md)
- [docs/guides/client-tools.md](docs/guides/client-tools.md)
- [docs/guides/server-tools.md](docs/guides/server-tools.md)
- [docs/guides/streaming.md](docs/guides/streaming.md)
- [docs/guides/tool-approval.md](docs/guides/tool-approval.md)
- [docs/guides/tool-architecture.md](docs/guides/tool-architecture.md)
- [docs/guides/tools.md](docs/guides/tools.md)
- [docs/protocol/chunk-definitions.md](docs/protocol/chunk-definitions.md)
- [docs/protocol/http-stream-protocol.md](docs/protocol/http-stream-protocol.md)
- [docs/protocol/sse-protocol.md](docs/protocol/sse-protocol.md)
- [examples/ts-react-chat/src/lib/model-selection.ts](examples/ts-react-chat/src/lib/model-selection.ts)
- [examples/ts-react-chat/src/routes/api.tanchat.ts](examples/ts-react-chat/src/routes/api.tanchat.ts)
- [packages/typescript/ai-anthropic/src/text/text-provider-options.ts](packages/typescript/ai-anthropic/src/text/text-provider-options.ts)
- [packages/typescript/ai-gemini/src/adapters/text.ts](packages/typescript/ai-gemini/src/adapters/text.ts)
- [packages/typescript/ai-gemini/src/model-meta.ts](packages/typescript/ai-gemini/src/model-meta.ts)
- [packages/typescript/ai-gemini/src/text/text-provider-options.ts](packages/typescript/ai-gemini/src/text/text-provider-options.ts)
- [packages/typescript/ai-gemini/tests/gemini-adapter.test.ts](packages/typescript/ai-gemini/tests/gemini-adapter.test.ts)
- [packages/typescript/ai-openai/live-tests/tool-test-empty-object.ts](packages/typescript/ai-openai/live-tests/tool-test-empty-object.ts)
- [packages/typescript/ai-openai/src/text/text-provider-options.ts](packages/typescript/ai-openai/src/text/text-provider-options.ts)
- [packages/typescript/ai/src/activities/chat/stream/processor.ts](packages/typescript/ai/src/activities/chat/stream/processor.ts)
- [packages/typescript/ai/src/types.ts](packages/typescript/ai/src/types.ts)

</details>

This document explains the client-side tool execution system in TanStack AI. Client tools are functions that execute in the browser to perform operations like UI updates, local storage access, and browser API interactions.

For information about server-side tool execution, see [Server Tools](#3.2). For the overall tool architecture and isomorphic tool definitions, see [Isomorphic Tool System](#3.2). For framework-agnostic state management, see [ChatClient](#4.1).

## Purpose and Scope

Client tools enable AI models to interact with browser-side functionality through a type-safe, framework-agnostic execution system. This document covers:

- Creating client tool implementations using `.client()`
- Automatic execution flow when the LLM calls client tools
- Type safety system via `clientTools()` and `InferChatMessages`
- Tool lifecycle states and state management
- Integration with React, Solid, Preact, Vue, and Svelte

## Client Tool Architecture

```mermaid
graph TB
    subgraph "Tool Definition Layer"
        DEF["toolDefinition()<br/>@tanstack/ai<br/>───────<br/>Shared schema:<br/>• name<br/>• inputSchema<br/>• outputSchema<br/>• needsApproval"]
    end

    subgraph "Client Implementation Layer"
        CLIENT_IMPL[".client(fn)<br/>───────<br/>Returns ClientTool<br/>with execute() function"]
        TOOLS_HELPER["clientTools()<br/>@tanstack/ai-client<br/>───────<br/>Creates typed array<br/>Enables discriminated unions"]
    end

    subgraph "Integration Layer"
        CHAT_OPTIONS["createChatClientOptions()<br/>───────<br/>connection: ConnectionAdapter<br/>tools: ClientTool[]"]

        REACT_HOOK["useChat()<br/>@tanstack/ai-react"]
        SOLID_HOOK["useChat()<br/>@tanstack/ai-solid"]
        PREACT_HOOK["useChat()<br/>@tanstack/ai-preact"]
        VUE_HOOK["useChat()<br/>@tanstack/ai-vue"]
    end

    subgraph "Execution Layer"
        CHAT_CLIENT["ChatClient<br/>@tanstack/ai-client<br/>───────<br/>Automatic tool execution<br/>State management"]
    end

    subgraph "Type System"
        INFER["InferChatMessages<T><br/>───────<br/>Extracts typed messages<br/>from options"]
        UI_MESSAGE["UIMessage<TTools><br/>───────<br/>parts: MessagePart[]"]
        TOOL_CALL_PART["ToolCallPart<TTools><br/>───────<br/>name: discriminated union<br/>input: typed from schema<br/>output: typed from schema"]
    end

    DEF -->|".client()"| CLIENT_IMPL
    CLIENT_IMPL --> TOOLS_HELPER
    TOOLS_HELPER --> CHAT_OPTIONS
    CHAT_OPTIONS --> REACT_HOOK
    CHAT_OPTIONS --> SOLID_HOOK
    CHAT_OPTIONS --> PREACT_HOOK
    CHAT_OPTIONS --> VUE_HOOK

    REACT_HOOK --> CHAT_CLIENT
    SOLID_HOOK --> CHAT_CLIENT
    PREACT_HOOK --> CHAT_CLIENT
    VUE_HOOK --> CHAT_CLIENT

    CHAT_OPTIONS --> INFER
    INFER --> UI_MESSAGE
    UI_MESSAGE --> TOOL_CALL_PART

    style DEF fill:#e1ffe1
    style CLIENT_IMPL fill:#ffe1e1
    style TOOLS_HELPER fill:#e1e1ff
    style CHAT_CLIENT fill:#fff4e1
```

**Title:** Client Tool Type Safety Architecture

**Sources:** [docs/guides/client-tools.md:1-330](), [docs/api/ai-client.md:180-237](), [packages/typescript/ai-preact/src/types.ts:1-99]()

## Execution Flow

```mermaid
sequenceDiagram
    participant LLM as "LLM Service"
    participant Server as "Server<br/>(/api/chat)"
    participant Adapter as "ConnectionAdapter<br/>(fetchServerSentEvents)"
    participant Client as "ChatClient<br/>@tanstack/ai-client"
    participant Tool as "ClientTool.execute()"
    participant UI as "Browser State<br/>(React/Solid/etc)"

    LLM->>Server: "StreamChunk<br/>{type: 'tool-call'<br/>name: 'updateUI'<br/>arguments: {...}}"
    Server->>Server: "Check tool.execute<br/>undefined = client tool"

    Note over Server: "No server execute()<br/>= client-side tool"

    Server->>Adapter: "SSE chunk:<br/>tool-input-available"
    Adapter->>Client: "StreamChunk object"
    Client->>Client: "Parse tool call<br/>Find matching tool<br/>by name"

    alt "Tool found in tools array"
        Client->>Tool: "execute(parsedInput)"
        Tool->>UI: "Update state<br/>localStorage<br/>DOM, etc"
        UI-->>Tool: "Return result"
        Tool-->>Client: "Tool output"
        Client->>Server: "POST tool result<br/>{toolCallId, output}"
        Server->>LLM: "tool_result message<br/>added to conversation"
        LLM-->>Server: "Continue response<br/>with tool context"
    else "Tool not found"
        Client->>Client: "Error: unknown tool"
    end
```

**Title:** Client Tool Automatic Execution Sequence

**Sources:** [docs/guides/client-tools.md:9-55](), [packages/typescript/ai-preact/src/use-chat.ts:39-68]()

## Creating Client Tool Implementations

### Step 1: Define Tool Schema

Tool definitions are shared between server and client using `toolDefinition()` from `@tanstack/ai`:

```typescript
// Defined in a shared location accessible to both server and client
const updateUIDef = toolDefinition({
  name: "update_ui",
  description: "Update the UI with new information",
  inputSchema: z.object({
    message: z.string(),
    type: z.enum(["success", "error", "info\
```
