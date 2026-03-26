# Authentication and Authorization

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [.github/templates/cleanup-comment.md](.github/templates/cleanup-comment.md)
- [.github/templates/preview-comment.md](.github/templates/preview-comment.md)
- [.github/workflows/ci.yml](.github/workflows/ci.yml)
- [.github/workflows/cleanup-preview.yml](.github/workflows/cleanup-preview.yml)
- [.github/workflows/deploy-preview.yml](.github/workflows/deploy-preview.yml)
- [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml)
- [apps/admin/src/trpc/react.tsx](apps/admin/src/trpc/react.tsx)
- [apps/api/package.json](apps/api/package.json)
- [apps/api/src/app/api/electric/[...path]/route.ts](apps/api/src/app/api/electric/[...path]/route.ts)
- [apps/api/src/app/api/electric/[...path]/utils.ts](apps/api/src/app/api/electric/[...path]/utils.ts)
- [apps/api/src/env.ts](apps/api/src/env.ts)
- [apps/api/src/proxy.ts](apps/api/src/proxy.ts)
- [apps/api/src/trpc/context.ts](apps/api/src/trpc/context.ts)
- [apps/desktop/src/renderer/routes/\_authenticated/providers/CollectionsProvider/CollectionsProvider.tsx](apps/desktop/src/renderer/routes/_authenticated/providers/CollectionsProvider/CollectionsProvider.tsx)
- [apps/desktop/src/renderer/routes/\_authenticated/providers/CollectionsProvider/collections.ts](apps/desktop/src/renderer/routes/_authenticated/providers/CollectionsProvider/collections.ts)
- [apps/web/src/trpc/react.tsx](apps/web/src/trpc/react.tsx)
- [fly.toml](fly.toml)

</details>

This document covers the authentication and authorization systems used across Superset's cloud services (API, Web, Admin) and the Desktop application. The system uses Better Auth for session management, JWT tokens for desktop authentication, and implements organization-based row-level security for data access through ElectricSQL.

For information about data synchronization between cloud and desktop, see section 2.10. For details on the Desktop-specific collections and data access patterns, see section 2.10.1.

---

## Overview

Superset's authentication system handles three distinct client types:

1. **Web Applications** (Web, Admin, Marketing) - Cookie-based sessions via Better Auth
2. **Desktop Application** - JWT bearer tokens for API and ElectricSQL access
3. **External Integrations** - OAuth 2.0 flows for GitHub, Google, Linear, Slack

Authorization is implemented using organization-based access control, where users belong to one or more organizations, and all data access is filtered by organization membership. ElectricSQL enforces row-level security (RLS) by proxying requests through the API, which injects WHERE clauses based on the authenticated user's organization memberships.

**Sources:** [apps/api/src/env.ts:1-77](), [apps/api/src/app/api/electric/[...path]/route.ts:1-105](), [apps/api/src/trpc/context.ts:1-19]()

---

## Authentication Architecture

```mermaid
graph TB
    subgraph "Client Applications"
        WebApp["Web App<br/>(Next.js)"]
        AdminApp["Admin App<br/>(Next.js)"]
        DesktopApp["Desktop App<br/>(Electron)"]
    end

    subgraph "API Layer"
        BetterAuth["Better Auth<br/>Session Provider"]
        TRPCContext["createContext()<br/>apps/api/src/trpc/context.ts"]
        ElectricProxy["Electric Proxy<br/>/api/electric/[...path]"]
        CORSMiddleware["proxy.ts<br/>CORS Middleware"]
    end

    subgraph "Authentication Methods"
        SessionCookies["Session Cookies<br/>HTTP-only, Secure"]
        JWTTokens["JWT Bearer Tokens<br/>Authorization header"]
        OAuthProviders["OAuth 2.0<br/>Google, GitHub"]
    end

    subgraph "Storage"
        NeonDB["Neon PostgreSQL<br/>users, organizations, members"]
        SessionStore["Session Store<br/>auth.sessions table"]
    end

    WebApp -->|credentials: include| CORSMiddleware
    AdminApp -->|credentials: include| CORSMiddleware
    DesktopApp -->|Bearer token| CORSMiddleware

    CORSMiddleware --> TRPCContext
    CORSMiddleware --> ElectricProxy

    TRPCContext --> BetterAuth
    ElectricProxy --> BetterAuth

    WebApp -.uses.-> SessionCookies
    AdminApp -.uses.-> SessionCookies
    DesktopApp -.uses.-> JWTTokens

    BetterAuth --> OAuthProviders
    BetterAuth --> SessionStore
    BetterAuth --> NeonDB
```

