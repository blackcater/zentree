# SidebarHeader Navigation Design

## Overview

SidebarHeader has three buttons that navigate to three different pages. Users default to the new thread page.

## Routes

| Button | Route | Component | Description |
|--------|-------|-----------|-------------|
| New Thread | `/vault/$vaultId/` | ThreadPage | New conversation |
| Extensions | `/vault/$vaultId/extensions` | ExtensionsPage | Placeholder |
| Automation | `/vault/$vaultId/automation` | AutomationPage | Placeholder |

## Architecture

### Route Tree
```
/vault/$vaultId/ (index)            → ThreadPage (no threadId)
/vault/$vaultId/thread/$threadId     → ThreadPage (with threadId)
/vault/$vaultId/extensions           → ExtensionsPage
/vault/$vaultId/automation          → AutomationPage
```

### Parent Layout (No Re-mount)
```
VaultLayout (unchanged on navigation)
  └── AppHeader (unchanged)
  └── AppSidebar (unchanged)
  └── Outlet
        └── ThreadPage | ExtensionsPage | AutomationPage
```

When navigating between child routes, only the Outlet content updates. Parent components do not remount.

## Components

### SidebarHeader
- Three `Link` buttons for navigation
- Uses existing TanStack Router `Link` component

### ThreadPage
Single component handling both states:
- **New thread** (`/vault/$vaultId/`): No `threadId` param, shows new conversation UI
- **Existing thread** (`/vault/$vaultId/thread/$threadId`): Has `threadId`, loads history

Navigation from new to existing thread happens on **send button click**:
```ts
navigate({ to: '/vault/$vaultId/thread/$threadId', params: { threadId } })
```

### ExtensionsPage / AutomationPage
Placeholder components for future implementation.

## Implementation

1. Update `SidebarHeader` to add `Link` components for three routes
2. Create `extensions.tsx` and `automation.tsx` route files with placeholder components
3. ThreadPage remains single component, uses `route.useParams()` or searchParams to determine state
4. No parent layout changes needed

## Notes
- TanStack Router handles route transitions without full page refresh
- Parent layout components (AppHeader, AppSidebar) do not remount during navigation
- ThreadPage component reuse ensures smooth UX when transitioning from new to existing thread
