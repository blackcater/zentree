# OpenAI Provider - Chat Completions API

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [content/providers/01-ai-sdk-providers/20-mistral.mdx](content/providers/01-ai-sdk-providers/20-mistral.mdx)
- [content/providers/01-ai-sdk-providers/25-cohere.mdx](content/providers/01-ai-sdk-providers/25-cohere.mdx)
- [packages/azure/CHANGELOG.md](packages/azure/CHANGELOG.md)
- [packages/azure/package.json](packages/azure/package.json)
- [packages/cohere/src/**snapshots**/cohere-embedding-model.test.ts.snap](packages/cohere/src/__snapshots__/cohere-embedding-model.test.ts.snap)
- [packages/cohere/src/cohere-chat-language-model.test.ts](packages/cohere/src/cohere-chat-language-model.test.ts)
- [packages/cohere/src/cohere-chat-language-model.ts](packages/cohere/src/cohere-chat-language-model.ts)
- [packages/cohere/src/cohere-embedding-model.test.ts](packages/cohere/src/cohere-embedding-model.test.ts)
- [packages/cohere/src/cohere-embedding-model.ts](packages/cohere/src/cohere-embedding-model.ts)
- [packages/cohere/src/cohere-embedding-options.ts](packages/cohere/src/cohere-embedding-options.ts)
- [packages/cohere/src/cohere-provider.ts](packages/cohere/src/cohere-provider.ts)
- [packages/mistral/CHANGELOG.md](packages/mistral/CHANGELOG.md)
- [packages/mistral/package.json](packages/mistral/package.json)
- [packages/mistral/src/mistral-chat-language-model.test.ts](packages/mistral/src/mistral-chat-language-model.test.ts)
- [packages/mistral/src/mistral-chat-language-model.ts](packages/mistral/src/mistral-chat-language-model.ts)
- [packages/mistral/src/mistral-chat-options.ts](packages/mistral/src/mistral-chat-options.ts)
- [packages/openai/CHANGELOG.md](packages/openai/CHANGELOG.md)
- [packages/openai/package.json](packages/openai/package.json)
- [packages/provider-utils/CHANGELOG.md](packages/provider-utils/CHANGELOG.md)
- [packages/provider-utils/package.json](packages/provider-utils/package.json)

</details>

This document describes the **OpenAIChatLanguageModel** implementation in the `@ai-sdk/openai` package, which uses OpenAI's standard Chat Completions API endpoint (`/v1/chat/completions`). This is the traditional OpenAI API that has been available since the introduction of ChatGPT.

