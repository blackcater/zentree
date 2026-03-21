# Provider Ecosystem

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.changeset/pre.json](.changeset/pre.json)
- [examples/express/package.json](examples/express/package.json)
- [examples/fastify/package.json](examples/fastify/package.json)
- [examples/hono/package.json](examples/hono/package.json)
- [examples/nest/package.json](examples/nest/package.json)
- [examples/next-fastapi/package.json](examples/next-fastapi/package.json)
- [examples/next-google-vertex/package.json](examples/next-google-vertex/package.json)
- [examples/next-langchain/package.json](examples/next-langchain/package.json)
- [examples/next-openai-kasada-bot-protection/package.json](examples/next-openai-kasada-bot-protection/package.json)
- [examples/next-openai-pages/package.json](examples/next-openai-pages/package.json)
- [examples/next-openai-telemetry-sentry/package.json](examples/next-openai-telemetry-sentry/package.json)
- [examples/next-openai-telemetry/package.json](examples/next-openai-telemetry/package.json)
- [examples/next-openai-upstash-rate-limits/package.json](examples/next-openai-upstash-rate-limits/package.json)
- [examples/node-http-server/package.json](examples/node-http-server/package.json)
- [examples/nuxt-openai/package.json](examples/nuxt-openai/package.json)
- [examples/sveltekit-openai/package.json](examples/sveltekit-openai/package.json)
- [packages/amazon-bedrock/CHANGELOG.md](packages/amazon-bedrock/CHANGELOG.md)
- [packages/amazon-bedrock/package.json](packages/amazon-bedrock/package.json)
- [packages/anthropic/CHANGELOG.md](packages/anthropic/CHANGELOG.md)
- [packages/anthropic/package.json](packages/anthropic/package.json)
- [packages/azure/CHANGELOG.md](packages/azure/CHANGELOG.md)
- [packages/azure/package.json](packages/azure/package.json)
- [packages/google-vertex/CHANGELOG.md](packages/google-vertex/CHANGELOG.md)
- [packages/google-vertex/package.json](packages/google-vertex/package.json)
- [packages/google/CHANGELOG.md](packages/google/CHANGELOG.md)
- [packages/google/package.json](packages/google/package.json)
- [packages/mistral/CHANGELOG.md](packages/mistral/CHANGELOG.md)
- [packages/mistral/package.json](packages/mistral/package.json)
- [packages/openai/CHANGELOG.md](packages/openai/CHANGELOG.md)
- [packages/openai/package.json](packages/openai/package.json)
- [packages/provider-utils/CHANGELOG.md](packages/provider-utils/CHANGELOG.md)
- [packages/provider-utils/package.json](packages/provider-utils/package.json)
- [pnpm-lock.yaml](pnpm-lock.yaml)

</details>



The Provider Ecosystem encompasses the 25+ AI provider integration packages that implement the unified provider interface specification, enabling seamless switching between different AI services. This page covers the provider abstraction layer, package organization, major commercial providers, cloud platform adapters, open-source alternatives, and specialized model providers.

