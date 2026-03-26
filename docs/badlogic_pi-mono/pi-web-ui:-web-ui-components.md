# pi-web-ui: Web UI Components

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [package-lock.json](package-lock.json)
- [packages/agent/CHANGELOG.md](packages/agent/CHANGELOG.md)
- [packages/agent/package.json](packages/agent/package.json)
- [packages/ai/CHANGELOG.md](packages/ai/CHANGELOG.md)
- [packages/ai/package.json](packages/ai/package.json)
- [packages/coding-agent/CHANGELOG.md](packages/coding-agent/CHANGELOG.md)
- [packages/coding-agent/package.json](packages/coding-agent/package.json)
- [packages/mom/CHANGELOG.md](packages/mom/CHANGELOG.md)
- [packages/mom/package.json](packages/mom/package.json)
- [packages/pods/package.json](packages/pods/package.json)
- [packages/tui/CHANGELOG.md](packages/tui/CHANGELOG.md)
- [packages/tui/package.json](packages/tui/package.json)
- [packages/web-ui/CHANGELOG.md](packages/web-ui/CHANGELOG.md)
- [packages/web-ui/example/package.json](packages/web-ui/example/package.json)
- [packages/web-ui/package.json](packages/web-ui/package.json)

</details>

This package provides reusable web components for building browser-based AI chat interfaces powered by the pi-ai LLM API. It handles attachment processing (images, PDFs, DOCX, Excel), CORS proxy configuration, custom message types, and provides pre-built UI components for chat applications.