**Authentication Flow Components:**

| Component         | Purpose                                 | Location                                                   |
| ----------------- | --------------------------------------- | ---------------------------------------------------------- |
| `BetterAuth`      | OAuth and session management library    | `@superset/auth` package                                   |
| `createContext()` | Creates tRPC context with session       | [apps/api/src/trpc/context.ts:4-18]()                      |
| `authenticate()`  | Validates JWT or session cookies        | [apps/api/src/app/api/electric/[...path]/route.ts:11-32]() |
| `proxy()`         | CORS middleware with credential support | [apps/api/src/proxy.ts:52-67]()                            |

**Sources:** [apps/api/src/trpc/context.ts:1-19](), [apps/api/src/app/api/electric/[...path]/route.ts:1-105](), [apps/api/src/proxy.ts:1-75]()

---

## Session Management

Better Auth manages sessions for web and admin applications. Sessions are stored server-side with cookies sent to clients.

### Session Creation Flow

```mermaid
sequenceDiagram
    participant Client as Web/Admin Client
    participant API as API Server
    participant BetterAuth as Better Auth
    participant OAuth as OAuth Provider
    participant DB as Neon PostgreSQL

    Client->>API: GET /api/auth/signin/google
    API->>OAuth: Redirect with client_id
    OAuth->>Client: User authorizes
    Client->>API: Callback with auth code
    API->>BetterAuth: Exchange code for token
    BetterAuth->>OAuth: Validate token
    OAuth-->>BetterAuth: User profile
    BetterAuth->>DB: INSERT/UPDATE auth.users
    BetterAuth->>DB: INSERT auth.sessions
    BetterAuth->>DB: INSERT auth.members (if new org)
    BetterAuth-->>API: Session object
    API-->>Client: Set-Cookie: session_id (HttpOnly, Secure)
```

### Session Retrieval

The `createContext()` function extracts session data for all tRPC procedures:

```typescript
// apps/api/src/trpc/context.ts:4-18
export const createContext = async ({
  req,
}: {
  req: Request
  resHeaders: Headers
}) => {
  const session = await auth.api.getSession({
    headers: req.headers,
  })
  return createTRPCContext({
    session,
    auth,
    headers: req.headers,
  })
}
```

The `session` object contains:

- `user`: User ID, email, name, avatar
- `session`: Active organization ID, organization IDs array
- `token`: Session token for validation

**Sources:** [apps/api/src/trpc/context.ts:1-19](), [apps/api/src/env.ts:22-22]()

---

## JWT Authentication for Desktop

The Desktop application uses JWT tokens instead of cookies for authentication with both the API and ElectricSQL.

### JWT Token Structure

JWT tokens include the following claims:

| Claim             | Description          | Usage                             |
| ----------------- | -------------------- | --------------------------------- |
| `sub`             | User ID              | Identifies the authenticated user |
| `organizationIds` | Array of org IDs     | Used for multi-org authorization  |
| `exp`             | Expiration timestamp | Token validity period             |
| `iat`             | Issued at timestamp  | Token creation time               |

### JWT Authentication Implementation

