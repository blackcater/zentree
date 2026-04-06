# Desktop Settings Page Design

## Overview

Design and implement a full-page Settings page for the Desktop application. Users can navigate to Settings via the sidebar footer button or the macOS keyboard shortcut `Cmd+,`.

## Route Structure

```
/vault/$vaultId/settings (Layout Route)
├── /vault/$vaultId/settings/general (General)
├── /vault/$vaultId/settings/appearance (Appearance)
├── /vault/$vaultId/settings/notifications (Notifications)
├── /vault/$vaultId/settings/keyboard (Keyboard)
├── /vault/$vaultId/settings/agents (Agents)
├── /vault/$vaultId/settings/providers (Providers)
├── /vault/$vaultId/settings/git (Git)
├── /vault/$vaultId/settings/archive (Archive)
├── /vault/$vaultId/settings/projects/$projectId (Project Settings - Dynamic)
└── /vault/$vaultId/settings/about (About)
```

- Default redirect: `/vault/$vaultId/settings` → `/vault/$vaultId/settings/general`
- All settings pages are child routes of the Settings layout

## Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│  Header Bar (macOS traffic light + window bar)          │
├──────────────┬────────────────────────────────────────┤
│  Settings    │         Content Area                    │
│  Navigation  │                                        │
│  (224px)     │   ┌────────────────────────────┐      │
│              │   │  Page Title                │      │
│  ┌────────┐  │   │  Page Description         │      │
│  │General │  │   └────────────────────────────┘      │
│  │Appear..│  │                                        │
│  │Notif.. │  │   ┌────────────────────────────┐      │
│  │Keyboard│  │   │  Setting Item              │      │
│  ├────────┤  │   │  Label + Description       │      │
│  │Agents  │  │   │              [Toggle/Select]│     │
│  │Providers│ │   └────────────────────────────┘      │
│  │Git     │  │                                        │
│  │Archive │  │   ┌────────────────────────────┐      │
│  ├────────┤  │   │  Setting Item              │      │
│  │About   │  │   └────────────────────────────┘      │
│  └────────┘  │                                        │
│              │                                        │
└──────────────┴────────────────────────────────────────┘
```

### Layout Specifications

- **Settings Navigation Sidebar**: Fixed width `w-56` (224px), `p-3` padding
- **Content Area**: `p-6` padding, `max-w-4xl` max-width, scrollable
- **Spacing between setting items**: `space-y-6`
- **Section separator**: `border-t pt-6 mt-6`

## Navigation Sidebar

### Grouped Structure

| Group         | Items         | Icons                             |
| ------------- | ------------- | --------------------------------- |
| **Personal**  | General       | `SparkleIcon` or `Settings05Icon` |
|               | Appearance    | `PaintBrushIcon`                  |
|               | Notifications | `BellIcon`                        |
|               | Keyboard      | `KeyboardIcon`                    |
| **Workspace** | Agents        | `CpuChipIcon`                     |
|               | Providers     | `BrainIcon`                       |
|               | Git           | `GitBranchIcon`                   |
|               | Archive       | `ArchiveIcon`                     |
| **Projects**  | (Dynamic)     | `FolderIcon`                      |
|               | Each project  |                                   |
|               | gets its own  |                                   |
|               | nav item      |                                   |
| **System**    | About         | `InfoCircleIcon`                  |

### Sidebar Styling

- Group label: `text-[10px] uppercase tracking-[0.1em] text-muted-foreground/60 px-3 mb-1`
- Nav item: `h-8 text-xs rounded-md px-3`
- Active state: `bg-accent text-accent-foreground`
- Inactive state: `text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground`
- Icon + label: `flex items-center gap-3`

## Settings Pages Detail

### General (`/settings/general`)

| Setting                   | Type   | Default | Description                                                |
| ------------------------- | ------ | ------- | ---------------------------------------------------------- |
| Prevent Sleep During Chat | Switch | Off     | Prevents system sleep while in chat                        |
| Confirm Before Quit       | Switch | On      | Shows confirmation dialog when quitting                    |
| Open Links In-App         | Switch | Off     | Opens links in built-in browser instead of default browser |

### Appearance (`/settings/appearance`)

| Setting     | Type   | Options               | Description          |
| ----------- | ------ | --------------------- | -------------------- |
| Theme       | Select | Light / Dark / System | App color theme      |
| Font Family | Select | System / Custom       | Editor font family   |
| Font Size   | Select | 12 / 14 / 16 / 18     | Editor font size     |
| Language    | Select | 中文 / English        | App display language |

### Notifications (`/settings/notifications`)

| Setting            | Type   | Description                    |
| ------------------ | ------ | ------------------------------ |
| Notification Sound | Select | Sound played for notifications |
| Volume             | Slider | Notification volume (0-100)    |

### Keyboard (`/settings/keyboard`)

- Search input for filtering shortcuts
- Grouped by category: Workspace, Terminal, Layout, Window, Help
- Each row: Command name, current shortcut (Kbd), Reset button
- Conflict detection when reassigning shortcuts
- "Reset All" button

### Agents (`/settings/agents`)

- List of configured ACP-compatible agents
- Each agent card shows: Name, Status (enabled/disabled), Actions
- Add/Edit/Remove agent functionality

### Providers (`/settings/providers`)

- List of model providers (OpenAI, Anthropic, etc.)
- Each provider: Name, API Key configuration, Available models
- Add/Edit/Remove provider functionality

### Git (`/settings/git`)

| Setting                        | Type        | Description                              |
| ------------------------------ | ----------- | ---------------------------------------- |
| Delete Local Branch on Removal | Switch      | Delete git branch when deleting worktree |
| Branch Prefix                  | Select      | None / Author / GitHub / Custom          |
| Custom Prefix                  | Input       | Shown when "Custom" prefix mode selected |
| Worktree Location              | Path Picker | Base directory for new worktrees         |

### Archive (`/settings/archive`)

- List of archived projects and threads
- Each item shows: Name, Archive date, Type (Project/Thread)
- "Restore" action for each item
- Empty state when no archives

### Project Settings (`/settings/projects/$projectId`)

Dynamic route - each project in the workspace gets its own settings page.

| Setting | Type | Description |
|---------|------|-------------|
| Project Name | Input | Display name of the project |
| Description | Textarea | Project description |
| Default Agent | Select | Default agent to use for this project |
| Archive Project | Button | Archive this project |

### About (`/settings/about`)

| Item              | Description                      |
| ----------------- | -------------------------------- |
| App Name          | "Acme"                           |
| Version           | Current app version              |
| Check for Updates | Button to check for new versions |
| Release Notes     | Link to changelog                |

## Component Usage

### UI Foundation Components (packages/ui/src/foundation)

- `Tabs` / `TabsList` / `TabsTrigger` — Navigation sidebar (vertical orientation)
- `TabsContent` — Content area wrapper
- `Switch` — Toggle settings
- `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` — Dropdown selects
- `Input` — Text input fields
- `Button` — Action buttons
- `ScrollArea` — Content scrolling
- `Separator` — Section dividers
- `Tooltip` — Hover tooltips
- `Slider` — Volume controls
- `Label` — Setting labels

### Icons (@hugeicons/core-free-icons)

Use `HugeiconsIcon` component with imported icons:

```tsx
import { HugeiconsIcon } from '@hugeicons/react'
import { SomeIcon } from '@hugeicons/core-free-icons'

