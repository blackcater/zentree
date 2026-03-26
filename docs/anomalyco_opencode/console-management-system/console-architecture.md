# Console Architecture

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [bun.lock](bun.lock)
- [packages/console/app/package.json](packages/console/app/package.json)
- [packages/console/core/package.json](packages/console/core/package.json)
- [packages/console/function/package.json](packages/console/function/package.json)
- [packages/console/mail/package.json](packages/console/mail/package.json)
- [packages/desktop/package.json](packages/desktop/package.json)
- [packages/function/package.json](packages/function/package.json)
- [packages/opencode/package.json](packages/opencode/package.json)
- [packages/plugin/package.json](packages/plugin/package.json)
- [packages/sdk/js/package.json](packages/sdk/js/package.json)
- [packages/web/package.json](packages/web/package.json)
- [sdks/vscode/package.json](sdks/vscode/package.json)

</details>

The OpenCode Console is a three-tier SaaS platform that provides managed access to OpenCode Zen and Go services. This page documents the overall architecture, component interactions, and deployment structure. For implementation details of the backend services, see [Console Backend](#7.2). For frontend implementation details, see [Console Frontend](#7.3).

## Architecture Overview

The Console platform consists of three primary tiers deployed on Cloudflare's infrastructure:

1. **console-app**: SolidStart frontend application serving the web interface
2. **console-function**: Cloudflare Workers handling API requests and AI proxy operations
3. **console-core**: Shared business logic layer with database operations and integrations

Two additional packages provide shared functionality:

- **console-resource**: TypeScript type definitions for Cloudflare bindings
- **console-mail**: Email template generation using JSX Email

**Three-Tier Console Architecture**

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["Browser Client"]
    end

    subgraph "Frontend Tier"
        ConsoleApp["console-app<br/>SolidStart Application<br/>Cloudflare Pages"]
        VitePlugin["@cloudflare/vite-plugin"]
        Nitro["Nitro Server<br/>SSR Runtime"]
    end

    subgraph "Backend Tier"
        ConsoleFunction["console-function<br/>Cloudflare Workers<br/>Hono HTTP Server"]
        HonoRouter["Hono Routes"]
        ZodValidator["@hono/zod-validator"]
        AISDK["AI SDK<br/>@ai-sdk/anthropic<br/>@ai-sdk/openai"]
    end

    subgraph "Business Logic Tier"
        ConsoleCore["console-core<br/>Shared Business Logic"]
        DrizzleORM["Drizzle ORM"]
        StripeSDK["Stripe SDK"]
        AWSSTS["@aws-sdk/client-sts"]
    end

    subgraph "Shared Packages"
        ConsoleResource["console-resource<br/>TypeScript Types<br/>Cloudflare Bindings"]
        ConsoleMail["console-mail<br/>JSX Email Templates<br/>@jsx-email/all"]
    end

    subgraph "External Services"
        Database["PostgreSQL<br/>PlanetScale"]
        StripeAPI["Stripe API"]
        LLMProviders["LLM Providers<br/>OpenAI, Anthropic"]
        EmailService["Email Delivery"]
    end

    Browser --> ConsoleApp
    ConsoleApp --> VitePlugin
    ConsoleApp --> Nitro
    ConsoleApp --> ConsoleFunction

    ConsoleFunction --> HonoRouter
    HonoRouter --> ZodValidator
    HonoRouter --> AISDK

    ConsoleApp --> ConsoleCore
    ConsoleFunction --> ConsoleCore

    ConsoleCore --> DrizzleORM
    ConsoleCore --> StripeSDK
    ConsoleCore --> AWSSTS
    ConsoleCore --> ConsoleMail

    ConsoleApp --> ConsoleResource
    ConsoleFunction --> ConsoleResource

    DrizzleORM --> Database
    StripeSDK --> StripeAPI
    AISDK --> LLMProviders
    ConsoleMail --> EmailService
```

Sources: [packages/console/app/package.json:1-46](), [packages/console/function/package.json:1-31](), [packages/console/core/package.json:1-52](), [packages/console/mail/package.json:1-22]()

## Package Dependencies and Responsibilities

| Package            | Framework  | Deployment Target  | Primary Responsibility                        |
| ------------------ | ---------- | ------------------ | --------------------------------------------- |
| `console-app`      | SolidStart | Cloudflare Pages   | Web UI, SSR, client-side routing              |
| `console-function` | Hono       | Cloudflare Workers | API endpoints, AI model proxy                 |
| `console-core`     | N/A        | Shared Library     | Database access, business logic, integrations |
| `console-mail`     | JSX Email  | Shared Library     | Email template rendering                      |
| `console-resource` | TypeScript | Shared Library     | Type definitions for Cloudflare resources     |

**Key Dependencies by Tier**

```mermaid
graph LR
    subgraph "console-app Dependencies"
        SolidStart["@solidjs/start"]
        SolidRouter["@solidjs/router"]
        OpenAuth1["@openauthjs/openauth"]
        StripeJS["@stripe/stripe-js"]
        ChartJS["chart.js"]
        SolidStripe["solid-stripe"]
    end

    subgraph "console-function Dependencies"
        Hono["hono"]
        ZodValidator["@hono/zod-validator"]
        AISDKAnthropic["@ai-sdk/anthropic"]
        AISDKOpenAI["@ai-sdk/openai"]
        AI["ai"]
        OpenAuth2["@openauthjs/openauth"]
    end

    subgraph "console-core Dependencies"
        Drizzle["drizzle-orm"]
        Postgres["postgres"]
        PlanetScale["@planetscale/database"]
        Stripe["stripe"]
        AWS4Fetch["aws4fetch"]
        AWSSTS["@aws-sdk/client-sts"]
    end

    subgraph "Shared Dependencies"
        ConsoleCore["@opencode-ai/console-core"]
        ConsoleResource["@opencode-ai/console-resource"]
        ConsoleMail["@opencode-ai/console-mail"]
        UI["@opencode-ai/ui"]
    end

    SolidStart -.uses.-> ConsoleCore
    Hono -.uses.-> ConsoleCore

    SolidStart -.uses.-> ConsoleResource
    Hono -.uses.-> ConsoleResource

    SolidStart -.uses.-> ConsoleMail
    Drizzle -.uses.-> ConsoleMail

    SolidStart -.uses.-> UI
```

Sources: [packages/console/app/package.json:13-35](), [packages/console/function/package.json:19-29](), [packages/console/core/package.json:8-19]()

## Request Flow Architecture

The Console handles two primary request flows: user-facing web requests and AI model API requests.

**Web Request Flow**

```mermaid
sequenceDiagram
    participant User
    participant ConsoleApp as "console-app<br/>SolidStart"
    participant Nitro as "Nitro SSR"
    participant OpenAuth as "@openauthjs/openauth"
    participant ConsoleCore as "console-core"
    participant Database as "PostgreSQL"

    User->>ConsoleApp: HTTP Request
    ConsoleApp->>Nitro: SSR Handler
    Nitro->>OpenAuth: Verify Session
    OpenAuth-->>Nitro: Session Data
    Nitro->>ConsoleCore: Business Logic Call
    ConsoleCore->>Database: Query via Drizzle ORM
    Database-->>ConsoleCore: Result
    ConsoleCore-->>Nitro: Data
    Nitro-->>ConsoleApp: Rendered HTML
    ConsoleApp-->>User: Response
```

Sources: [packages/console/app/package.json:13-35]()

**AI API Request Flow**

```mermaid
sequenceDiagram
    participant Client as "OpenCode Client"
    participant ConsoleFunction as "console-function<br/>Hono Server"
    participant Validator as "@hono/zod-validator"
    participant OpenAuth as "@openauthjs/openauth"
    participant ConsoleCore as "console-core"
    participant AISDK as "AI SDK"
    participant LLM as "LLM Provider"

    Client->>ConsoleFunction: POST /api/chat
    ConsoleFunction->>Validator: Validate Request
    Validator-->>ConsoleFunction: Valid
    ConsoleFunction->>OpenAuth: Verify Auth Token
    OpenAuth-->>ConsoleFunction: User Context
    ConsoleFunction->>ConsoleCore: Check Limits & Usage
    ConsoleCore-->>ConsoleFunction: Authorized
    ConsoleFunction->>AISDK: Stream Completion
    AISDK->>LLM: API Call
    LLM-->>AISDK: Stream Response
    AISDK-->>ConsoleFunction: Stream
    ConsoleFunction->>ConsoleCore: Log Usage
    ConsoleFunction-->>Client: Stream Response
```

Sources: [packages/console/function/package.json:19-29]()

## Deployment Architecture

All Console components deploy to Cloudflare's edge network.

**Cloudflare Deployment Structure**

```mermaid
graph TB
    subgraph "Cloudflare Global Network"
        subgraph "console-app Deployment"
            Pages["Cloudflare Pages"]
            NitroWorker["Nitro Worker<br/>SSR Runtime"]
            VitePlugin["@cloudflare/vite-plugin<br/>Build Tool"]
        end

        subgraph "console-function Deployment"
            Worker["Cloudflare Worker<br/>Hono HTTP Server"]
            Bindings["Environment Bindings<br/>Secrets, KV, R2"]
        end

        subgraph "Cloudflare Resources"
            KV["KV Namespace<br/>Session Storage"]
            R2["R2 Storage<br/>File Storage"]
            D1["D1 Database<br/>Edge SQLite"]
        end
    end

    subgraph "External Infrastructure"
        PostgreSQL["PostgreSQL<br/>Primary Database<br/>postgres connector"]
        PlanetScale["PlanetScale<br/>Database Proxy<br/>@planetscale/database"]
        Stripe["Stripe API<br/>Payment Processing"]
    end

    Pages --> NitroWorker
    VitePlugin -.builds.-> Pages

    Worker --> Bindings
    Bindings --> KV
    Bindings --> R2

    NitroWorker --> PostgreSQL
    Worker --> PostgreSQL

    NitroWorker --> PlanetScale
    Worker --> PlanetScale

    NitroWorker --> Stripe
    Worker --> Stripe
```

Sources: [packages/console/app/package.json:14](), [packages/console/function/package.json:11-12](), [packages/console/core/package.json:13-16]()

## Database Layer

The `console-core` package manages all database operations using Drizzle ORM with support for both direct PostgreSQL connections and PlanetScale's serverless driver.

**Database Connection Strategy**

```mermaid
graph TB
    subgraph "console-core"
        DrizzleORM["Drizzle ORM<br/>drizzle-orm"]
        Schema["Database Schema"]
        Migrations["Migration Scripts<br/>drizzle-kit"]
    end

    subgraph "Connection Drivers"
        PostgresDriver["postgres<br/>Direct Connection"]
        PlanetScaleDriver["@planetscale/database<br/>HTTP Connection"]
    end

    subgraph "Database Instances"
        DevDB["Development DB"]
        ProdDB["Production DB<br/>PlanetScale"]
    end

    DrizzleORM --> Schema
    DrizzleORM --> PostgresDriver
    DrizzleORM --> PlanetScaleDriver

    Migrations --> DrizzleORM

    PostgresDriver --> DevDB
    PlanetScaleDriver --> ProdDB
```

**Database Management Scripts**

The `console-core` package includes several scripts for database operations:

| Script       | Purpose                            | Command              |
| ------------ | ---------------------------------- | -------------------- |
| `db`         | Run drizzle-kit in SST shell       | `bun run db`         |
| `db-dev`     | Run drizzle-kit against dev stage  | `bun run db-dev`     |
| `db-prod`    | Run drizzle-kit against production | `bun run db-prod`    |
| `shell`      | Open SST shell for database access | `bun run shell`      |
| `shell-dev`  | Open dev stage shell               | `bun run shell-dev`  |
| `shell-prod` | Open production shell              | `bun run shell-prod` |

Sources: [packages/console/core/package.json:25-31](), [packages/console/core/package.json:13-16]()

## Authentication Flow

Both `console-app` and `console-function` use OpenAuth for authentication, providing a unified auth layer across frontend and backend.

**OpenAuth Integration Architecture**

```mermaid
graph TB
    subgraph "Authentication Layer"
        OpenAuth["@openauthjs/openauth<br/>Version 0.0.0-20250322224806"]
        AuthProviders["OAuth Providers"]
        SessionStore["Session Storage"]
    end

    subgraph "Frontend Auth"
        ConsoleAppAuth["console-app<br/>OpenAuth Client"]
        SolidStartServer["SolidStart Server Functions"]
    end

    subgraph "Backend Auth"
        ConsoleFunctionAuth["console-function<br/>OpenAuth Middleware"]
        HonoAuth["Hono Auth Middleware"]
    end

    subgraph "Protected Resources"
        DatabaseAccess["Database Operations"]
        StripeAPI["Stripe Integration"]
        AIRequests["AI Model Requests"]
    end

    ConsoleAppAuth --> OpenAuth
    ConsoleFunctionAuth --> OpenAuth

    OpenAuth --> AuthProviders
    OpenAuth --> SessionStore

    SolidStartServer --> ConsoleAppAuth
    HonoAuth --> ConsoleFunctionAuth

    ConsoleAppAuth --> DatabaseAccess
    ConsoleFunctionAuth --> AIRequests
    ConsoleAppAuth --> StripeAPI
```

Sources: [packages/console/app/package.json:18](), [packages/console/function/package.json:26]()

## AI Model Proxy Layer

The `console-function` package implements an AI model proxy that routes requests to multiple LLM providers through the AI SDK.

**AI SDK Integration**

```mermaid
graph TB
    subgraph "console-function AI Layer"
        HonoEndpoint["Hono API Routes"]
        RequestValidator["@hono/zod-validator<br/>Schema Validation"]
        AISDKCore["ai<br/>AI SDK Core"]
    end

    subgraph "Provider SDKs"
        AnthropicSDK["@ai-sdk/anthropic<br/>Version 2.0.0"]
        OpenAISDK["@ai-sdk/openai<br/>Version 2.0.2"]
        CompatibleSDK["@ai-sdk/openai-compatible<br/>Version 1.0.1"]
    end

    subgraph "LLM Services"
        Claude["Anthropic Claude"]
        GPT["OpenAI GPT"]
        CustomModels["Custom Endpoints"]
    end

    subgraph "Usage Tracking"
        ConsoleCore["console-core<br/>Usage Logging"]
        Database["PostgreSQL<br/>Usage Records"]
    end

    HonoEndpoint --> RequestValidator
    RequestValidator --> AISDKCore

    AISDKCore --> AnthropicSDK
    AISDKCore --> OpenAISDK
    AISDKCore --> CompatibleSDK

    AnthropicSDK --> Claude
    OpenAISDK --> GPT
    CompatibleSDK --> CustomModels

    AISDKCore --> ConsoleCore
    ConsoleCore --> Database
```

Sources: [packages/console/function/package.json:20-22](), [packages/console/function/package.json:27]()

## Payment Integration

The Console integrates Stripe for payment processing, with client-side and server-side components.

**Stripe Integration Architecture**

```mermaid
graph TB
    subgraph "Frontend Payment Flow"
        SolidStripe["solid-stripe<br/>SolidJS Wrapper"]
        StripeJS["@stripe/stripe-js<br/>Client SDK"]
        PaymentUI["Payment UI Components"]
    end

    subgraph "Backend Payment Processing"
        StripeSDK["stripe<br/>Server SDK<br/>Version 18.0.0"]
        WebhookHandler["Stripe Webhook Handler"]
        PaymentCore["Payment Logic<br/>console-core"]
    end

    subgraph "Database"
        CustomerTable["Customer Records"]
        SubscriptionTable["Subscription Records"]
        UsageTable["Usage Tracking"]
    end

    subgraph "External"
        StripeAPI["Stripe API"]
        StripeWebhooks["Stripe Webhooks"]
    end

    PaymentUI --> SolidStripe
    SolidStripe --> StripeJS
    StripeJS --> StripeAPI

    StripeWebhooks --> WebhookHandler
    WebhookHandler --> StripeSDK
    StripeSDK --> PaymentCore

    PaymentCore --> CustomerTable
    PaymentCore --> SubscriptionTable
    PaymentCore --> UsageTable
```

Sources: [packages/console/app/package.json:28-29](), [packages/console/app/package.json:33](), [packages/console/core/package.json:17]()

## Email System

The `console-mail` package provides JSX-based email templates used throughout the Console platform.

**Email Template Architecture**

```mermaid
graph TB
    subgraph "console-mail Package"
        JSXEmail["@jsx-email/all<br/>Template Components"]
        JSXRender["@jsx-email/render<br/>HTML Rendering"]
        EmailCLI["@jsx-email/cli<br/>Preview Server"]
        Templates["Email Templates<br/>emails/templates/"]
    end

    subgraph "Template Consumers"
        ConsoleCore["console-core<br/>Template Invocation"]
        ConsoleApp["console-app<br/>Preview & Testing"]
    end

    subgraph "Delivery"
        EmailProvider["Email Service Provider"]
    end

    Templates --> JSXEmail
    JSXEmail --> JSXRender
    EmailCLI --> Templates

    ConsoleCore --> JSXRender
    ConsoleApp --> JSXRender

    JSXRender --> EmailProvider
```

**Email Template Exports**

The package exports templates via a wildcard pattern defined in `package.json`:

```json
"exports": {
  "./*": "./emails/templates/*"
}
```

This allows consumers to import templates like:

- `@opencode-ai/console-mail/welcome`
- `@opencode-ai/console-mail/payment-receipt`
- `@opencode-ai/console-mail/usage-alert`

Sources: [packages/console/mail/package.json:4-10](), [packages/console/mail/package.json:12-14](), [packages/console/core/package.json:10-11](), [packages/console/app/package.json:16]()

## Shared Type Definitions

The `console-resource` package provides TypeScript type definitions for Cloudflare Workers bindings and other shared resources.

**Resource Type Structure**

```mermaid
graph TB
    subgraph "console-resource Package"
        CloudflareTypes["@cloudflare/workers-types<br/>Base Types"]
        CustomTypes["Custom Type Definitions"]
        BindingTypes["Cloudflare Binding Types<br/>KV, R2, D1, etc."]
    end

    subgraph "Type Consumers"
        ConsoleApp["console-app<br/>Import Types"]
        ConsoleFunction["console-function<br/>Import Types"]
        ConsoleCore["console-core<br/>Import Types"]
    end

    CloudflareTypes --> CustomTypes
    CustomTypes --> BindingTypes

    BindingTypes --> ConsoleApp
    BindingTypes --> ConsoleFunction
    BindingTypes --> ConsoleCore
```

The package depends on `@cloudflare/workers-types` to provide accurate type definitions for Cloudflare's runtime environment, ensuring type safety across all Console components.

Sources: [packages/console/app/package.json:21](), [packages/console/function/package.json:25](), [packages/console/core/package.json:12]()

## Build and Development Workflow

Each Console package has distinct build and development processes tailored to its deployment target.

**Development Commands by Package**

| Package                | Dev Command                      | Build Command                 | Purpose                                         |
| ---------------------- | -------------------------------- | ----------------------------- | ----------------------------------------------- |
| `console-app`          | `vite dev --host 0.0.0.0`        | `vite build`                  | SolidStart dev server with HMR                  |
| `console-app` (remote) | `dev:remote` with SST shell      | N/A                           | Connect to dev environment with remote services |
| `console-function`     | N/A                              | Wrangler builds automatically | Cloudflare Workers deployment                   |
| `console-core`         | `sst shell`                      | `tsgo --noEmit`               | Type checking only, runtime library             |
| `console-mail`         | `email preview emails/templates` | N/A                           | JSX Email preview server                        |

**Build Tool Chain**

```mermaid
graph LR
    subgraph "console-app Build"
        Vite["Vite<br/>Version 7.1.4"]
        CloudflarePlugin["@cloudflare/vite-plugin<br/>Version 1.15.2"]
        Nitro["Nitro<br/>Version 3.0.1-alpha.1"]
        SolidStart["@solidjs/start"]
    end

    subgraph "console-function Build"
        Wrangler["Wrangler<br/>Version 4.50.0"]
        WorkersTypes["@cloudflare/workers-types"]
    end

    subgraph "console-core Build"
        TypeScript["TypeScript<br/>Type Checking"]
        DrizzleKit["drizzle-kit<br/>Migration Tool"]
    end

    Vite --> CloudflarePlugin
    CloudflarePlugin --> Nitro
    Nitro --> SolidStart

    Wrangler --> WorkersTypes

    TypeScript --> DrizzleKit
```

Sources: [packages/console/app/package.json:7-11](), [packages/console/app/package.json:34](), [packages/console/function/package.json:8-9](), [packages/console/core/package.json:40](), [packages/console/mail/package.json:17-18]()

## Inter-Package Communication

The Console packages communicate through well-defined interfaces, with `console-core` serving as the central business logic layer.

**Package Dependency Graph**

```mermaid
graph TB
    ConsoleApp["console-app<br/>Frontend"]
    ConsoleFunction["console-function<br/>Backend Workers"]
    ConsoleCore["console-core<br/>Business Logic"]
    ConsoleMail["console-mail<br/>Email Templates"]
    ConsoleResource["console-resource<br/>Type Definitions"]
    UI["@opencode-ai/ui<br/>Shared Components"]

    ConsoleApp -->|workspace:*| ConsoleCore
    ConsoleApp -->|workspace:*| ConsoleMail
    ConsoleApp -->|workspace:*| ConsoleResource
    ConsoleApp -->|workspace:*| UI

    ConsoleFunction -->|workspace:*| ConsoleCore
    ConsoleFunction -->|workspace:*| ConsoleResource

    ConsoleCore -->|workspace:*| ConsoleMail
    ConsoleCore -->|workspace:*| ConsoleResource
```

All workspace dependencies use the `workspace:*` protocol, ensuring that local versions are always used during development and proper versioning is maintained during publishing.

Sources: [packages/console/app/package.json:19-22](), [packages/console/function/package.json:24-25](), [packages/console/core/package.json:11-12]()