```mermaid
graph LR
    subgraph "Desktop Renderer Process"
        AuthClient["authClient<br/>Better Auth client"]
        GetAuthToken["getAuthToken()<br/>Returns access token"]
        GetJWT["getJwt()<br/>Returns JWT string"]
    end

    subgraph "API Requests"
        TRPCClient["tRPC Client<br/>API mutations"]
        ElectricClient["Electric Client<br/>Shape subscriptions"]
    end

    subgraph "API Server"
        AuthenticateFunc["authenticate()<br/>Verifies JWT or session"]
        VerifyJWT["auth.api.verifyJWT()"]
    end

    GetAuthToken --> TRPCClient
    GetJWT --> ElectricClient

    TRPCClient -->|Authorization: Bearer token| AuthenticateFunc
    ElectricClient -->|Authorization: Bearer token| AuthenticateFunc

    AuthenticateFunc --> VerifyJWT
```

The Desktop app provides JWT tokens in two ways:

1. **For tRPC API calls** - Via `Authorization` header:

```typescript
// apps/desktop/src/renderer/routes/_authenticated/providers/CollectionsProvider/collections.ts:138-149
const apiClient = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.NEXT_PUBLIC_API_URL}/api/trpc`,
      headers: () => {
        const token = getAuthToken()
        return token ? { Authorization: `Bearer ${token}` } : {}
      },
      transformer: superjson,
    }),
  ],
})
```

2. **For ElectricSQL sync** - Via dynamic header function:

```typescript
// apps/desktop/src/renderer/routes/_authenticated/providers/CollectionsProvider/collections.ts:151-156
const electricHeaders = {
  Authorization: () => {
    const token = getJwt()
    return token ? `Bearer ${token}` : ''
  },
}
```

**Sources:** [apps/desktop/src/renderer/routes/\_authenticated/providers/CollectionsProvider/collections.ts:138-156](), [apps/api/src/app/api/electric/[...path]/route.ts:11-32]()

---

## Organization-Based Authorization

All authenticated requests are filtered by organization membership. Users can belong to multiple organizations but have one active organization at a time.

### Authorization Model

```mermaid
graph TB
    subgraph "User Identity"
        User["User<br/>auth.users table"]
    end

    subgraph "Organization Membership"
        Member1["Member<br/>org_id: org-1"]
        Member2["Member<br/>org_id: org-2"]
        Member3["Member<br/>org_id: org-3"]
    end

    subgraph "Active Session"
        Session["Session<br/>activeOrganizationId: org-1<br/>organizationIds: [org-1, org-2, org-3]"]
    end

    subgraph "Data Access"
        Projects["Projects<br/>WHERE organization_id = org-1"]
        Workspaces["Workspaces<br/>WHERE organization_id = org-1"]
        Tasks["Tasks<br/>WHERE organization_id = org-1"]
    end

    User --> Member1
    User --> Member2
    User --> Member3

    Member1 --> Session
    Member2 --> Session
    Member3 --> Session

    Session --> Projects
    Session --> Workspaces
    Session --> Tasks