For information about the newer Responses API implementation with provider-defined tools and reasoning models, see [OpenAI Provider - Responses API](#3.2). For general OpenAI provider configuration and setup, both APIs share the same provider instance creation.

**Scope**: This page covers the `OpenAIChatLanguageModel` class, its request/response handling, function calling (OpenAI's term for tool usage), parallel tool calls, legacy JSON mode, and the differences from the Responses API implementation.

---

## Architecture Overview

The Chat Completions API implementation follows the Provider-V3 specification through the `OpenAIChatLanguageModel` class, which implements the `LanguageModelV3` interface.

### OpenAIChatLanguageModel Class Structure

```mermaid
graph TB
    subgraph "Provider V3 Specification"
        LMV3[LanguageModelV3 Interface]
        LMV3_doGen["doGenerate()"]
        LMV3_doStr["doStream()"]
    end

    subgraph "OpenAI Chat Implementation"
        OCL[OpenAIChatLanguageModel]
        OCL_model["modelId: string"]
        OCL_config["config: OpenAIChatConfig"]
        OCL_gen["doGenerate()"]
        OCL_str["doStream()"]
        OCL_getArgs["getArgs()"]
    end

    subgraph "API Communication"
        ENDPOINT["/v1/chat/completions"]
        postJson["postJsonToApi()"]
        createJson["createJsonResponseHandler()"]
        createSSE["createEventSourceResponseHandler()"]
    end

    subgraph "Conversion Utilities"
        convertPrompt["convertToOpenAIChatMessages()"]
        convertTools["prepareTools()"]
        convertUsage["convertOpenAIUsage()"]
        mapFinish["mapOpenAIFinishReason()"]
    end

    LMV3 --> OCL
    LMV3_doGen --> OCL_gen
    LMV3_doStr --> OCL_str

    OCL_gen --> OCL_getArgs
    OCL_str --> OCL_getArgs

    OCL_getArgs --> convertPrompt
    OCL_getArgs --> convertTools

    OCL_gen --> postJson
    OCL_str --> postJson

    postJson --> ENDPOINT
    postJson --> createJson
    postJson --> createSSE

    OCL_gen --> convertUsage
    OCL_gen --> mapFinish
```

**Diagram: OpenAIChatLanguageModel implements LanguageModelV3 and delegates to OpenAI's chat completions endpoint**

**Sources**: [packages/openai/package.json:1-85](), [packages/openai/CHANGELOG.md:1-100]()

---

## Request and Response Flow

### Non-Streaming Generation (doGenerate)

The `doGenerate` method converts the AI SDK prompt format to OpenAI's chat completions format, sends the request, and parses the response.

```mermaid
sequenceDiagram
    participant App as Application Code
    participant OCL as OpenAIChatLanguageModel
    participant Conv as Conversion Utilities
    participant API as OpenAI API<br/>/v1/chat/completions

    App->>OCL: doGenerate(options)
    OCL->>OCL: getArgs(options)
    OCL->>Conv: convertToOpenAIChatMessages(prompt)
    Conv-->>OCL: OpenAI messages array
    OCL->>Conv: prepareTools(tools, toolChoice)
    Conv-->>OCL: OpenAI tools + tool_choice

    OCL->>API: POST chat/completions<br/>{model, messages, tools, temperature, ...}
    API-->>OCL: {id, choices, usage, ...}

    OCL->>Conv: convertOpenAIUsage(usage)
    Conv-->>OCL: Unified usage format
    OCL->>Conv: mapOpenAIFinishReason(finish_reason)
    Conv-->>OCL: Unified finish reason

    OCL->>OCL: Extract content from choice.message
    OCL->>OCL: Extract function_calls as tool-calls
    OCL-->>App: LanguageModelV3GenerateResult
```

**Diagram: Non-streaming request/response flow for OpenAIChatLanguageModel**

The response contains a single `choices` array with the assistant's message, which may include:

- `content` (text)
- `function_call` (legacy single tool call)
- `tool_calls` (parallel tool calls)

**Sources**: [packages/openai/CHANGELOG.md:38-100](), [packages/mistral/src/mistral-chat-language-model.ts:175-255]()

---

### Streaming Generation (doStream)

Streaming uses Server-Sent Events (SSE) to receive incremental updates, enabling real-time UI updates as the model generates content.

```mermaid
sequenceDiagram
    participant App as Application Code
    participant OCL as OpenAIChatLanguageModel
    participant Stream as TransformStream
    participant API as OpenAI API<br/>SSE Stream

    App->>OCL: doStream(options)
    OCL->>OCL: getArgs(options)
    OCL->>API: POST chat/completions<br/>{...args, stream: true}

    API-->>OCL: SSE stream starts
    OCL->>Stream: Create TransformStream
    OCL-->>App: Return stream

    loop For each SSE chunk
        API-->>Stream: delta chunk
        Stream->>Stream: Parse SSE event

        alt Text delta
            Stream->>Stream: Accumulate text
            Stream-->>App: text-delta event
        else Function call delta
            Stream->>Stream: Accumulate args
            Stream-->>App: tool-call-delta event
        else Stream end
            Stream->>Stream: Emit final usage
            Stream-->>App: stream-finish event
        end
    end
```

**Diagram: Server-Sent Events streaming flow for incremental response generation**

Streaming chunks include:

- `delta.content` for text increments
- `delta.function_call` or `delta.tool_calls` for tool call increments
- Final chunk with `finish_reason` and `usage`

**Sources**: [packages/mistral/src/mistral-chat-language-model.ts:257-450](), [packages/openai/CHANGELOG.md:1-100]()

---

## Function Calling vs Tool Calling

OpenAI uses the term "function calling" for what the AI SDK calls "tool usage". The Chat Completions API supports two formats:

### Legacy Function Call Format

```mermaid
graph LR
    subgraph "AI SDK Format"
        SDK_tool["Tool Definition<br/>{type: 'function',<br/>name, inputSchema}"]
        SDK_call["Tool Call Content<br/>{type: 'tool-call',<br/>toolCallId, toolName, input}"]
    end

    subgraph "OpenAI Legacy Format"
        OAI_func["Function Definition<br/>{type: 'function',<br/>function: {name, parameters}}"]
        OAI_call["Function Call<br/>{name, arguments}"]
    end

    SDK_tool -->|"prepareTools()"| OAI_func
    OAI_call -->|"Parse response"| SDK_call
```

**Diagram: Legacy single function call format (deprecated)**

### Modern Tool Calls Format (Parallel)

```mermaid
graph TB
    subgraph "AI SDK Format"
        SDK_tools["tools: Array<br/>{type: 'function',<br/>name, inputSchema}>"]
        SDK_choice["toolChoice:<br/>{type: 'required'} |<br/>{type: 'tool', toolName}"]
        SDK_calls["content: Array<br/>{type: 'tool-call',<br/>toolCallId, toolName, input}>"]
    end

    subgraph "OpenAI Chat Format"
        OAI_tools["tools: Array<br/>{type: 'function',<br/>function: {...}}>"]
        OAI_choice["tool_choice:<br/>'required' | 'auto' |<br/>{type: 'function', function: {name}}"]
        OAI_calls["tool_calls: Array<br/>{id, type: 'function',<br/>function: {name, arguments}}>"]
    end

    SDK_tools -->|"prepareTools()"| OAI_tools
    SDK_choice -->|"map toolChoice"| OAI_choice
    OAI_calls -->|"Parse + convert"| SDK_calls
```

**Diagram: Modern parallel tool calls format with multiple simultaneous function invocations**

The parallel tool calls format allows the model to invoke multiple tools in a single response, improving efficiency for complex multi-step operations.

**Sources**: [packages/openai/CHANGELOG.md:1-100](), [packages/mistral/src/mistral-prepare-tools.ts:1-150]()

---

## Structured Outputs and JSON Mode

### Legacy JSON Mode

The Chat Completions API supports a legacy JSON mode via `response_format: { type: 'json_object' }`, which instructs the model to output valid JSON without schema enforcement:

| Feature                | Chat Completions JSON Mode                        | Responses API Structured Output        |
| ---------------------- | ------------------------------------------------- | -------------------------------------- |
| **Endpoint Parameter** | `response_format.type = 'json_object'`            | `response_format.type = 'json_schema'` |
| **Schema Enforcement** | None (model best-effort)                          | Strict schema validation               |
| **Provider Support**   | Chat Completions only                             | Responses API only                     |
| **SDK Integration**    | Via `responseFormat.type = 'json'` without schema | Automatic when schema provided         |

**Table: Comparison of JSON output modes in OpenAI APIs**

When using `Output.json()` or `Output.object()` without strict mode, the Chat Completions API uses the legacy JSON mode:

```mermaid
graph LR
    subgraph "AI SDK Call"
        APP["generateText({<br/>output: Output.object({schema})<br/>})"]
    end

    subgraph "OpenAIChatLanguageModel"
        CHECK{"Schema<br/>provided?"}
        LEGACY["response_format:<br/>{type: 'json_object'}"]
        INSTRUCTION["Inject JSON instruction<br/>into system message"]
    end

    subgraph "OpenAI API"
        ENDPOINT["/v1/chat/completions"]
        RESPONSE["Best-effort JSON<br/>(not schema-validated)"]
    end

    APP --> CHECK
    CHECK -->|Yes| LEGACY
    CHECK -->|Yes| INSTRUCTION
    LEGACY --> ENDPOINT
    INSTRUCTION --> ENDPOINT
    ENDPOINT --> RESPONSE
```

**Diagram: Legacy JSON mode flow with instruction injection for best-effort JSON output**

The SDK injects additional instructions into the prompt to guide the model toward the desired schema, but the API does not enforce it.

**Sources**: [packages/openai/CHANGELOG.md:89-100](), [packages/mistral/src/mistral-chat-language-model.ts:109-114]()

---

## Request Body Structure

The `getArgs()` method constructs the request body sent to the chat completions endpoint:

| Parameter             | AI SDK Source       | OpenAI Parameter    | Notes                                         |
| --------------------- | ------------------- | ------------------- | --------------------------------------------- |
| **model**             | Constructor modelId | `model`             | e.g., "gpt-4o", "gpt-3.5-turbo"               |
| **messages**          | `prompt`            | `messages`          | Converted via `convertToOpenAIChatMessages()` |
| **max_tokens**        | `maxOutputTokens`   | `max_tokens`        | Maximum tokens to generate                    |
| **temperature**       | `temperature`       | `temperature`       | 0.0 to 2.0                                    |
| **top_p**             | `topP`              | `top_p`             | Nucleus sampling                              |
| **frequency_penalty** | `frequencyPenalty`  | `frequency_penalty` | -2.0 to 2.0                                   |
| **presence_penalty**  | `presencePenalty`   | `presence_penalty`  | -2.0 to 2.0                                   |
| **stop**              | `stopSequences`     | `stop`              | Up to 4 sequences                             |
| **seed**              | `seed`              | `seed`              | Deterministic sampling                        |
| **tools**             | `tools`             | `tools`             | Function definitions                          |
| **tool_choice**       | `toolChoice`        | `tool_choice`       | auto/required/none/specific                   |
| **response_format**   | `responseFormat`    | `response_format`   | JSON mode configuration                       |

**Table: Mapping of AI SDK call options to OpenAI Chat Completions API parameters**

Additional provider-specific options can be passed via `providerOptions.openai`:

```typescript
// From OpenAIChatLanguageModelOptions type
providerOptions: {
  openai: {
    user: 'user-identifier',           // User tracking
    logprobs: true,                     // Return log probabilities
    top_logprobs: 5,                    // Number of top tokens
    logit_bias: { '1234': -100 },      // Token bias adjustments
    parallel_tool_calls: false,         // Disable parallel tools
  }
}
```

**Sources**: [packages/openai/CHANGELOG.md:387-401](), [packages/mistral/src/mistral-chat-language-model.ts:64-173]()

---

## Response Metadata and Usage

### Usage Tracking

The Chat Completions API returns token usage in the response, which the SDK converts to a unified format:

```mermaid
graph LR
    subgraph "OpenAI Response"
        OAI_usage["usage: {<br/>prompt_tokens,<br/>completion_tokens,<br/>total_tokens<br/>}"]
    end

    subgraph "AI SDK Unified Format"
        SDK_usage["usage: {<br/>inputTokens: {total, noCache},<br/>outputTokens: {total, text},<br/>raw<br/>}"]
    end

    OAI_usage -->|"convertOpenAIUsage()"| SDK_usage
```

**Diagram: Token usage conversion from OpenAI format to unified AI SDK format**

The unified format distinguishes between input and output tokens, with support for caching metadata in Responses API models.

### Response Metadata

The `response` object in the result contains:

| Field       | Description                                   |
| ----------- | --------------------------------------------- |
| `id`        | Unique completion ID from OpenAI              |
| `model`     | Actual model used (may differ from requested) |
| `timestamp` | Response creation timestamp                   |
| `headers`   | Raw HTTP response headers                     |
| `body`      | Raw response body for debugging               |

**Table: Response metadata fields available in LanguageModelV3GenerateResult**

**Sources**: [packages/mistral/src/convert-mistral-usage.ts:1-50](), [packages/cohere/src/convert-cohere-usage.ts:1-30]()

---

## Differences from Responses API

The Chat Completions API and Responses API serve different use cases:

| Feature                    | Chat Completions API      | Responses API                                               |
| -------------------------- | ------------------------- | ----------------------------------------------------------- |
| **Endpoint**               | `/v1/chat/completions`    | `/v1/responses`                                             |
| **Model Class**            | `OpenAIChatLanguageModel` | `OpenAIResponsesLanguageModel`                              |
| **Tool Terminology**       | Function calling          | Tool usage                                                  |
| **Provider-Defined Tools** | Not supported             | Supported (web_search, file_search, code_interpreter, etc.) |
| **Reasoning Models**       | Limited                   | Full support (o1, o3, gpt-5 series)                         |
| **Structured Outputs**     | Legacy JSON mode          | Strict schema validation                                    |
| **Store/ConversationID**   | Not available             | Available for conversation persistence                      |
| **Phase Metadata**         | Not available             | Available (commentary/final_answer)                         |
| **Multi-turn Reasoning**   | Manual implementation     | Automatic with encrypted_content                            |

**Table: Key differences between Chat Completions and Responses API implementations**

The Chat Completions API is suitable for:

- Standard chat applications
- Legacy codebases using function calling
- Models without reasoning capabilities (gpt-3.5-turbo, gpt-4, etc.)

The Responses API should be used for:

- Reasoning models (o1, o3, gpt-5 series)
- Provider-defined tools (web search, code execution)
- Advanced features like conversation storage

**Sources**: [packages/openai/CHANGELOG.md:1-500](), [packages/azure/CHANGELOG.md:1-100]()

---

## Error Handling and Finish Reasons

### Finish Reason Mapping

The Chat Completions API uses different finish reason strings than the unified AI SDK format:

```mermaid
graph TB
    subgraph "OpenAI Finish Reasons"
        STOP["stop"]
        LENGTH["length"]
        TOOL["tool_calls"]
        CONTENT["content_filter"]
        OTHER["null/other"]
    end

    subgraph "Unified AI SDK Format"
        U_STOP["unified: 'stop'"]
        U_LENGTH["unified: 'length'"]
        U_TOOL["unified: 'tool-calls'"]
        U_FILTER["unified: 'content-filter'"]
        U_OTHER["unified: 'other'"]
    end

    STOP -->|"mapOpenAIFinishReason()"| U_STOP
    LENGTH --> U_LENGTH
    TOOL --> U_TOOL
    CONTENT --> U_FILTER
    OTHER --> U_OTHER
```

**Diagram: Finish reason normalization from OpenAI to unified format**

The raw finish reason is always available via `finishReason.raw` for provider-specific handling.

### Error Responses

Chat Completions API errors are handled via `mistralFailedResponseHandler` (shared pattern across providers):

| HTTP Status | Error Type      | Common Cause                        |
| ----------- | --------------- | ----------------------------------- |
| 400         | Invalid Request | Malformed parameters, invalid model |
| 401         | Unauthorized    | Invalid API key                     |
| 403         | Forbidden       | Insufficient permissions            |
| 404         | Not Found       | Invalid model or endpoint           |
| 429         | Rate Limited    | Quota exceeded                      |
| 500         | Server Error    | OpenAI service issue                |

**Table: Common HTTP error statuses from OpenAI Chat Completions API**

**Sources**: [packages/mistral/src/map-mistral-finish-reason.ts:1-50](), [packages/openai/CHANGELOG.md:1-100]()

---

## Headers and Authentication

### Request Headers

The provider sends the following headers with each request:

| Header          | Value                      | Purpose              |
| --------------- | -------------------------- | -------------------- |
| `Authorization` | `Bearer ${apiKey}`         | API authentication   |
| `Content-Type`  | `application/json`         | JSON request body    |
| `User-Agent`    | `ai-sdk/openai/${VERSION}` | SDK version tracking |
| Custom headers  | From provider config       | Additional metadata  |

**Table: Standard and custom headers sent with Chat Completions requests**

Headers can be customized at provider creation or per-request:

```typescript
// Provider-level headers
const openai = createOpenAI({
  headers: { 'X-Custom-Header': 'value' },
})

// Request-level headers
await generateText({
  model: openai.chat('gpt-4o'),
  headers: { 'X-Request-ID': 'abc123' },
})
```

**Sources**: [packages/mistral/src/mistral-chat-language-model.test.ts:156-184](), [packages/openai/package.json:1-85]()

---

## Streaming Tool Calls Security

A recent security fix addresses premature tool call finalization during streaming:

```mermaid
sequenceDiagram
    participant Stream as SSE Stream
    participant Parser as Chunk Parser
    participant Accumulator as Args Accumulator
    participant Validator as JSON Validator

    Stream->>Parser: delta.tool_calls[0].function.arguments: "{"
    Parser->>Accumulator: Append "{"
    Accumulator->>Validator: isParsableJson("{")?
    Note over Validator: Before fix: true → EXECUTE ❌<br/>After fix: wait for flush ✓

    Stream->>Parser: delta.tool_calls[0].function.arguments: "value"
    Parser->>Accumulator: Append "value"
    Accumulator->>Validator: isParsableJson("{value")?
    Note over Validator: false → continue accumulating

    Stream->>Parser: delta.tool_calls[0].function.arguments: "': 'data'}"
    Parser->>Accumulator: Append "': 'data'}"
    Accumulator->>Validator: Complete in flush()
    Note over Validator: Final JSON: {"value": "data"}
    Validator-->>Stream: Execute tool with complete args ✓
```

**Diagram: Streaming tool call argument accumulation with security fix**

The fix ensures tool calls only execute after the stream is fully consumed, preventing execution with incomplete arguments if partial JSON happens to be valid.

**Sources**: [packages/openai/CHANGELOG.md:7-9]()