<HugeiconsIcon icon={SomeIcon} />
```

### Styling

- Use Tailwind CSS for all styling
- Follow existing design tokens and spacing conventions
- Keep consistent with rest of the application

## Keyboard Shortcut

- Register global `Cmd+,` (macOS) / `Ctrl+,` (Windows/Linux) shortcut to open Settings
- Navigation: handled by TanStack Router

## File Structure

```
apps/desktop/src/renderer/src/
├── routes/vault/$vaultId/
│   ├── settings.tsx              # Layout route component
│   └── settings/                 # Settings sub-pages
│       ├── -SettingsLayout.tsx  # Settings layout with sidebar
│       ├── -SettingsNav.tsx     # Navigation sidebar component
│       ├── -GeneralPage.tsx      # General settings
│       ├── -AppearancePage.tsx  # Appearance settings
│       ├── -NotificationsPage.tsx
│       ├── -KeyboardPage.tsx
│       ├── -AgentsPage.tsx
│       ├── -ProvidersPage.tsx
│       ├── -GitPage.tsx
│       ├── -ArchivePage.tsx
│       ├── -ProjectSettingsPage.tsx  # Dynamic project settings
│       └── -AboutPage.tsx
```

## Implementation Priority

1. Settings Layout (nav + content area structure)
2. General Page (as reference implementation)
3. Appearance Page
4. Notifications Page
5. Keyboard Page
6. Agents Page
7. Providers Page
8. Git Page
9. Archive Page
10. Project Settings Page (dynamic, per-project)
11. About Page