```

### Organization Switching

Desktop users can switch their active organization through the `CollectionsProvider`:

```typescript
// apps/desktop/src/renderer/routes/_authenticated/providers/CollectionsProvider/CollectionsProvider.tsx:47-62
const switchOrganization = useCallback(
  async (organizationId: string) => {
    if (organizationId === activeOrganizationId) return
    setIsSwitching(true)
    try {
      await authClient.organization.setActive({ organizationId })
      await preloadCollections(organizationId, {
        enableV2Cloud: isV2CloudEnabled,
      })
      await refetchSession()
    } finally {
      setIsSwitching(false)
    }
  },
  [activeOrganizationId, isV2CloudEnabled, refetchSession]
)
```

This updates the session's `activeOrganizationId` and preloads ElectricSQL collections for the new organization.

**Sources:** [apps/desktop/src/renderer/routes/\_authenticated/providers/CollectionsProvider/CollectionsProvider.tsx:47-62](), [apps/api/src/app/api/electric/[...path]/route.ts:42-46]()

---

## ElectricSQL Row-Level Security

ElectricSQL does not connect directly from clients to the Electric server. Instead, the API acts as a proxy that enforces row-level security by injecting WHERE clauses based on the authenticated user's organization membership.

### Electric Proxy Authentication Flow

```mermaid
sequenceDiagram
    participant Desktop as Desktop Client
    participant Proxy as API Electric Proxy<br/>/api/electric/[...path]
    participant BuildWhere as buildWhereClause()
    participant Electric as Electric Server<br/>Fly.io
    participant Neon as Neon PostgreSQL

    Desktop->>Proxy: GET /api/electric/v1/shape<br/>?table=projects&organizationId=org-1<br/>Authorization: Bearer JWT

    Proxy->>Proxy: authenticate(request)
    Note over Proxy: Extract userId, organizationIds from JWT

    Proxy->>Proxy: Validate org membership
    Note over Proxy: Check organizationId in organizationIds[]

    Proxy->>BuildWhere: buildWhereClause(table, orgId, userId)
    BuildWhere-->>Proxy: WHERE clause + params

    Proxy->>Electric: GET /v1/shape?table=projects<br/>&where=organization_id = $1<br/>&params[1]=org-1<br/>&secret=ELECTRIC_SECRET

    Electric->>Neon: Query projects with WHERE clause
    Neon-->>Electric: Filtered rows
    Electric-->>Proxy: Shape stream
    Proxy-->>Desktop: Shape stream (filtered data)
```

### Row-Level Security Implementation

The `buildWhereClause()` function generates SQL WHERE clauses for each table:

```typescript
// Example for projects table
// apps/api/src/app/api/electric/[...path]/utils.ts:225-239
case "projects":
  return build(projects, projects.organizationId, organizationId);
```

For the `auth.organizations` table, the WHERE clause is more complex, querying the user's memberships:

```typescript
// apps/api/src/app/api/electric/[...path]/utils.ts:113-137
case "auth.organizations": {
  // Use the authenticated user's ID to find their organizations
  const userMemberships = await db.query.members.findMany({
    where: eq(members.userId, userId),
    columns: { organizationId: true },
  });

  if (userMemberships.length === 0) {
    return { fragment: "1 = 0", params: [] };
  }

  const orgIds = [...new Set(userMemberships.map((m) => m.organizationId))];
  const whereExpr = inArray(
    sql`${sql.identifier(organizations.id.name)}`,
    orgIds,
  );
  // ... SQL generation
}
```

### Supported Tables with RLS

| Table Name                | WHERE Clause Strategy                     | Notes                     |
| ------------------------- | ----------------------------------------- | ------------------------- |
| `tasks`                   | `organization_id = $1`                    | Standard org filter       |
| `projects`                | `organization_id = $1`                    | Standard org filter       |
| `workspaces`              | `organization_id = $1`                    | Standard org filter       |
| `auth.members`            | `organization_id = $1`                    | Standard org filter       |
| `auth.users`              | `$1 = ANY(organization_ids)`              | Array membership check    |
| `auth.organizations`      | `id IN (...)`                             | Query user's memberships  |
| `auth.apikeys`            | `metadata LIKE '%"organizationId":"$1"%'` | JSON field search         |
| `integration_connections` | `organization_id = $1`                    | Excludes tokens from sync |

**Sources:** [apps/api/src/app/api/electric/[...path]/route.ts:34-104](), [apps/api/src/app/api/electric/[...path]/utils.ts:69-195]()

---

## Electric Secret and Connection Security

### Connection Flow with Secrets

```mermaid
graph TB
    subgraph "Client"
        ElectricClient["Electric Client<br/>Collections"]
    end

    subgraph "API Proxy<br/>/api/electric"
        AuthCheck["authenticate()<br/>Verify JWT/session"]
        AddSecret["Add ELECTRIC_SECRET<br/>to upstream request"]
        InjectWhere["Inject WHERE clause<br/>for organization RLS"]
    end

    subgraph "Electric Server<br/>Fly.io"
        ValidateSecret["Validate secret<br/>from query param"]
        StreamShape["Stream shape<br/>with WHERE filter"]
    end

    subgraph "Database"
        NeonDB["Neon PostgreSQL<br/>Filtered query"]
    end

    ElectricClient -->|No secret| AuthCheck
    AuthCheck --> InjectWhere
    InjectWhere --> AddSecret
    AddSecret -->|?secret=xxx&where=...| ValidateSecret
    ValidateSecret --> StreamShape
    StreamShape --> NeonDB
