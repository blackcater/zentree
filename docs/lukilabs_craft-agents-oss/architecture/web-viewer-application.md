# Web Viewer Application

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [apps/viewer/package.json](apps/viewer/package.json)
- [packages/ui/package.json](packages/ui/package.json)

</details>

## Purpose and Scope

The Web Viewer Application is a standalone web application for viewing and sharing Craft Agents session transcripts. Unlike the Electron desktop application which provides full agent interaction capabilities, the viewer is a read-only interface for displaying session content. This enables users to share session transcripts via the web without requiring recipients to install the full Craft Agents desktop application.

For information about the full desktop application architecture, see [Electron Application Architecture](#2.2). For details on session lifecycle and management, see [Session Lifecycle](#2.7).

## Architecture Overview

The viewer follows a fundamentally different architecture than the desktop application, operating as a pure client-side web application rather than an Electron-based desktop tool.

### Application Comparison

```mermaid
graph TB
    subgraph "Desktop Application"
        ElectronMain["Main Process<br/>(Node.js)"]
        ElectronPreload["Preload Bridge"]
        ElectronRenderer["Renderer Process<br/>(React)"]

        ElectronMain -->|"IPC Security"| ElectronPreload
        ElectronPreload -->|"Context Bridge"| ElectronRenderer
        ElectronMain -->|"File Access"| LocalFS["Local Filesystem<br/>~/.craft-agent/"]
    end

    subgraph "Web Viewer Application"
        ViewerApp["Vite + React<br/>Static Web App"]
        ViewerUI["@craft-agent/ui<br/>Shared Components"]
        ViewerCore["@craft-agent/core<br/>Type Definitions"]

        ViewerApp --> ViewerUI
        ViewerApp --> ViewerCore
    end

    subgraph "Session Data Access"
        LocalFS -.->|"User uploads"| ViewerApp
        RemoteURL["Remote URL"] -.->|"Fetch session"| ViewerApp
    end

    style ViewerApp fill:#f9f9f9
    style ElectronMain fill:#f9f9f9
```

**Sources:** [apps/viewer/package.json:1-36]()

The key architectural differences:

| Aspect                | Desktop Application         | Web Viewer                  |
| --------------------- | --------------------------- | --------------------------- |
| **Process Model**     | Multi-process Electron      | Single-page web application |
| **Runtime**           | Node.js + Chromium          | Browser environment only    |
| **File Access**       | Direct filesystem access    | Upload or fetch via HTTP    |
| **Agent Interaction** | Full agent capabilities     | Read-only display           |
| **Data Persistence**  | Local workspace directories | No persistence (stateless)  |
| **Build System**      | ESBuild + Vite              | Vite only                   |

### Technology Stack

```mermaid
graph TB
    subgraph "Build Layer"
        Vite["Vite 6.2.5<br/>Build Tool"]
        ViteReact["@vitejs/plugin-react<br/>React Support"]
        TypeScript["TypeScript 5.7.3<br/>Type Checking"]

        Vite --> ViteReact
        Vite --> TypeScript
    end

    subgraph "UI Framework"
        React["React 18.3.1"]
        ReactDOM["react-dom 18.3.1"]
        Motion["motion 12.0.0<br/>Animations"]

        React --> ReactDOM
    end

    subgraph "Styling System"
        Tailwind["Tailwind CSS 4.0.0"]
        TailwindTypography["@tailwindcss/typography<br/>Prose Styling"]
        CVA["class-variance-authority<br/>Component Variants"]
        CLSX["clsx<br/>Conditional Classes"]
        TailwindMerge["tailwind-merge<br/>Class Merging"]

        Tailwind --> TailwindTypography
    end

    subgraph "Content Rendering"
        ReactMarkdown["react-markdown 9.0.3<br/>Markdown Parser"]
        RemarkGFM["remark-gfm 4.0.1<br/>GitHub Flavored Markdown"]
        RehypeRaw["rehype-raw 7.0.0<br/>HTML Support"]
        Shiki["shiki 3.0.0<br/>Syntax Highlighting"]

        ReactMarkdown --> RemarkGFM
        ReactMarkdown --> RehypeRaw
        ReactMarkdown --> Shiki
    end

    subgraph "Shared Packages"
        UIPackage["@craft-agent/ui<br/>Component Library"]
        CorePackage["@craft-agent/core<br/>Type Definitions"]
    end

    Vite --> React
    Vite --> Tailwind
    Vite --> ReactMarkdown
    Vite --> UIPackage
    Vite --> CorePackage

    style Vite fill:#f9f9f9
    style ReactMarkdown fill:#f9f9f9
```

**Sources:** [apps/viewer/package.json:13-35]()

## Package Dependencies

The viewer leverages the monorepo's shared packages while maintaining minimal dependencies:

### Core Dependencies

The application depends on two workspace packages:

| Package             | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `@craft-agent/core` | Type definitions for sessions, messages, attachments, and metadata |
| `@craft-agent/ui`   | Reusable React components for rendering session transcripts        |

**Sources:** [apps/viewer/package.json:13-15]()

### Content Rendering Pipeline

The viewer implements a sophisticated markdown rendering pipeline:

```mermaid
graph LR
    SessionJSON["Session JSONL<br/>Raw Data"]
    Parser["react-markdown<br/>Parse Markdown"]
    RemarkPlugins["remark-gfm<br/>GFM Support"]
    RehypePlugins["rehype-raw<br/>HTML Support"]
    SyntaxHighlight["shiki<br/>Code Highlighting"]
    StyledOutput["Styled HTML<br/>Tailwind Typography"]

    SessionJSON --> Parser
    Parser --> RemarkPlugins
    RemarkPlugins --> RehypePlugins
    RehypePlugins --> SyntaxHighlight
    SyntaxHighlight --> StyledOutput

    Tailwind["Tailwind CSS<br/>@tailwindcss/typography"] --> StyledOutput
```

**Sources:** [apps/viewer/package.json:20-30]()

**Key rendering features:**

1. **GitHub Flavored Markdown** via `remark-gfm` - supports tables, task lists, strikethrough, and autolinks
2. **Raw HTML Support** via `rehype-raw` - preserves HTML elements in markdown content
3. **Syntax Highlighting** via `shiki` - provides high-quality code block highlighting with multiple themes
4. **Typography** via `@tailwindcss/typography` - professional prose styling for session transcripts

## Application Structure

The viewer follows a component-based architecture built on the shared UI package:

```mermaid
graph TB
    subgraph "Entry Point"
        ViteHTML["index.html<br/>Vite Entry"]
        MainTSX["main.tsx<br/>React Root"]

        ViteHTML --> MainTSX
    end

    subgraph "Application Layer"
        App["App Component<br/>Root Container"]
        Router["Routing Logic<br/>Session Loading"]

        MainTSX --> App
        App --> Router
    end

    subgraph "Shared UI Components"
        SessionView["SessionView<br/>from @craft-agent/ui"]
        MessageList["MessageList<br/>from @craft-agent/ui"]
        MarkdownRenderer["MarkdownRenderer<br/>from @craft-agent/ui"]
        AttachmentDisplay["AttachmentDisplay<br/>from @craft-agent/ui"]

        Router --> SessionView
        SessionView --> MessageList
        MessageList --> MarkdownRenderer
        MessageList --> AttachmentDisplay
    end

    subgraph "Data Loading"
        FileUpload["File Upload Handler"]
        URLFetch["Remote Session Fetch"]
        JSONLParser["JSONL Parser<br/>from @craft-agent/core"]

        FileUpload --> JSONLParser
        URLFetch --> JSONLParser
        JSONLParser --> Router
    end

    style App fill:#f9f9f9
    style SessionView fill:#f9f9f9
```

**Sources:** [apps/viewer/package.json:13-17]()

### Component Reuse Strategy

The viewer maximizes code reuse by importing pre-built components from `@craft-agent/ui`:

| UI Component             | Reused From Desktop | Purpose                               |
| ------------------------ | ------------------- | ------------------------------------- |
| Session metadata display | Yes                 | Show session title, timestamps, model |
| Message rendering        | Yes                 | Display user/assistant messages       |
| Markdown formatting      | Yes                 | Parse and style markdown content      |
| Code block highlighting  | Yes                 | Syntax-highlighted code snippets      |
| Tool call visualization  | Yes                 | Show tool invocations and results     |
| Attachment previews      | Yes                 | Display images, files, metadata       |

This ensures visual consistency between the desktop application and web viewer while minimizing duplicate code.

## Build System

The viewer uses Vite as its build tool, providing fast development and optimized production builds:

### Build Scripts

```mermaid
graph TB
    subgraph "Development Mode"
        DevCommand["bun run dev"]
        ViteDev["vite<br/>Dev Server"]
        HMR["Hot Module Replacement"]

        DevCommand --> ViteDev
        ViteDev --> HMR
    end

    subgraph "Production Build"
        BuildCommand["bun run build"]
        TypeCheck["tsc --noEmit<br/>Type Validation"]
        ViteBuild["vite build<br/>Bundle & Optimize"]
        DistFolder["dist/<br/>Static Assets"]

        BuildCommand --> TypeCheck
        TypeCheck --> ViteBuild
        ViteBuild --> DistFolder
    end

    subgraph "Preview Mode"
        PreviewCommand["bun run preview"]
        VitePreview["vite preview<br/>Serve Production Build"]

        PreviewCommand --> DistFolder
        DistFolder --> VitePreview
    end

    style ViteBuild fill:#f9f9f9
    style DistFolder fill:#f9f9f9
```

**Sources:** [apps/viewer/package.json:7-11]()

### Build Configuration

The Vite configuration optimizes for:

1. **Code Splitting** - Separate chunks for vendor dependencies and application code
2. **Tree Shaking** - Eliminate unused code from shared packages
3. **Asset Optimization** - Minify CSS, compress images
4. **TypeScript Compilation** - Transform TSX to optimized JavaScript

The build output in `dist/` is a fully static site that can be deployed to any web hosting service (Vercel, Netlify, GitHub Pages, etc.).

## Session Data Flow

The viewer operates in a stateless manner, loading session data on-demand:

```mermaid
sequenceDiagram
    participant User
    participant Viewer as "Web Viewer"
    participant FileAPI as "File API"
    participant Parser as "JSONL Parser"
    participant UI as "UI Components"

    alt Upload Session File
        User->>Viewer: "Click upload button"
        Viewer->>FileAPI: "Open file picker"
        FileAPI->>User: "Select .jsonl file"
        User->>FileAPI: "Choose session.jsonl"
        FileAPI->>Viewer: "File object"
        Viewer->>Parser: "Parse JSONL"
    end

    alt Load from URL
        User->>Viewer: "Enter session URL"
        Viewer->>Viewer: "fetch(sessionUrl)"
        Viewer->>Parser: "Parse JSONL response"
    end

    Parser->>Parser: "Validate session structure"
    Parser->>Parser: "Parse messages"
    Parser->>Parser: "Extract metadata"
    Parser-->>UI: "Session object"

    UI->>UI: "Render session header"
    UI->>UI: "Render message list"
    UI->>UI: "Apply syntax highlighting"
    UI->>User: "Display session transcript"
```

**Sources:** [apps/viewer/package.json:13-15]()

### Session Loading Strategies

| Loading Method  | Use Case                      | Implementation                                 |
| --------------- | ----------------------------- | ---------------------------------------------- |
| **File Upload** | User has local session file   | HTML file input → FileReader API → Parse JSONL |
| **Remote URL**  | Session hosted publicly       | fetch() → Parse JSONL response                 |
| **Direct Link** | URL parameter with session ID | Query param → Fetch from server → Parse        |

The viewer does not persist session data - all state is ephemeral and exists only in browser memory during the viewing session.

## Styling and Theming

The viewer uses Tailwind CSS 4.0 with specialized plugins for prose rendering:

### Typography Configuration

```mermaid
graph TB
    subgraph "Base Styles"
        Tailwind4["Tailwind CSS 4.0"]
        TailwindVite["@tailwindcss/vite<br/>Vite Plugin"]

        Tailwind4 --> TailwindVite
    end

    subgraph "Content Styling"
        Typography["@tailwindcss/typography<br/>Prose Classes"]
        ProseBase["prose<br/>Base Typography"]
        ProseDark["prose-invert<br/>Dark Mode"]
        ProseCode["Code Block Styling"]

        Typography --> ProseBase
        Typography --> ProseDark
        Typography --> ProseCode
    end

    subgraph "Component Utilities"
        CVA["class-variance-authority<br/>Variant System"]
        CLSX["clsx<br/>Conditional Classes"]
        TailwindMerge["tailwind-merge<br/>Class Conflict Resolution"]

        CVA --> TailwindMerge
        CLSX --> TailwindMerge
    end

    subgraph "Applied To"
        SessionMessages["Session Messages"]
        CodeBlocks["Code Blocks"]
        ToolOutputs["Tool Outputs"]

        ProseBase --> SessionMessages
        ProseCode --> CodeBlocks
        TailwindMerge --> ToolOutputs
    end

    style Typography fill:#f9f9f9
    style ProseBase fill:#f9f9f9
```

**Sources:** [apps/viewer/package.json:20-32]()

The typography plugin provides consistent styling for:

- Headings (h1-h6)
- Paragraphs and line spacing
- Lists (ordered and unordered)
- Blockquotes
- Code blocks (inline and fenced)
- Tables
- Links

## Deployment Characteristics

The viewer's architecture enables flexible deployment:

| Characteristic            | Value                         |
| ------------------------- | ----------------------------- |
| **Runtime Requirements**  | None (static files only)      |
| **Server Requirements**   | Any static file host          |
| **Database Requirements** | None                          |
| **Authentication**        | Not required (public viewing) |
| **Scalability**           | Unlimited (CDN-based)         |
| **Cost**                  | Near-zero (static hosting)    |

The stateless, client-side architecture means the viewer can be hosted on:

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any static file CDN

## Limitations and Constraints

As a read-only viewing application, the viewer has intentional limitations:

| Desktop Feature     | Viewer Support    | Rationale                         |
| ------------------- | ----------------- | --------------------------------- |
| Agent interaction   | ❌ Not supported  | No backend/agent runtime          |
| Session creation    | ❌ Not supported  | Desktop-only capability           |
| File attachments    | ✅ Display only   | No file system access             |
| Source integration  | ❌ Not supported  | No authentication/credentials     |
| Tool execution      | ❌ Not supported  | Read-only view of past executions |
| Session editing     | ❌ Not supported  | Immutable transcript view         |
| Permission controls | ❌ Not applicable | No agent execution                |
| Workspace context   | ❌ Not supported  | No workspace concept              |

The viewer is designed exclusively for sharing and viewing completed session transcripts, not for interactive agent usage.

**Sources:** [apps/viewer/package.json:1-36]()