For information about the underlying agent runtime, see [pi-agent-core: Agent Framework](#3). For LLM API integration details, see [pi-ai: LLM API Library](#2).

---

## Architecture and Dependencies

pi-web-ui sits between the browser UI layer and the core agent/LLM infrastructure, bridging the gap between user-facing components and backend AI services.

### Package Dependencies and Relationships

```mermaid
graph TB
    subgraph "Browser Layer"
        APP["Web Application<br/>(Vite + Lit)"]
        COMPONENTS["UI Components<br/>CustomProviderCard<br/>ProviderKeyInput<br/>AbortedMessage<br/>ToolMessageDebugView"]
    end

    subgraph "pi-web-ui Package"
        TRANSFORMERS["Message Transformers<br/>defaultConvertToLlm<br/>convertAttachments"]

        TYPES["Custom Message Types<br/>UserMessageWithAttachments<br/>ArtifactMessage<br/>CustomAgentMessages"]

        PROXY["CORS Proxy Utilities<br/>createStreamFn<br/>applyProxyIfNeeded<br/>shouldUseProxyForProvider<br/>isCorsError"]

        DOCS["Document Processors<br/>PDF: pdfjs-dist<br/>DOCX: docx-preview<br/>Excel: xlsx<br/>ZIP: jszip"]

        TYPEGUARDS["Type Guards<br/>isUserMessageWithAttachments<br/>isArtifactMessage"]
    end

    subgraph "Core Runtime (from other packages)"
        AGENT["Agent<br/>@mariozechner/pi-agent-core"]
        STREAMFN["streamSimple<br/>@mariozechner/pi-ai"]
    end

    subgraph "LLM Clients (optional)"
        LMSTUDIO["@lmstudio/sdk"]
        OLLAMA["ollama"]
    end

    APP --> COMPONENTS
    APP --> TRANSFORMERS
    APP --> PROXY
    APP --> TYPES

    TRANSFORMERS --> DOCS
    TRANSFORMERS --> AGENT

    PROXY --> STREAMFN

    COMPONENTS --> TYPEGUARDS
    COMPONENTS --> TYPES

    APP -.optional.-> LMSTUDIO
    APP -.optional.-> OLLAMA

    style PROXY fill:#99ccff,stroke:#333,stroke-width:2px
    style TRANSFORMERS fill:#ffcc99,stroke:#333,stroke-width:2px
```

**Sources:** [packages/web-ui/package.json:1-51](), [packages/web-ui/CHANGELOG.md:203-289]()

---

## Custom Message Types

pi-web-ui extends the `AgentMessage` type system from pi-agent-core to support browser-specific message types for attachments and artifacts. Applications can further extend these types through declaration merging.

### Message Type Architecture

```mermaid
graph LR
    subgraph "pi-agent-core"
        AgentMessage["AgentMessage<br/>(base union type)"]
        CustomAgentMessages["CustomAgentMessages<br/>(declaration merge interface)"]
    end

    subgraph "pi-web-ui Extensions"
        UserWithAttachments["UserMessageWithAttachments<br/>role: 'user-with-attachments'<br/>content: string<br/>attachments: Attachment[]"]

        ArtifactMsg["ArtifactMessage<br/>role: 'artifact'<br/>(custom artifact data)"]

        Attachment["Attachment<br/>name: string<br/>mimeType: string<br/>data: ArrayBuffer"]
    end

    subgraph "Type Guards"
        isUserWithAttach["isUserMessageWithAttachments()<br/>→ boolean"]
        isArtifact["isArtifactMessage()<br/>→ boolean"]
    end

    AgentMessage --> CustomAgentMessages
    CustomAgentMessages --> UserWithAttachments
    CustomAgentMessages --> ArtifactMsg

    UserWithAttachments --> Attachment

    isUserWithAttach -.checks.-> UserWithAttachments
    isArtifact -.checks.-> ArtifactMsg
```

**Declaration Merging Pattern:**

Applications extend message types by declaring custom roles on the `CustomAgentMessages` interface:

```typescript
declare module '@mariozechner/pi-agent-core' {
  interface CustomAgentMessages {
    'user-with-attachments': UserMessageWithAttachments
    artifact: ArtifactMessage
  }
}
```

**Sources:** [packages/web-ui/CHANGELOG.md:209-289]()

---

## Message Transformation Pipeline

The `defaultConvertToLlm` function transforms browser-specific message types into the format expected by LLM APIs, handling attachment extraction and conversion.

### Message Conversion Flow

```mermaid
graph TD
    BrowserMsg["Browser Messages<br/>(AgentMessage[])"]

    DefaultConverter["defaultConvertToLlm()<br/>Message Transformer"]

    CheckType{Message Type?}

    UserWithAttach["UserMessageWithAttachments"]
    ArtifactType["ArtifactMessage"]
    StandardType["Standard Message"]

    ConvertAttach["convertAttachments()<br/>Process attachments:<br/>- Images → ImageContent<br/>- PDF → extracted text<br/>- DOCX → extracted text<br/>- Excel → extracted text"]

    ExtractPDF["pdfjs-dist<br/>PDF text extraction"]
    ExtractDOCX["docx-preview<br/>DOCX text extraction"]
    ExtractXLSX["xlsx<br/>Excel text extraction"]

    LLMMsg["LLM Message Format<br/>(Message[])"]

    BrowserMsg --> DefaultConverter
    DefaultConverter --> CheckType

    CheckType -->|user-with-attachments| UserWithAttach
    CheckType -->|artifact| ArtifactType
    CheckType -->|other| StandardType

    UserWithAttach --> ConvertAttach

    ConvertAttach --> ExtractPDF
    ConvertAttach --> ExtractDOCX
    ConvertAttach --> ExtractXLSX

    ExtractPDF --> LLMMsg
    ExtractDOCX --> LLMMsg
    ExtractXLSX --> LLMMsg
    ArtifactType --> LLMMsg
    StandardType --> LLMMsg
```

**Key Functions:**

| Function                       | Purpose                  | Input            | Output                           |
| ------------------------------ | ------------------------ | ---------------- | -------------------------------- |
| `defaultConvertToLlm`          | Main message transformer | `AgentMessage[]` | `Message[]` (LLM format)         |
| `convertAttachments`           | Process attachment array | `Attachment[]`   | `ContentBlock[]` (images + text) |
| `isUserMessageWithAttachments` | Type guard               | `AgentMessage`   | `boolean`                        |
| `isArtifactMessage`            | Type guard               | `AgentMessage`   | `boolean`                        |

**Sources:** [packages/web-ui/CHANGELOG.md:219-230](), [packages/web-ui/package.json:19-29]()

---

## Agent Integration and Stream Functions

pi-web-ui provides utilities for creating browser-compatible stream functions that integrate with the `Agent` class from pi-agent-core, including automatic CORS proxy handling.

### Stream Function Creation

```mermaid
graph TB
    subgraph "Application Configuration"
        AppConfig["Application<br/>- providerKeys (storage)<br/>- proxySettings (storage)"]
    end

    subgraph "pi-web-ui Stream Function Factory"
        CreateStream["createStreamFn()<br/>Returns: StreamFn"]

        GetApiKey["getApiKey callback<br/>Reads from providerKeys storage"]

        ProxyDecision{Should use proxy?}

        ApplyProxy["applyProxyIfNeeded()<br/>Rewrites request URL to proxy"]

        CheckCORS["isCorsError()<br/>Detects CORS failures"]

        ShouldProxy["shouldUseProxyForProvider()<br/>Check provider proxy config"]
    end

    subgraph "pi-agent-core"
        Agent["Agent<br/>streamFn: StreamFn<br/>getApiKey: function"]
    end

    subgraph "pi-ai"
        StreamSimple["streamSimple()<br/>Direct LLM API call"]
    end

    AppConfig --> CreateStream
    CreateStream --> GetApiKey
    CreateStream --> ProxyDecision

    ProxyDecision -->|Yes| ApplyProxy
    ProxyDecision -->|No| StreamSimple

    ApplyProxy --> StreamSimple

    ShouldProxy -.informs.-> ProxyDecision
    CheckCORS -.detects failure.-> ProxyDecision

    CreateStream -.provides.-> Agent
    GetApiKey -.provides.-> Agent

    Agent --> StreamSimple
```

**CORS Proxy Utilities:**

| Utility                       | Purpose                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `createStreamFn()`            | Factory that creates a `StreamFn` with dynamic proxy support |
| `applyProxyIfNeeded()`        | Rewrites API request URLs to route through CORS proxy        |
| `shouldUseProxyForProvider()` | Checks if a provider requires proxy in current config        |
| `isCorsError()`               | Type guard to detect CORS-related fetch failures             |

**Default Configuration:**

If not explicitly provided, `AgentInterface` (the UI layer wrapper around `Agent`) sets defaults:

- `streamFn`: Uses `createStreamFn()` with proxy settings from storage
- `getApiKey`: Reads API keys from `providerKeys` storage

**Sources:** [packages/web-ui/CHANGELOG.md:231-249]()

---

## Document Processing

pi-web-ui includes document processors that extract text content from various file formats for inclusion in LLM context. All processing happens client-side in the browser.

### Document Processing Architecture

```mermaid
graph LR
    subgraph "Input: Attachment"
        Attach["Attachment<br/>name: string<br/>mimeType: string<br/>data: ArrayBuffer"]
    end

    subgraph "Document Processors"
        CheckMime{MIME Type?}

        PDFProc["pdfjs-dist<br/>PDF Processor<br/>→ text extraction"]

        DOCXProc["docx-preview<br/>DOCX Processor<br/>→ text extraction"]

        XLSXProc["xlsx<br/>Excel Processor<br/>→ sheet parsing<br/>→ text conversion"]

        ImageProc["Image Handler<br/>→ ImageContent<br/>(base64 data)"]

        ZIPProc["jszip<br/>Archive Handler<br/>(for DOCX/XLSX)"]
    end

    subgraph "Output: Content Blocks"
        TextBlock["TextContent<br/>extracted text"]
        ImgBlock["ImageContent<br/>image data"]
    end

    Attach --> CheckMime

    CheckMime -->|application/pdf| PDFProc
    CheckMime -->|application/vnd.openxmlformats-officedocument.wordprocessingml.document| DOCXProc
    CheckMime -->|application/vnd.openxmlformats-officedocument.spreadsheetml.sheet| XLSXProc
    CheckMime -->|image/*| ImageProc

    DOCXProc --> ZIPProc
    XLSXProc --> ZIPProc

    PDFProc --> TextBlock
    DOCXProc --> TextBlock
    XLSXProc --> TextBlock
    ImageProc --> ImgBlock
```

**Supported Document Types:**

| Format | MIME Type                                                                 | Library        | Output               |
| ------ | ------------------------------------------------------------------------- | -------------- | -------------------- |
| PDF    | `application/pdf`                                                         | `pdfjs-dist`   | Extracted text       |
| DOCX   | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `docx-preview` | Extracted text       |
| Excel  | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`       | `xlsx`         | Sheet data as text   |
| Images | `image/*`                                                                 | (built-in)     | Base64-encoded image |

**Sources:** [packages/web-ui/package.json:19-29]()

---

## UI Components

pi-web-ui exports pre-built web components for common chat interface elements, built with Lit and mini-lit. These components are styled with Tailwind CSS and use Lucide icons.

### Exported Components

```mermaid
graph TB
    subgraph "Provider Configuration Components"
        CustomProvider["CustomProviderCard<br/>Web Component<br/>Displays provider info<br/>+ configuration UI"]

        KeyInput["ProviderKeyInput<br/>Web Component<br/>API key input field<br/>+ validation"]
    end

    subgraph "Message Display Components"
        AbortedMsg["AbortedMessage<br/>Web Component<br/>Shows aborted/error state"]

        ToolDebug["ToolMessageDebugView<br/>Web Component<br/>Debug display for tool calls<br/>+ results"]
    end

    subgraph "Rendering Engine"
        Lit["Lit 3.x<br/>Web Components"]
        MiniLit["@mariozechner/mini-lit<br/>Lightweight Lit alternative"]

        Tailwind["TailwindCSS<br/>app.css"]
        Lucide["Lucide Icons<br/>UI icons"]
    end

    subgraph "Usage"
        App["Application HTML<br/><custom-provider-card><br/><provider-key-input><br/><aborted-message><br/><tool-message-debug-view>"]
    end

    CustomProvider --> Lit
    KeyInput --> Lit
    AbortedMsg --> Lit
    ToolDebug --> Lit

    CustomProvider --> MiniLit
    KeyInput --> MiniLit
    AbortedMsg --> MiniLit
    ToolDebug --> MiniLit

    CustomProvider --> Tailwind
    KeyInput --> Tailwind
    AbortedMsg --> Tailwind
    ToolDebug --> Tailwind

    CustomProvider --> Lucide
    KeyInput --> Lucide
    AbortedMsg --> Lucide
    ToolDebug --> Lucide

    App --> CustomProvider
    App --> KeyInput
    App --> AbortedMsg
    App --> ToolDebug
```

**Component Descriptions:**

| Component              | Purpose                     | Key Features                                           |
| ---------------------- | --------------------------- | ------------------------------------------------------ |
| `CustomProviderCard`   | Provider configuration card | Displays provider metadata, configuration options      |
| `ProviderKeyInput`     | API key input               | Secure input field with validation, save/clear actions |
| `AbortedMessage`       | Error display               | Shows aborted or failed assistant messages             |
| `ToolMessageDebugView` | Tool debugging              | Displays tool execution details for debugging          |

**Styling:**

The package exports `app.css` which contains compiled Tailwind CSS styles. Applications import this CSS along with the component modules:

```typescript
import '@mariozechner/pi-web-ui'
import '@mariozechner/pi-web-ui/app.css'
```

**Sources:** [packages/web-ui/CHANGELOG.md:93-96](), [packages/web-ui/package.json:1-51]()

---

## Example Application

The package includes a complete example application that demonstrates integration patterns for building a browser-based AI chat interface.

### Example Application Architecture

```mermaid
graph TB
    subgraph "Example App (packages/web-ui/example)"
        ViteApp["Vite Dev Server<br/>vite.config.ts"]

        AppEntry["index.html<br/>Application Entry"]

        Components["App Components<br/>Built with Lit + mini-lit"]

        Styles["TailwindCSS<br/>@tailwindcss/vite"]
    end

    subgraph "Imported from pi-web-ui"
        WebUI["@mariozechner/pi-web-ui<br/>Components + Utilities"]

        PIUI["@mariozechner/pi-ai<br/>LLM API"]

        MiniLit["@mariozechner/mini-lit<br/>Web Component Framework"]
    end

    ViteApp --> AppEntry
    AppEntry --> Components
    Components --> Styles

    Components --> WebUI
    Components --> PIUI
    Components --> MiniLit

    WebUI -.uses.-> PIUI
```

**Example App Stack:**

| Layer         | Technology                           | Purpose                         |
| ------------- | ------------------------------------ | ------------------------------- |
| Build Tool    | Vite                                 | Development server and bundling |
| UI Framework  | Lit 3.x + mini-lit                   | Web components                  |
| Styling       | Tailwind CSS (via @tailwindcss/vite) | CSS framework                   |
| Icons         | Lucide                               | Icon library                    |
| LLM API       | pi-ai                                | Multi-provider LLM integration  |
| UI Components | pi-web-ui                            | Chat interface components       |

**Sources:** [packages/web-ui/example/package.json:1-26](), [packages/web-ui/package.json:15-16]()

---

## Integration Example

Here's how applications typically integrate pi-web-ui components with the Agent runtime:

### Typical Integration Pattern

```mermaid
sequenceDiagram
    participant User
    participant UI as "UI Components<br/>(pi-web-ui)"
    participant Agent as "Agent<br/>(pi-agent-core)"
    participant Transform as "defaultConvertToLlm<br/>(pi-web-ui)"
    participant Stream as "createStreamFn<br/>(pi-web-ui)"
    participant LLM as "LLM API<br/>(pi-ai)"

    User->>UI: Upload file + type message
    UI->>UI: Create UserMessageWithAttachments
    UI->>Agent: agent.prompt(message)

    Agent->>Transform: convertToLlm(messages)
    Transform->>Transform: Extract document text<br/>(PDF/DOCX/Excel)
    Transform->>Transform: Convert images to ImageContent
    Transform-->>Agent: LLM-format messages

    Agent->>Stream: streamFn(config)

    alt CORS Required
        Stream->>Stream: applyProxyIfNeeded()
        Stream->>LLM: Proxied request
    else Direct API
        Stream->>LLM: Direct request
    end

    LLM-->>Stream: Streaming response
    Stream-->>Agent: Events (message_start, message_update, etc.)
    Agent-->>UI: Render streaming content
    UI-->>User: Display response
```

**Key Integration Points:**

1. **Message Creation**: UI creates `UserMessageWithAttachments` with file uploads
2. **Message Transformation**: `defaultConvertToLlm` handles document processing
3. **Stream Configuration**: `createStreamFn` manages CORS proxy logic
4. **Event Handling**: UI components listen to Agent events for real-time updates

**Sources:** [packages/web-ui/CHANGELOG.md:203-289]()

---

## Migration from 0.30.x

For applications upgrading from version 0.30.x, the major breaking change was the removal of the `Agent` class and transport abstractions from pi-web-ui (moved to pi-agent-core).

### Key Migration Changes

**Before (0.30.x):**

```typescript
import { Agent, ProviderTransport, type AppMessage } from '@mariozechner/pi-web-ui';

const agent = new Agent({
  transport: new ProviderTransport(),
  messageTransformer: (messages: AppMessage[]) => messages.filter(...)
});
```

**After (0.31.0+):**

```typescript
import { Agent, type AgentMessage } from '@mariozechner/pi-agent-core'
import { defaultConvertToLlm } from '@mariozechner/pi-web-ui'

const agent = new Agent({
  convertToLlm: (messages: AgentMessage[]) => {
    return defaultConvertToLlm(messages)
  },
})
// streamFn and getApiKey are set by AgentInterface defaults
```

**Custom Message Type Declaration Merging:**

```typescript
// Before
declare module '@mariozechner/pi-web-ui' {
  interface CustomMessages {
    'my-message': MyMessage
  }
}

// After
declare module '@mariozechner/pi-agent-core' {
  interface CustomAgentMessages {
    'my-message': MyMessage
  }
}
```

**Sources:** [packages/web-ui/CHANGELOG.md:249-289]()