```

The Electric server requires a shared secret (`ELECTRIC_SECRET`) to accept connections. This secret is:

1. **Never exposed to clients** - Only the API proxy knows it
2. **Added by the proxy** - [apps/api/src/app/api/electric/[...path]/route.ts:48-49]()
3. **Configured via environment** - [apps/api/src/env.ts:14-14]()
4. **Deployed to Fly.io** - [.github/workflows/deploy-production.yml:455-462]()

**Production Secret Configuration:**

```yaml
# .github/workflows/deploy-production.yml:455-462
- name: Stage secrets
  env:
    FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
  run: |
    flyctl secrets set \
      DATABASE_URL="${{ secrets.DATABASE_URL_UNPOOLED }}" \
      ELECTRIC_SECRET="${{ secrets.ELECTRIC_SECRET }}" \
      --app superset-electric \
      --stage
```

**Sources:** [apps/api/src/app/api/electric/[...path]/route.ts:48-49](), [apps/api/src/env.ts:14-14](), [.github/workflows/deploy-production.yml:455-462](), [fly.toml:1-33]()

---

## CORS and Credential Handling

The API uses a custom CORS middleware to allow credential-based requests from authorized origins.

### CORS Configuration

```mermaid
graph TB
    subgraph "Allowed Origins"
        WebProd["NEXT_PUBLIC_WEB_URL<br/>app.superset.com"]
        AdminProd["NEXT_PUBLIC_ADMIN_URL<br/>admin.superset.com"]
        DesktopProd["NEXT_PUBLIC_DESKTOP_URL<br/>superset://"]
        DesktopDev["localhost:5173<br/>(development)"]
    end

    subgraph "CORS Middleware<br/>proxy.ts"
        GetCorsHeaders["getCorsHeaders(origin)"]
        CheckOrigin["Check if origin in allowedOrigins"]
        SetHeaders["Set CORS headers:<br/>Access-Control-Allow-Origin<br/>Access-Control-Allow-Credentials"]
    end

    subgraph "Exposed Headers"
        ElectricHeaders["Electric Sync Headers:<br/>electric-offset, electric-handle<br/>electric-cursor, electric-up-to-date"]
        StreamHeaders["Durable Stream Headers:<br/>Stream-Next-Offset, Stream-Cursor<br/>Producer-Epoch, Producer-Seq"]
    end

    WebProd --> CheckOrigin
    AdminProd --> CheckOrigin
    DesktopProd --> CheckOrigin
    DesktopDev --> CheckOrigin

    CheckOrigin --> GetCorsHeaders
    GetCorsHeaders --> SetHeaders

    SetHeaders --> ElectricHeaders
    SetHeaders --> StreamHeaders
