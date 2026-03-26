# Tool System

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

This document describes the isomorphic tool system in TanStack AI, which enables AI models to execute functions on the server or client with full type safety. The tool system provides a unified API for defining tools once and implementing them for different execution contexts (server-side, client-side, or both).

For information about the server-side chat engine that orchestrates tool execution, see [chat() Function and ChatEngine](#3.1). For details on streaming protocols that transmit tool-related chunks, see [StreamChunk Types](#5.3).

---

## Overview

The tool system consists of three main components:

1. **Tool Definitions** (`toolDefinition()`) - Declare tool schema, inputs, and outputs
2. **Tool Implementations** (`.server()` or `.client()`) - Provide execution logic for specific environments
3. **Tool Execution** - Automatic execution coordinated by the server or client

Tools enable AI models to interact with external systems, databases, APIs, browser storage, UI state, and more. The isomorphic architecture allows a single tool definition to be implemented for server-side execution, client-side execution, or both.

**Sources:** [docs/guides/tools.md:1-241](), [docs/guides/tool-architecture.md:1-386](), [docs/getting-started/overview.md:26-47]()

---

## Tool Definition API

### Creating Tool Definitions

Tools are created using `toolDefinition()` from `@tanstack/ai`:

```typescript
toolDefinition({
  name: string,              // Unique tool identifier
  description: string,       // Description for the AI model
  inputSchema: ZodSchema,    // Zod schema for input validation
  outputSchema?: ZodSchema,  // Zod schema for output validation
  needsApproval?: boolean,   // Requires user approval before execution
  metadata?: any             // Optional metadata
})
```

The function returns a `ToolDefinition` object with two methods:

- `.server(execute)` - Create server implementation
- `.client(execute)` - Create client implementation

**Sources:** [docs/api/ai.md:101-158](), [docs/guides/tools.md:39-75]()

### Example Tool Definition

```typescript
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";

const getWeatherDef = toolDefinition({
  name: "get_weather",
  description: "Get the current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
    unit: z.enum(["celsius", "fahrenheit\
```