For detailed information about the provider interface specification and how providers implement it, see [Provider Architecture and V3 Specification](#3.1). For specific provider implementations and features, see sections [3.2](#3.2) through [3.9](#3.9).

## Provider Package Organization

The provider ecosystem is structured as a collection of independent npm packages under the `@ai-sdk/` scope, each implementing the provider interface specification from `@ai-sdk/provider`.

### Package Structure Overview

```mermaid
graph TB
    subgraph "Foundation Packages"
        PROVIDER["@ai-sdk/provider<br/>v3.0.0-beta.26<br/>LanguageModelV3<br/>EmbeddingModelV3<br/>ImageModelV3<br/>ProviderV3"]
        PROVIDER_UTILS["@ai-sdk/provider-utils<br/>v4.0.0-beta.50<br/>createEventSourceResponseHandler()<br/>postJsonToApi()<br/>convertZodToJSONSchema()"]
    end
    
    subgraph "Major Commercial Providers"
        OPENAI["@ai-sdk/openai<br/>v3.0.0-beta.99<br/>OpenAIChatLanguageModel<br/>OpenAIResponsesLanguageModel<br/>OpenAIEmbeddingModel"]
        ANTHROPIC["@ai-sdk/anthropic<br/>v3.0.0-beta.86<br/>AnthropicMessagesLanguageModel"]
        GOOGLE["@ai-sdk/google<br/>v3.0.0-beta.75<br/>GoogleGenerativeAILanguageModel<br/>GoogleGenerativeAIEmbeddingModel"]
        MISTRAL["@ai-sdk/mistral<br/>v3.0.0-beta.52<br/>MistralChatLanguageModel"]
        COHERE["@ai-sdk/cohere<br/>v3.0.0-beta.51<br/>CohereChatLanguageModel"]
    end
    
    subgraph "Cloud Platform Providers (Delegation)"
        AZURE["@ai-sdk/azure<br/>v3.0.0-beta.101<br/>Wraps OpenAI"]
        BEDROCK["@ai-sdk/amazon-bedrock<br/>v4.0.0-beta.96<br/>Wraps Anthropic"]
        VERTEX["@ai-sdk/google-vertex<br/>v4.0.0-beta.117<br/>Composes Google + Anthropic"]
    end
    
    subgraph "OpenAI-Compatible Providers"
        COMPAT["@ai-sdk/openai-compatible<br/>Base implementation"]
        XAI["@ai-sdk/xai<br/>v3.0.0-beta.58"]
        DEEPSEEK["@ai-sdk/deepseek<br/>v2.0.0-beta.53"]
        GROQ["@ai-sdk/groq<br/>v3.0.0-beta.53"]
        FIREWORKS["@ai-sdk/fireworks<br/>v2.0.0-beta.51"]
        TOGETHER["@ai-sdk/togetherai"]
        CEREBRAS["@ai-sdk/cerebras"]
    end
    
    subgraph "Specialized Model Providers"
        ELEVENLABS["@ai-sdk/elevenlabs<br/>SpeechModelV3"]
        DEEPGRAM["@ai-sdk/deepgram<br/>TranscriptionModelV3"]
        BFL["@ai-sdk/black-forest-labs<br/>ImageModelV3"]
        FAL["@ai-sdk/fal<br/>ImageModelV3"]
        LUMA["@ai-sdk/luma<br/>ImageModelV3"]
        REPLICATE["@ai-sdk/replicate<br/>ImageModelV3"]
    end
    
    PROVIDER --> OPENAI
    PROVIDER --> ANTHROPIC
    PROVIDER --> GOOGLE
    PROVIDER --> MISTRAL
    PROVIDER --> COHERE
    
    PROVIDER_UTILS --> OPENAI
    PROVIDER_UTILS --> ANTHROPIC
    PROVIDER_UTILS --> GOOGLE
    PROVIDER_UTILS --> MISTRAL
    PROVIDER_UTILS --> COHERE
    
    OPENAI --> AZURE
    ANTHROPIC --> BEDROCK
    GOOGLE --> VERTEX
    ANTHROPIC --> VERTEX
    
    PROVIDER --> COMPAT
    COMPAT --> XAI
    COMPAT --> DEEPSEEK
    COMPAT --> GROQ
    COMPAT --> FIREWORKS
    COMPAT --> TOGETHER
    COMPAT --> CEREBRAS
    
    PROVIDER --> ELEVENLABS
    PROVIDER --> DEEPGRAM
    PROVIDER --> BFL
    PROVIDER --> FAL
    PROVIDER --> LUMA
    PROVIDER --> REPLICATE
```

**Diagram: Provider Package Hierarchy and Dependencies**

Sources: [packages/openai/package.json:1-74](), [packages/anthropic/package.json:1-74](), [packages/google/package.json:1-74](), [packages/mistral/package.json:1-67](), [packages/azure/package.json:1-68](), [packages/amazon-bedrock/package.json:1-71](), [packages/google-vertex/package.json:1-88](), [examples/ai-core/package.json:5-56]()

### Provider Package Dependencies

All provider packages depend on `@ai-sdk/provider` for interface definitions and `@ai-sdk/provider-utils` for shared functionality:

| Package | Version | Dependencies | Purpose |
|---------|---------|--------------|---------|
| `@ai-sdk/provider` | 3.0.0-beta.26 | None | Interface specification |
| `@ai-sdk/provider-utils` | 4.0.0-beta.50 | `@ai-sdk/provider`, `eventsource-parser` | Streaming, schema conversion |
| `@ai-sdk/openai` | 3.0.0-beta.99 | `@ai-sdk/provider`, `@ai-sdk/provider-utils` | OpenAI implementation |
| `@ai-sdk/anthropic` | 3.0.0-beta.86 | `@ai-sdk/provider`, `@ai-sdk/provider-utils` | Anthropic implementation |
| `@ai-sdk/google` | 3.0.0-beta.75 | `@ai-sdk/provider`, `@ai-sdk/provider-utils` | Google implementation |
| `@ai-sdk/azure` | 3.0.0-beta.101 | `@ai-sdk/openai`, `@ai-sdk/provider`, `@ai-sdk/provider-utils` | Azure wrapper |
| `@ai-sdk/amazon-bedrock` | 4.0.0-beta.96 | `@ai-sdk/anthropic`, `@ai-sdk/provider`, `@ai-sdk/provider-utils`, `aws4fetch`, `@smithy/eventstream-codec` | Bedrock wrapper |
| `@ai-sdk/google-vertex` | 4.0.0-beta.117 | `@ai-sdk/google`, `@ai-sdk/anthropic`, `@ai-sdk/provider`, `@ai-sdk/provider-utils`, `google-auth-library` | Vertex multi-model |

Sources: [packages/provider-utils/package.json:1-93](), [packages/openai/package.json:42-45](), [packages/anthropic/package.json:42-44](), [packages/azure/package.json:35-38](), [packages/amazon-bedrock/package.json:35-41](), [packages/google-vertex/package.json:53-58]()

## Provider Abstraction Layer

The provider abstraction layer is defined by three primary interfaces in `@ai-sdk/provider`:

### Core Model Interfaces

```mermaid
graph TB
    subgraph "Model Interface Specifications"
        LMV3["LanguageModelV3<br/>specificationVersion: 'v3'<br/>provider: string<br/>modelId: string<br/>doGenerate()<br/>doStream()"]
        
        EMV3["EmbeddingModelV3<br/>specificationVersion: 'v3'<br/>provider: string<br/>modelId: string<br/>doEmbed()"]
        
        IMV3["ImageModelV3<br/>specificationVersion: 'v3'<br/>provider: string<br/>modelId: string<br/>doGenerate()"]
    end
    
    subgraph "OpenAI Implementation"
        OPENAI_CHAT["OpenAIChatLanguageModel<br/>implements LanguageModelV3"]
        OPENAI_RESP["OpenAIResponsesLanguageModel<br/>implements LanguageModelV3"]
        OPENAI_EMB["OpenAIEmbeddingModel<br/>implements EmbeddingModelV3"]
        OPENAI_IMG["OpenAIImageModel<br/>implements ImageModelV3"]
    end
    
    subgraph "Anthropic Implementation"
        ANTH_MSG["AnthropicMessagesLanguageModel<br/>implements LanguageModelV3"]
    end
    
    subgraph "Google Implementation"
        GOOGLE_CHAT["GoogleGenerativeAILanguageModel<br/>implements LanguageModelV3"]
        GOOGLE_EMB["GoogleGenerativeAIEmbeddingModel<br/>implements EmbeddingModelV3"]
    end
    
    LMV3 --> OPENAI_CHAT
    LMV3 --> OPENAI_RESP
    EMV3 --> OPENAI_EMB
    IMV3 --> OPENAI_IMG
    
    LMV3 --> ANTH_MSG
    
    LMV3 --> GOOGLE_CHAT
    EMV3 --> GOOGLE_EMB
```

**Diagram: Provider Interface Implementation Classes**

Sources: [packages/openai/package.json:1-74](), [packages/anthropic/package.json:1-74](), [packages/google/package.json:1-74]()

### Shared Utilities from provider-utils

The `@ai-sdk/provider-utils` package provides common functionality used across all providers:

| Utility | Purpose | Used By |
|---------|---------|---------|
| `createEventSourceResponseHandler()` | Parse SSE streams | All streaming providers |
| `parseJSON()` | JSON parsing with error handling | All providers |
| `postJsonToApi()` | HTTP POST with JSON | All providers |
| `combineHeaders()` | Header normalization | All providers |
| `convertJSONSchemaToOpenAPISchema()` | Schema conversion | OpenAI, Mistral, Azure |
| `convertZodToJSONSchema()` | Zod to JSON Schema | All providers with tools |
| `InvalidResponseDataError` | Error handling | All providers |
| `AsyncIterableStream` | Stream utilities | All streaming providers |

Sources: [packages/provider-utils/package.json:28-40](), [packages/openai/CHANGELOG.md:310-312](), [packages/anthropic/CHANGELOG.md:244-245]()

## Major Commercial Providers

### OpenAI Provider Family

The OpenAI provider family includes direct OpenAI integration and Azure OpenAI wrapper:

```mermaid
graph LR
    subgraph "OpenAI Package Structure"
        OPENAI_PKG["@ai-sdk/openai<br/>v3.0.0-beta.99"]
        
        subgraph "Implementation Classes"
            OPENAI_FUNC["openai()<br/>Factory function"]
            CHAT_MODEL["OpenAIChatLanguageModel<br/>Chat Completions API"]
            RESP_MODEL["OpenAIResponsesLanguageModel<br/>Responses API (default)"]
            EMB_MODEL["OpenAIEmbeddingModel<br/>text-embedding-3-small/large"]
            IMG_MODEL["OpenAIImageModel<br/>DALL-E 3"]
        end
        
        subgraph "Model IDs"
            GPT52["gpt-5.2-pro<br/>gpt-5.2-chat-latest<br/>gpt-5.2"]
            GPT51["gpt-5.1-codex<br/>gpt-5.1"]
            GPT5["gpt-5<br/>gpt-5-mini<br/>gpt-5-nano"]
            GPT4O["gpt-4o<br/>gpt-4o-mini"]
            O4["o4-mini"]
            O3["o3-mini<br/>o3-deep-research"]
        end
        
        subgraph "Provider Tools (Responses API)"
            WEB_SEARCH["web_search<br/>Search web"]
            CODE_INTERP["code_interpreter<br/>Python execution"]
            FILE_SEARCH["file_search<br/>Vector stores"]
            IMAGE_GEN["image_generation<br/>DALL-E"]
            SHELL["shell<br/>Command execution"]
            APPLY_PATCH["apply_patch<br/>Code editing"]
            MCP["mcp<br/>Model Context Protocol"]
        end
    end
    
    OPENAI_FUNC --> CHAT_MODEL
    OPENAI_FUNC --> RESP_MODEL
    OPENAI_FUNC --> EMB_MODEL
    OPENAI_FUNC --> IMG_MODEL
    
    CHAT_MODEL --> GPT4O
    RESP_MODEL --> GPT52
    RESP_MODEL --> GPT51
    RESP_MODEL --> GPT5
    RESP_MODEL --> O4
    RESP_MODEL --> O3
    
    RESP_MODEL --> WEB_SEARCH
    RESP_MODEL --> CODE_INTERP
    RESP_MODEL --> FILE_SEARCH
    RESP_MODEL --> IMAGE_GEN
    RESP_MODEL --> SHELL
    RESP_MODEL --> APPLY_PATCH
    RESP_MODEL --> MCP
```

**Diagram: OpenAI Provider Structure and Model Support**

**Key Features:**
- **Responses API (Default since v3.0)**: Provider-executed tools via `OpenAIResponsesLanguageModel`
- **Chat Completions API**: Legacy API via `OpenAIChatLanguageModel`
- **Reasoning Models**: Support for `o3-mini`, `o4-mini`, `o3-deep-research` with extended thinking and `reasoning_effort` setting
- **GPT-5 Series**: Latest models including `gpt-5.2-pro`, `gpt-5.1-codex`, and base `gpt-5` models
- **Provider-Defined Tools**: 7 built-in tools executed by OpenAI (web_search, code_interpreter, file_search, image_generation, shell, apply_patch, mcp)
- **Multi-modal**: Image, audio, and file inputs supported
- **Prompt Caching**: Support for `promptCacheRetention: '24h'` on gpt-5.1 series

Sources: [packages/openai/package.json:1-74](), [packages/openai/CHANGELOG.md:1-99](), [packages/openai/CHANGELOG.md:130-132](), [packages/openai/CHANGELOG.md:175-176](), [packages/openai/CHANGELOG.md:323-325](), [content/docs/02-foundations/02-providers-and-models.mdx:117-126]()

### Azure OpenAI Provider

Azure OpenAI wraps the OpenAI provider with deployment-based URLs:

```mermaid
graph TB
    AZURE_PKG["@ai-sdk/azure<br/>v3.0.0-beta.101"]
    
    AZURE_FUNC["azure()<br/>Factory function"]
    
    OPENAI_CHAT["OpenAIChatLanguageModel<br/>Delegated from @ai-sdk/openai"]
    OPENAI_RESP["OpenAIResponsesLanguageModel<br/>Delegated from @ai-sdk/openai"]
    OPENAI_EMB["OpenAIEmbeddingModel<br/>Delegated from @ai-sdk/openai"]
    OPENAI_IMG["OpenAIImageModel<br/>Delegated from @ai-sdk/openai"]
    
    CONFIG["Azure Configuration<br/>resourceName: string<br/>apiVersion: string<br/>deployment: string"]
    
    URL_TRANSFORM["URL Transformation<br/>{resourceName}.openai.azure.com/<br/>openai/deployments/{deployment}"]
    
    AZURE_PKG --> AZURE_FUNC
    AZURE_FUNC --> CONFIG
    AZURE_FUNC --> URL_TRANSFORM
    URL_TRANSFORM --> OPENAI_CHAT
    URL_TRANSFORM --> OPENAI_RESP
    URL_TRANSFORM --> OPENAI_EMB
    URL_TRANSFORM --> OPENAI_IMG
```

**Diagram: Azure OpenAI Provider Delegation Pattern**

**Key Characteristics:**
- **Delegation Pattern**: Wraps all OpenAI model classes with Azure-specific URL transformation
- **Deployment-Based URLs**: Transforms to `{resourceName}.openai.azure.com/openai/deployments/{deployment}`
- **API Versioning**: Requires `api-version` parameter (e.g., `2024-08-01-preview`, `2024-10-21`)
- **Responses API Support**: Full support for provider-defined tools (web_search enabled via `web-search-preview` API version)
- **Feature Parity**: Inherits all OpenAI features including reasoning models, embeddings, and image generation

Sources: [packages/azure/package.json:35-38](), [packages/azure/CHANGELOG.md:1-101](), [packages/azure/CHANGELOG.md:261-263](), [examples/next-openai/package.json:12-14]()

### Anthropic Provider

The Anthropic provider implements Claude models via the Messages API:

```mermaid
graph TB
    subgraph "Anthropic Package"
        ANTH_PKG["@ai-sdk/anthropic<br/>v3.0.0-beta.86"]
        
        ANTH_FUNC["anthropic()<br/>Factory function"]
        
        MSG_MODEL["AnthropicMessagesLanguageModel<br/>Messages API v1"]
        
        subgraph "Model IDs"
            OPUS45["claude-opus-4-5@20251101"]
            SONNET45["claude-sonnet-4-5-20250929"]
            HAIKU45["claude-haiku-4-5@20250110"]
            OPUS35["claude-opus-3-5-20240229"]
            SONNET35["claude-sonnet-3-5-20241022<br/>claude-3-5-sonnet-20240620"]
        end
        
        subgraph "Provider Tools"
            WEB_SEARCH_A["webSearch<br/>Search with citations"]
            WEB_FETCH["webFetch<br/>Fetch URL content"]
            CODE_EXEC["codeExecution<br/>Python sandbox"]
            COMPUTER["computer<br/>Desktop automation"]
            TEXT_EDITOR["textEditor<br/>File editing"]
            BASH["bash<br/>Shell commands"]
            MEMORY["memory<br/>Long-term memory"]
            CONTEXT_MGT["contextManagement<br/>Context window mgmt"]
        end
        
        subgraph "Provider Options"
            THINKING["thinking: boolean<br/>Extended reasoning mode"]
            THINKING_BUDGET["thinkingBudget: number<br/>Reasoning token limit"]
            EFFORT["effort: 'low' | 'medium' | 'high' | 'xhigh'<br/>Opus 4.5 reasoning"]
            CACHE["cacheControl<br/>Prompt caching"]
            MCP["mcpServers<br/>Model Context Protocol"]
            CONTAINER["container<br/>Sandboxed execution"]
        end
    end
    
    ANTH_FUNC --> MSG_MODEL
    MSG_MODEL --> OPUS45
    MSG_MODEL --> SONNET45
    MSG_MODEL --> HAIKU45
    
    MSG_MODEL --> WEB_SEARCH_A
    MSG_MODEL --> WEB_FETCH
    MSG_MODEL --> CODE_EXEC
    MSG_MODEL --> COMPUTER
    MSG_MODEL --> TEXT_EDITOR
    MSG_MODEL --> BASH
    MSG_MODEL --> MEMORY
    MSG_MODEL --> CONTEXT_MGT
    
    MSG_MODEL --> THINKING
    MSG_MODEL --> EFFORT
    MSG_MODEL --> CACHE
    MSG_MODEL --> MCP
```

**Diagram: Anthropic Provider Structure**

**Key Features:**
- **Extended Thinking Mode**: Support for reasoning tokens via `thinking` option with configurable `thinkingBudget`
- **Opus 4.5 Reasoning**: New `effort` option ('low', 'medium', 'high', 'xhigh') for Opus 4.5 with up to 64K output tokens
- **Prompt Caching**: Cache control for reducing latency and costs via `cacheControl`
- **Provider-Defined Tools**: 8 Anthropic-specific tools (webSearch, webFetch, codeExecution, computer, textEditor, bash, memory, contextManagement)
- **Native Structured Outputs**: Anthropic-native JSON schema support via `schema` field
- **MCP Server Integration**: Connect to external Model Context Protocol servers
- **Multi-modal**: Support for images, PDFs, and documents
- **Temperature Clamping**: Automatic clamping to 0-1 range with warnings

Sources: [packages/anthropic/package.json:1-74](), [packages/anthropic/CHANGELOG.md:1-86](), [packages/anthropic/CHANGELOG.md:48-50](), [packages/anthropic/CHANGELOG.md:60-62](), [packages/anthropic/CHANGELOG.md:68-70](), [packages/anthropic/CHANGELOG.md:76-78](), [packages/anthropic/CHANGELOG.md:212-214](), [packages/anthropic/CHANGELOG.md:243-245]()

### Google AI Providers

Google provides two provider packages: Generative AI (direct) and Vertex AI (multi-model platform):

```mermaid
graph TB
    subgraph "Google Generative AI"
        GOOGLE_PKG["@ai-sdk/google<br/>v3.0.0-beta.75"]
        GOOGLE_FUNC["google()<br/>Factory function"]
        GOOGLE_LANG["GoogleGenerativeAILanguageModel<br/>Gemini API"]
        GOOGLE_EMB["GoogleGenerativeAIEmbeddingModel<br/>text-embedding-004"]
        GOOGLE_IMG["GoogleGenerativeAIImageModel<br/>imagen-3.0-generate-001"]
        
        subgraph "Gemini Models"
            GEMINI_3["gemini-3-pro-preview<br/>gemini-3-pro-image-preview"]
            GEMINI_25["gemini-2.5-flash-latest-lite"]
            GEMINI_2["gemini-2.0-flash-exp"]
            GEMINI_15["gemini-1.5-pro<br/>gemini-1.5-flash"]
            GEMMA["gemma-2-9b-it<br/>gemma-2-27b-it"]
        end
        
        subgraph "Provider Tools"
            GOOGLE_SEARCH["googleSearch<br/>Search with Grounding"]
            URL_CONTEXT["urlContext<br/>URL content"]
            CODE_EXEC_G["codeExecution<br/>Python sandbox"]
            FILE_SEARCH_G["fileSearch<br/>File Search stores"]
        end
        
        THINKING_LEVEL["thinking_level: number<br/>Gemini 3 reasoning"]
        IMAGE_SIZE["imageSize: string<br/>Image generation"]
    end
    
    subgraph "Google Vertex AI"
        VERTEX_PKG["@ai-sdk/google-vertex<br/>v4.0.0-beta.117"]
        VERTEX_FUNC["vertex()<br/>vertex.anthropic()"]
        
        USES_GOOGLE["Delegates to GoogleGenerativeAILanguageModel<br/>for Gemini models"]
        USES_ANTH["Delegates to AnthropicMessagesLanguageModel<br/>for Claude models"]
        
        subgraph "Additional Tools"
            VERTEX_RAG["vertexRagStore<br/>RAG Engine grounding"]
        end
        
        AUTH["google-auth-library@^10.5.0<br/>Google Cloud authentication"]
        EXPRESS_MODE["expressMode: boolean<br/>Low-latency mode"]
    end
    
    GOOGLE_FUNC --> GOOGLE_LANG
    GOOGLE_FUNC --> GOOGLE_EMB
    GOOGLE_FUNC --> GOOGLE_IMG
    GOOGLE_LANG --> GEMINI_3
    GOOGLE_LANG --> GEMINI_25
    GOOGLE_LANG --> GEMINI_2
    GOOGLE_LANG --> THINKING_LEVEL
    GOOGLE_LANG --> GOOGLE_SEARCH
    GOOGLE_LANG --> URL_CONTEXT
    GOOGLE_LANG --> CODE_EXEC_G
    GOOGLE_LANG --> FILE_SEARCH_G
    GOOGLE_IMG --> IMAGE_SIZE
    
    VERTEX_FUNC --> USES_GOOGLE
    VERTEX_FUNC --> USES_ANTH
    VERTEX_PKG --> AUTH
    VERTEX_FUNC --> VERTEX_RAG
    VERTEX_FUNC --> EXPRESS_MODE
```

**Diagram: Google Provider Family Structure**

**Key Differences:**
- **Google Generative AI**: Direct API access via `google()`, simpler API key authentication
- **Google Vertex AI**: Multi-cloud platform via `vertex()` and `vertex.anthropic()`, requires Google Cloud authentication
- **Model Coverage**: Vertex supports both Gemini (via Google) and Claude (via Anthropic) models
- **RAG Integration**: Vertex provides `vertexRagStore` tool for RAG Engine grounding
- **Thinking Configuration**: Support for `thinking_level` option in Gemini 3 models for reasoning control
- **Express Mode**: Vertex-specific `expressMode` option for low-latency inference
- **Image Generation**: Support for Imagen 3.0 with configurable `imageSize`

Sources: [packages/google/package.json:1-74](), [packages/google-vertex/package.json:1-88](), [packages/google/CHANGELOG.md:1-75](), [packages/google/CHANGELOG.md:59-68](), [packages/google/CHANGELOG.md:179-182](), [packages/google/CHANGELOG.md:187-189](), [packages/google-vertex/CHANGELOG.md:1-117](), [packages/google-vertex/CHANGELOG.md:87-89](), [packages/google-vertex/CHANGELOG.md:178-181](), [content/docs/02-foundations/02-providers-and-models.mdx:1-237]()

### Mistral and Cohere Providers

```mermaid
graph LR
    subgraph "Mistral"
        MISTRAL_PKG["@ai-sdk/mistral<br/>v3.0.0-beta.42"]
        MISTRAL_FUNC["mistral()"]
        MISTRAL_MODELS["mistral-large-latest<br/>mistral-small-latest<br/>codestral-latest"]
        SAFE_PROMPT["safePrompt<br/>Provider option"]
        STRUCTURED["structuredOutputs<br/>Provider option"]
    end
    
    subgraph "Cohere"
        COHERE_PKG["@ai-sdk/cohere<br/>v3.0.0-beta.41"]
        COHERE_FUNC["cohere()"]
        COHERE_MODELS["command-r-plus<br/>command-r<br/>command-light"]
        COHERE_EMB["embed-english-v3.0<br/>embed-multilingual-v3.0"]
        THINKING_C["thinking<br/>Provider option"]
    end
    
    MISTRAL_FUNC --> MISTRAL_MODELS
    MISTRAL_FUNC --> SAFE_PROMPT
    MISTRAL_FUNC --> STRUCTURED
    
    COHERE_FUNC --> COHERE_MODELS
    COHERE_FUNC --> COHERE_EMB
    COHERE_FUNC --> THINKING_C
```

**Diagram: Mistral and Cohere Provider Structure**

Sources: [packages/mistral/package.json:1-67](), [examples/next-openai/package.json:21-22]()

## Cloud Platform Providers

### Composite Architecture Pattern

Cloud platform providers leverage existing provider implementations:

```mermaid
graph TB
    subgraph "Amazon Bedrock"
        BEDROCK_PKG["@ai-sdk/amazon-bedrock<br/>v4.0.0-beta.78"]
        BEDROCK_FUNC["bedrock()"]
        
        BEDROCK_USES_ANTH["Uses AnthropicMessagesLanguageModel<br/>from @ai-sdk/anthropic"]
        
        BEDROCK_MODELS["claude-sonnet-4-5-20250929-v1:0<br/>claude-opus-3-5-20240229-v1:0<br/>claude-haiku-4-5@20250110"]
        
        BEDROCK_AUTH["aws4fetch<br/>AWS Signature v4"]
        
        BEDROCK_STREAMING["@smithy/eventstream-codec<br/>AWS event stream parsing"]
    end
    
    subgraph "Google Vertex AI"
        VERTEX_PKG_2["@ai-sdk/google-vertex<br/>v4.0.0-beta.95"]
        VERTEX_FUNC_2["vertex()<br/>vertex.anthropic()"]
        
        VERTEX_GOOGLE["GoogleGenerativeAILanguageModel<br/>for Gemini models"]
        
        VERTEX_ANTH["AnthropicMessagesLanguageModel<br/>for Claude models"]
        
        VERTEX_MODELS["gemini-2.0-flash-exp<br/>claude-opus-4-5@20251101"]
    end
    
    BEDROCK_FUNC --> BEDROCK_USES_ANTH
    BEDROCK_FUNC --> BEDROCK_AUTH
    BEDROCK_FUNC --> BEDROCK_STREAMING
    BEDROCK_USES_ANTH --> BEDROCK_MODELS
    
    VERTEX_FUNC_2 --> VERTEX_GOOGLE
    VERTEX_FUNC_2 --> VERTEX_ANTH
    VERTEX_GOOGLE --> VERTEX_MODELS
    VERTEX_ANTH --> VERTEX_MODELS
```

**Diagram: Composite Provider Architecture**

**Composite Provider Pattern:**
1. **Dependency Reuse**: Platform providers depend on direct provider packages (`@ai-sdk/anthropic`, `@ai-sdk/google`)
2. **Protocol Adaptation**: Transform platform-specific authentication and request formats
3. **Feature Preservation**: Maintain provider-specific features (thinking, cache control, MCP, structured outputs)
4. **Model Support**: Enable access to models through platform gateways with platform-specific model IDs

**Amazon Bedrock Specifics:**
- **Dependencies**: `@ai-sdk/anthropic@workspace:*`, `aws4fetch@^1.0.20`, `@smithy/eventstream-codec@^4.0.1`, `@smithy/util-utf8@^4.0.0`
- **Authentication**: AWS Signature v4 via `aws4fetch` library
- **Streaming**: AWS event stream format parsed via `@smithy/eventstream-codec`
- **Model Mapping**: Maps Bedrock model IDs (e.g., `claude-sonnet-4-5-20250929-v1:0`) to `AnthropicMessagesLanguageModel`
- **Feature Support**: Full support for thinking mode, structured outputs, and tool calling with Anthropic features
- **Temperature Clamping**: Automatic clamping to 0-1 range with warnings
- **Reasoning Support**: Nova 2 models support `maxReasoningEffort` field

**Google Vertex AI Specifics:**
- **Dependencies**: `@ai-sdk/google@workspace:*`, `@ai-sdk/anthropic@workspace:*`, `google-auth-library@^10.5.0`
- **Multi-Provider**: Supports both Gemini (via `GoogleGenerativeAILanguageModel`) and Claude (via `AnthropicMessagesLanguageModel`) models
- **Authentication**: Google Cloud authentication via `google-auth-library` v10.5.0
- **Export Structure**: Separate exports for `vertex()` (Gemini) and `vertex.anthropic()` (Claude)
- **Additional Tools**: Provides `vertexRagStore` tool for RAG Engine grounding
- **Express Mode**: Low-latency inference mode via `expressMode` option
- **Feature Parity**: Maintains all Google and Anthropic features through delegation

Sources: [packages/amazon-bedrock/package.json:35-41](), [packages/google-vertex/package.json:53-58](), [packages/google-vertex/package.json:30-51](), [packages/amazon-bedrock/CHANGELOG.md:1-96](), [packages/amazon-bedrock/CHANGELOG.md:58-62](), [packages/amazon-bedrock/CHANGELOG.md:131-135](), [packages/amazon-bedrock/CHANGELOG.md:289-309](), [packages/google-vertex/CHANGELOG.md:1-117](), [packages/google-vertex/CHANGELOG.md:87-89](), [packages/google-vertex/CHANGELOG.md:361-380]()

## Open Source and Alternative Providers

The ecosystem includes numerous providers for open-source models and specialized infrastructure:

### Alternative LLM Providers

| Provider | Package Version | Key Features |
|----------|----------------|--------------|
| **xAI** | `@ai-sdk/xai@3.0.0-beta.48` | Grok models |
| **DeepSeek** | `@ai-sdk/deepseek@2.0.0-beta.43` | DeepSeek V3 models |
| **Groq** | `@ai-sdk/groq@3.0.0-beta.42` | Fast inference hardware |
| **Cerebras** | `@ai-sdk/cerebras` | Ultra-fast inference |
| **Fireworks AI** | `@ai-sdk/fireworks@2.0.0-beta.41` | Function calling optimized |
| **Together AI** | `@ai-sdk/togetherai` | Open source model hosting |
| **Hugging Face** | `@ai-sdk/huggingface` | Inference API access |
| **Replicate** | `@ai-sdk/replicate` | Model deployment platform |
| **Perplexity** | `@ai-sdk/perplexity@3.0.0-beta.42` | Search-augmented generation |
| **Baseten** | `@ai-sdk/baseten` | Model deployment |
| **DeepInfra** | `@ai-sdk/deepinfra` | Model hosting |

Sources: [examples/ai-core/package.json:5-40](), [examples/next-openai/package.json:12-28]()

### OpenAI-Compatible Provider

The `@ai-sdk/openai-compatible` package provides a generic connector for any OpenAI-compatible API:

```mermaid
graph LR
    COMPAT_PKG["@ai-sdk/openai-compatible"]
    
    CUSTOM["Custom Endpoints<br/>Self-hosted models<br/>OpenAI-compatible APIs"]
    
    OPENAI_IMPL["Uses OpenAIChatLanguageModel<br/>from @ai-sdk/openai"]
    
    COMPAT_PKG --> CUSTOM
    COMPAT_PKG --> OPENAI_IMPL
```

**Diagram: OpenAI-Compatible Provider for Custom Endpoints**

Sources: [examples/ai-core/package.json:31-32]()

## Specialized Model Providers

### Speech and Transcription Providers

```mermaid
graph TB
    subgraph "Speech Synthesis"
        ELEVENLABS["@ai-sdk/elevenlabs<br/>Text-to-speech"]
        LMNT["@ai-sdk/lmnt<br/>Speech synthesis"]
        HUME["@ai-sdk/hume<br/>Expressive voice"]
    end
    
    subgraph "Transcription"
        DEEPGRAM["@ai-sdk/deepgram<br/>Speech-to-text"]
        ASSEMBLYAI["@ai-sdk/assemblyai<br/>Transcription"]
        REVAI["@ai-sdk/revai<br/>Transcription"]
        GLADIA["@ai-sdk/gladia<br/>Transcription"]
    end
    
    subgraph "Provider Specs"
        SPEECH_V3["SpeechModelV3<br/>doSpeak()"]
        TRANS_V3["TranscriptionModelV3<br/>doTranscribe()"]
    end
    
    SPEECH_V3 --> ELEVENLABS
    SPEECH_V3 --> LMNT
    SPEECH_V3 --> HUME
    
    TRANS_V3 --> DEEPGRAM
    TRANS_V3 --> ASSEMBLYAI
    TRANS_V3 --> REVAI
    TRANS_V3 --> GLADIA
```

**Diagram: Speech and Transcription Provider Ecosystem**

Sources: [examples/ai-core/package.json:16-19](), [examples/ai-core/package.json:28-29]()

### Image Generation Providers

```mermaid
graph TB
    subgraph "Image Generation"
        BFL["@ai-sdk/black-forest-labs<br/>Flux models"]
        FAL["@ai-sdk/fal<br/>Image generation"]
        LUMA["@ai-sdk/luma<br/>Video generation"]
    end
    
    subgraph "Provider Spec"
        IMAGE_V3["ImageModelV3<br/>doGenerate()"]
    end
    
    IMAGE_V3 --> BFL
    IMAGE_V3 --> FAL
    IMAGE_V3 --> LUMA
```

**Diagram: Image Generation Provider Ecosystem**

Sources: [examples/ai-core/package.json:6-7](), [examples/ai-core/package.json:18-19](), [examples/ai-core/package.json:25-26]()

## Gateway and Routing

### AI Gateway Provider

The `@ai-sdk/gateway` package provides infrastructure-level capabilities:

```mermaid
graph TB
    GATEWAY_PKG["@ai-sdk/gateway"]
    
    subgraph "Capabilities"
        RATE_LIMIT["Rate Limiting<br/>Token buckets"]
        CACHE["Response Caching<br/>Reduce costs"]
        ROUTING["Model Routing<br/>Fallback strategies"]
        MONITORING["Request Monitoring<br/>Usage tracking"]
    end
    
    GATEWAY_PKG --> RATE_LIMIT
    GATEWAY_PKG --> CACHE
    GATEWAY_PKG --> ROUTING
    GATEWAY_PKG --> MONITORING
```

**Diagram: AI Gateway Provider Capabilities**

Sources: [examples/ai-core/package.json:20-21]()

## Framework Integration Adapters

### LangChain and LlamaIndex Bridges

```mermaid
graph LR
    subgraph "External Frameworks"
        LANGCHAIN_SDK["@langchain/core<br/>@langchain/openai<br/>langchain"]
        LLAMAINDEX_SDK["LlamaIndex"]
    end
    
    subgraph "Bridge Packages"
        LANGCHAIN_BRIDGE["@ai-sdk/langchain<br/>v2.0.0-beta.129"]
        LLAMAINDEX_BRIDGE["@ai-sdk/llamaindex<br/>v2.0.0-beta.129"]
    end
    
    subgraph "AI SDK Core"
        AI_CORE["ai package<br/>generateText, streamText"]
    end
    
    LANGCHAIN_SDK --> LANGCHAIN_BRIDGE
    LLAMAINDEX_SDK --> LLAMAINDEX_BRIDGE
    
    LANGCHAIN_BRIDGE --> AI_CORE
    LLAMAINDEX_BRIDGE --> AI_CORE
```

**Diagram: Framework Integration Bridge Architecture**

**Bridge Purposes:**
- **LangChain Bridge**: Enable using AI SDK providers with LangChain chains and agents
- **LlamaIndex Bridge**: Enable using AI SDK providers with LlamaIndex query engines
- **Synchronized Versioning**: Both bridges maintain version parity with core `ai` package (v2.0.0-beta.129)

Sources: [examples/next-langchain/package.json:12-14](), [pnpm-lock.yaml:47-48]()

## Example Usage Patterns

### Comprehensive Provider Testing

The `ai-core` example demonstrates integration with all providers:

```mermaid
graph TB
    AI_CORE_EX["examples/ai-core"]
    
    subgraph "Provider Dependencies"
        COMMERCIAL["Commercial Providers<br/>OpenAI, Anthropic, Google<br/>Mistral, Cohere, Azure"]
        
        CLOUD["Cloud Platforms<br/>Amazon Bedrock<br/>Google Vertex"]
        
        ALTERNATIVE["Alternative Providers<br/>xAI, DeepSeek, Groq<br/>Fireworks, Together, HF"]
        
        SPECIALIZED["Specialized<br/>ElevenLabs, Deepgram<br/>Black Forest Labs, Fal"]
    end
    
    AI_CORE_EX --> COMMERCIAL
    AI_CORE_EX --> CLOUD
    AI_CORE_EX --> ALTERNATIVE
    AI_CORE_EX --> SPECIALIZED
```

**Diagram: ai-core Example Provider Coverage**

The `ai-core` example imports 25+ provider packages to test comprehensive provider support:

- Language Models: OpenAI, Anthropic, Google, Mistral, Cohere, xAI, DeepSeek, Groq, Cerebras, Fireworks, Together AI, Hugging Face, Replicate, Perplexity, Baseten, DeepInfra, OpenAI-compatible
- Cloud Platforms: Azure OpenAI, Amazon Bedrock, Google Vertex AI
- Embedding Models: OpenAI, Cohere, Google
- Image Models: OpenAI (DALL-E), Black Forest Labs (Flux), Fal.ai, Luma AI
- Speech Models: ElevenLabs, Deepgram, AssemblyAI, Rev.ai, Gladia, Hume, LMNT
- Infrastructure: AI Gateway, MCP Client

Sources: [examples/ai-core/package.json:5-56]()

### Multi-Provider Examples

The `next-openai` example demonstrates using multiple providers in a single application:

```typescript
// Imports from package.json
"@ai-sdk/amazon-bedrock": "4.0.0-beta.78"
"@ai-sdk/anthropic": "3.0.0-beta.70"
"@ai-sdk/azure": "3.0.0-beta.80"
"@ai-sdk/cohere": "3.0.0-beta.41"
"@ai-sdk/deepseek": "2.0.0-beta.43"
"@ai-sdk/fireworks": "2.0.0-beta.41"
"@ai-sdk/google": "3.0.0-beta.62"
"@ai-sdk/google-vertex": "4.0.0-beta.95"
"@ai-sdk/groq": "3.0.0-beta.42"
"@ai-sdk/mistral": "3.0.0-beta.42"
"@ai-sdk/openai": "3.0.0-beta.78"
"@ai-sdk/perplexity": "3.0.0-beta.42"
"@ai-sdk/xai": "3.0.0-beta.48"
```

Sources: [examples/next-openai/package.json:11-49]()

## Version Management

### Beta Versioning Strategy

All provider packages follow synchronized beta versioning:

- **Core Specification**: `@ai-sdk/provider@3.0.0-beta.26`
- **Provider Utilities**: `@ai-sdk/provider-utils@4.0.0-beta.50`
- **Major Language Model Providers**: v3.0.0-beta.x (OpenAI, Anthropic, Google, Mistral, Cohere)
- **Cloud Platform Providers**: v3.0.0-beta.x (Azure), v4.0.0-beta.x (Bedrock, Vertex)
- **OpenAI-Compatible Providers**: v2.0.0-beta.x or v3.0.0-beta.x
- **Changesets**: 390+ changesets tracking feature development

The version numbers indicate:
- **Major version (3 or 4)**: Breaking changes to provider specification
- **Beta tag**: Pre-release status for AI SDK 6
- **Patch version**: Incremental updates within beta

**Version Synchronization**: Provider packages are loosely synchronized with the core `ai` package (v6.0.0-beta.154) but maintain independent versioning to allow for provider-specific updates.

Sources: [.changeset/pre.json:1-10](), [.changeset/pre.json:78-462](), [packages/openai/package.json:3](), [packages/anthropic/package.json:3](), [packages/google/package.json:3](), [packages/azure/package.json:3](), [packages/amazon-bedrock/package.json:3](), [packages/google-vertex/package.json:3]()

## Provider Selection Considerations

### Feature Matrix

| Feature | OpenAI | Anthropic | Google | Mistral | Cohere |
|---------|--------|-----------|--------|---------|--------|
| **Streaming** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Tool Calling** | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Provider Tools** | ✓ (web_search, code_interpreter, etc.) | ✓ (webSearch, codeExecution, etc.) | ✓ (googleSearch, urlContext, etc.) | ✗ | ✗ |
| **Multi-modal** | ✓ (images, audio) | ✓ (images, PDFs) | ✓ (images, audio, video) | ✓ (images, PDFs) | ✗ |
| **Reasoning Models** | ✓ (o1, o3) | ✓ (thinking) | ✓ (thinking_level) | ✗ | ✗ |
| **Embeddings** | ✓ | ✗ | ✓ | ✓ | ✓ |
| **Image Generation** | ✓ (DALL-E) | ✗ | ✗ | ✗ | ✗ |
| **Prompt Caching** | ✗ | ✓ (cache control) | ✗ | ✗ | ✗ |
| **MCP Servers** | ✗ | ✓ | ✗ | ✗ | ✗ |

Sources: [packages/openai/CHANGELOG.md:114-115](), [packages/anthropic/CHANGELOG.md:114-115](), [packages/google/CHANGELOG.md:115-117]()