```

**CORS Implementation:**

```typescript
// apps/api/src/proxy.ts:14-19
const allowedOrigins = [
  env.NEXT_PUBLIC_WEB_URL,
  env.NEXT_PUBLIC_ADMIN_URL,
  env.NEXT_PUBLIC_DESKTOP_URL,
  ...desktopDevOrigins,
].filter(Boolean)
```

The middleware exposes ElectricSQL synchronization headers to clients:

```typescript
// apps/api/src/proxy.ts:28-47
"Access-Control-Expose-Headers": [
  // Electric sync headers
  "electric-offset",
  "electric-handle",
  "electric-schema",
  "electric-cursor",
  "electric-chunk-last-offset",
  "electric-up-to-date",
  // Durable stream headers
  "Stream-Next-Offset",
  "Stream-Cursor",
  "Stream-Up-To-Date",
  // ... more headers
].join(", "),
"Access-Control-Allow-Credentials": "true",
```

Web and Admin apps include credentials in all requests:

```typescript
// apps/web/src/trpc/react.tsx:50-52
fetch(url, options) {
  return fetch(url, { ...options, credentials: "include" });
}
```

**Sources:** [apps/api/src/proxy.ts:1-75](), [apps/web/src/trpc/react.tsx:50-52](), [apps/admin/src/trpc/react.tsx:52-56]()

---

## OAuth Provider Integration

Superset integrates with multiple OAuth 2.0 providers for user authentication and third-party integrations.

### Supported OAuth Providers

| Provider       | Purpose                       | Environment Variables                                                     | Scopes                    |
| -------------- | ----------------------------- | ------------------------------------------------------------------------- | ------------------------- |
| **Google**     | User authentication           | `GOOGLE_CLIENT_ID`<br/>`GOOGLE_CLIENT_SECRET`                             | profile, email            |
| **GitHub**     | User auth + repository access | `GH_CLIENT_ID`<br/>`GH_CLIENT_SECRET`                                     | user, repo                |
| **GitHub App** | PR/Repository webhooks        | `GH_APP_ID`<br/>`GH_APP_PRIVATE_KEY`<br/>`GH_WEBHOOK_SECRET`              | pull_request, repository  |
| **Linear**     | Issue tracking integration    | `LINEAR_CLIENT_ID`<br/>`LINEAR_CLIENT_SECRET`<br/>`LINEAR_WEBHOOK_SECRET` | read, write               |
| **Slack**      | Team notifications            | `SLACK_CLIENT_ID`<br/>`SLACK_CLIENT_SECRET`<br/>`SLACK_SIGNING_SECRET`    | chat:write, channels:read |

### OAuth Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant WebApp as Web/Admin App
    participant API as API Server
    participant BetterAuth as Better Auth
    participant Provider as OAuth Provider
    participant DB as Neon PostgreSQL

    User->>WebApp: Click "Sign in with Google"
    WebApp->>API: GET /api/auth/signin/google
    API->>BetterAuth: initiate OAuth flow
    BetterAuth->>Provider: Redirect with client_id, redirect_uri
    Provider->>User: Show authorization prompt
    User->>Provider: Grant permission
    Provider->>API: Redirect with auth code
    API->>BetterAuth: Exchange code for access token
    BetterAuth->>Provider: POST /oauth/token
    Provider-->>BetterAuth: Access token + user profile
    BetterAuth->>DB: UPSERT auth.users
    BetterAuth->>DB: INSERT auth.sessions
    BetterAuth->>DB: UPSERT integration_connections (if applicable)
    BetterAuth-->>API: Session created
    API-->>WebApp: Set-Cookie: session_token
    WebApp-->>User: Redirect to dashboard
```

### Integration Connection Storage

OAuth tokens for integrations are stored in the `integration_connections` table but excluded from ElectricSQL sync for security:

```typescript
// apps/api/src/app/api/electric/[...path]/route.ts:84-89
if (tableName === 'integration_connections') {
  originUrl.searchParams.set(
    'columns',
    'id,organization_id,connected_by_user_id,provider,token_expires_at,external_org_id,external_org_name,config,created_at,updated_at'
  )
}
```

Note that `access_token` and `refresh_token` columns are intentionally excluded from the synced columns.

**Sources:** [apps/api/src/env.ts:18-31](), [apps/api/src/app/api/electric/[...path]/route.ts:84-89](), [.github/workflows/deploy-production.yml:83-104]()

---

## API Key Authentication

In addition to user sessions and JWT tokens, Superset supports API key authentication for programmatic access.

### API Key Structure

API keys are stored in the `auth.apikeys` table with the following attributes:

- `id`: Unique key identifier
- `name`: Human-readable key name
- `start`: First few characters (for display)
- `created_at`: Creation timestamp
- `last_request`: Last usage timestamp
- `metadata`: JSON containing `organizationId`

### API Key Row-Level Security

API keys are filtered by organization using a JSON metadata search:

```typescript
// apps/api/src/app/api/electric/[...path]/utils.ts:154-157
case "auth.apikeys": {
  const fragment = `"metadata" LIKE '%"organizationId":"' || $1 || '"%'`;
  return { fragment, params: [organizationId] };
}
```

When synced to clients, sensitive fields are excluded:

```typescript
// apps/api/src/app/api/electric/[...path]/route.ts:77-82
if (tableName === 'auth.apikeys') {
  originUrl.searchParams.set('columns', 'id,name,start,created_at,last_request')
}
```

This ensures the full API key value is never transmitted to clients via ElectricSQL sync.

**Sources:** [apps/api/src/app/api/electric/[...path]/utils.ts:154-157](), [apps/api/src/app/api/electric/[...path]/route.ts:77-82](), [apps/desktop/src/renderer/routes/\_authenticated/providers/CollectionsProvider/collections.ts:54-62]()

---

## Environment Variable Configuration

All authentication-related secrets are managed through environment variables, configured differently per deployment environment.

### Secret Categories

| Category            | Variables                                                                                                      | Usage                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Better Auth**     | `BETTER_AUTH_SECRET`                                                                                           | Session encryption and signing         |
| **OAuth Providers** | `GOOGLE_CLIENT_ID/SECRET`<br/>`GH_CLIENT_ID/SECRET`<br/>`LINEAR_CLIENT_ID/SECRET`<br/>`SLACK_CLIENT_ID/SECRET` | Third-party authentication             |
| **GitHub App**      | `GH_APP_ID`<br/>`GH_APP_PRIVATE_KEY`<br/>`GH_WEBHOOK_SECRET`                                                   | Repository webhooks and PR integration |
| **Electric Sync**   | `ELECTRIC_URL`<br/>`ELECTRIC_SECRET`                                                                           | ElectricSQL server connection          |
| **Payment**         | `STRIPE_SECRET_KEY`<br/>`STRIPE_WEBHOOK_SECRET`<br/>`STRIPE_*_PRICE_ID`                                        | Subscription billing                   |
| **Queue**           | `QSTASH_TOKEN`<br/>`QSTASH_CURRENT_SIGNING_KEY`<br/>`QSTASH_NEXT_SIGNING_KEY`                                  | Background job authentication          |
| **Encryption**      | `SECRETS_ENCRYPTION_KEY`                                                                                       | Encrypting sensitive data at rest      |

### Deployment Configuration

```mermaid
graph TB
    subgraph "GitHub Secrets"
        Secrets["GitHub Repository Secrets:<br/>BETTER_AUTH_SECRET<br/>GOOGLE_CLIENT_ID<br/>GH_CLIENT_SECRET<br/>ELECTRIC_SECRET<br/>..."]
    end

    subgraph "Preview Environment"
        PreviewWorkflow["deploy-preview.yml"]
        PreviewAPI["API Preview (Vercel)"]
        PreviewElectric["Electric Preview (Fly.io)"]
    end

    subgraph "Production Environment"
        ProdWorkflow["deploy-production.yml"]
        ProdAPI["API Production (Vercel)"]
        ProdElectric["Electric Production (Fly.io)"]
    end

    subgraph "Environment Validation"
        EnvTS["apps/api/src/env.ts<br/>@t3-oss/env-nextjs<br/>Validates at build time"]
    end

    Secrets --> PreviewWorkflow
    Secrets --> ProdWorkflow

    PreviewWorkflow --> PreviewAPI
    PreviewWorkflow --> PreviewElectric

    ProdWorkflow --> ProdAPI
    ProdWorkflow --> ProdElectric

    PreviewAPI --> EnvTS
    ProdAPI --> EnvTS
```

Environment variables are validated at build time using `@t3-oss/env-nextjs`:

```typescript
// apps/api/src/env.ts:4-76
export const env = createEnv({
  shared: {
    NODE_ENV: z.enum(["development", "production", "test\
```
