# Acme 窗口架构实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Acme 的三种窗口（Welcome、Vault、Chat-popup）路由架构，基于 TanStack Router 的文件约定路由和 hash history。

**Architecture:** 采用按窗口类型分区的路由结构，使用 hash history 支持多窗口独立 BrowserWindow 实例。所有窗口共享 AppShell 背景设计，但拥有独立的 layout 组件。

**Tech Stack:** TanStack Router (file-based routing), React, Electron

---

## 文件结构变更

### 路由文件（新建）

```
apps/desktop/src/renderer/src/routes/
├── __root.tsx                      # 全局根布局
├── welcome/
│   └── index.tsx                   # /welcome
├── vault/
│   └── $vaultId/
│       ├── vault.layout.tsx        # /vault/:vaultId
│       ├── index.tsx               # /vault/:vaultId
│       ├── settings.tsx             # /vault/:vaultId/settings
│       └── thread/
│           └── $threadId.tsx       # /vault/:vaultId/thread/:threadId
└── popup/
    ├── $threadId.layout.tsx        # /popup/:threadId
    └── index.tsx                   # /popup/:threadId
```

### 组件文件（新建/调整）

```
apps/desktop/src/renderer/src/components/
├── welcome/
│   └── WelcomePage.tsx             # 新建
├── vault/
│   ├── VaultSidebar.tsx            # 新建
│   ├── ThreadList.tsx              # 新建
│   └── ThreadView.tsx             # 新建
└── popup/
    └── PopupThreadView.tsx         # 新建
```

### 需修改的文件

| 文件 | 变更 |
|------|------|
| `apps/desktop/src/renderer/src/router.ts` | 改用 hash history，添加 routeTree |
| `apps/desktop/src/renderer/src/main.tsx` | 移除旧路由导入 |
| `apps/desktop/src/renderer/src/routes/__root.tsx` | 重命名为 `__root.tsx`，简化布局 |
| `apps/desktop/src/renderer/src/routes/index.tsx` | 移动到 `welcome/index.tsx` 或删除 |
| `apps/desktop/src/renderer/src/routes/chat.tsx` | 移动到 `vault/$vaultId/thread/$threadId.tsx` |
| `apps/desktop/src/renderer/src/routes/settings.tsx` | 移动到 `vault/$vaultId/settings.tsx` |
| `apps/desktop/src/main/services/WindowManager.ts` | 实现各窗口创建方法 |

---

## 实现任务

### Task 1: 创建全局根布局 `__root.tsx`

**Files:**
- Create: `apps/desktop/src/renderer/src/routes/__root.tsx`
- Modify: `apps/desktop/src/renderer/src/main.tsx`（更新导入路径）

- [ ] **Step 1: 创建 `__root.tsx`**

```tsx
// apps/desktop/src/renderer/src/routes/__root.tsx
import { Outlet } from '@tanstack/react-router'
import { AppShell } from '../components/app-shell'

export function RootRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
```

- [ ] **Step 2: 验证构建**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/routes/__root.tsx
git commit -m "feat(routes): create root layout with AppShell"
```

---

### Task 2: 创建 Welcome 窗口路由

**Files:**
- Create: `apps/desktop/src/renderer/src/routes/welcome/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/welcome/WelcomePage.tsx`

- [ ] **Step 1: 创建 `WelcomePage.tsx` 组件**

```tsx
// apps/desktop/src/renderer/src/components/welcome/WelcomePage.tsx
export function WelcomePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <h1>Welcome to Acme</h1>
      {/* TODO: 实现 Welcome 引导流程 */}
    </div>
  )
}
```

- [ ] **Step 2: 创建 `welcome/index.tsx` 路由**

```tsx
// apps/desktop/src/renderer/src/routes/welcome/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { WelcomePage } from '../../components/welcome/WelcomePage'

export const Route = createFileRoute('/welcome')({
  component: WelcomePage,
})
```

- [ ] **Step 3: 验证构建**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/renderer/src/routes/welcome/
git add apps/desktop/src/renderer/src/components/welcome/
git commit -m "feat(routes): add welcome window route"
```

---

### Task 3: 创建 Vault 窗口路由

**Files:**
- Create: `apps/desktop/src/renderer/src/routes/vault/$vaultId/vault.layout.tsx`
- Create: `apps/desktop/src/renderer/src/routes/vault/$vaultId/index.tsx`
- Create: `apps/desktop/src/renderer/src/routes/vault/$vaultId/settings.tsx`
- Create: `apps/desktop/src/renderer/src/routes/vault/$vaultId/thread/$threadId.tsx`
- Create: `apps/desktop/src/renderer/src/components/vault/VaultSidebar.tsx`
- Create: `apps/desktop/src/renderer/src/components/vault/ThreadList.tsx`
- Create: `apps/desktop/src/renderer/src/components/vault/ThreadView.tsx`

- [ ] **Step 1: 创建 `vault.layout.tsx`**

```tsx
// apps/desktop/src/renderer/src/routes/vault/$vaultId/vault.layout.tsx
import { Outlet } from '@tanstack/react-router'
import { VaultSidebar } from '../../../../components/vault/VaultSidebar'

export const Route = createFileRoute('/vault/$vaultId')({
  component: VaultLayout,
})

function VaultLayout() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <VaultSidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 2: 创建 `vault/$vaultId/index.tsx`**

```tsx
// apps/desktop/src/renderer/src/routes/vault/$vaultId/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ThreadList } from '../../../../components/vault/ThreadList'

export const Route = createFileRoute('/vault/$vaultId/')({
  component: VaultIndex,
})

function VaultIndex() {
  return <ThreadList />
}
```

- [ ] **Step 3: 创建 `vault/$vaultId/settings.tsx`**

```tsx
// apps/desktop/src/renderer/src/routes/vault/$vaultId/settings.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vault/$vaultId/settings')({
  component: VaultSettings,
})

function VaultSettings() {
  return <div>Vault Settings</div>
}
```

- [ ] **Step 4: 创建 `vault/$vaultId/thread/$threadId.tsx`**

```tsx
// apps/desktop/src/renderer/src/routes/vault/$vaultId/thread/$threadId.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ThreadView } from '../../../../../components/vault/ThreadView'

export const Route = createFileRoute('/vault/$vaultId/thread/$threadId')({
  component: ThreadPage,
})

function ThreadPage() {
  const { threadId } = Route.useParams()
  return <ThreadView threadId={threadId} />
}
```

- [ ] **Step 5: 创建 Vault 组件（占位实现）**

```tsx
// apps/desktop/src/renderer/src/components/vault/VaultSidebar.tsx
export function VaultSidebar() {
  return <aside className="w-64 bg-sidebar">Vault Sidebar</aside>
}

// apps/desktop/src/renderer/src/components/vault/ThreadList.tsx
export function ThreadList() {
  return <div>Thread List</div>
}

// apps/desktop/src/renderer/src/components/vault/ThreadView.tsx
interface ThreadViewProps {
  threadId: string
}
export function ThreadView({ threadId }: ThreadViewProps) {
  return <div>Thread View: {threadId}</div>
}
```

- [ ] **Step 6: 验证构建**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 7: 提交**

```bash
git add apps/desktop/src/renderer/src/routes/vault/
git add apps/desktop/src/renderer/src/components/vault/
git commit -m "feat(routes): add vault window routes with $vaultId layout"
```

---

### Task 4: 创建 Chat-popup 窗口路由

**Files:**
- Create: `apps/desktop/src/renderer/src/routes/popup/$threadId.layout.tsx`
- Create: `apps/desktop/src/renderer/src/routes/popup/index.tsx`
- Create: `apps/desktop/src/renderer/src/components/popup/PopupThreadView.tsx`

- [ ] **Step 1: 创建 `popup/$threadId.layout.tsx`**

```tsx
// apps/desktop/src/renderer/src/routes/popup/$threadId.layout.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/popup/$threadId')({
  component: PopupLayout,
})

function PopupLayout() {
  return (
    <div className="h-screen">
      {/* TODO: 添加置顶等功能 */}
      <Outlet />
    </div>
  )
}
```

- [ ] **Step 2: 创建 `popup/index.tsx`**

```tsx
// apps/desktop/src/renderer/src/routes/popup/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { PopupThreadView } from '../../components/popup/PopupThreadView'

export const Route = createFileRoute('/popup/$threadId/')({
  component: PopupThreadPage,
})

function PopupThreadPage() {
  const { threadId } = Route.useParams()
  return <PopupThreadView threadId={threadId} />
}
```

- [ ] **Step 3: 创建 `PopupThreadView.tsx`**

```tsx
// apps/desktop/src/renderer/src/components/popup/PopupThreadView.tsx
interface PopupThreadViewProps {
  threadId: string
}
export function PopupThreadView({ threadId }: PopupThreadViewProps) {
  return <div>Popup Thread View: {threadId}</div>
}
```

- [ ] **Step 4: 验证构建**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add apps/desktop/src/renderer/src/routes/popup/
git add apps/desktop/src/renderer/src/components/popup/
git commit -m "feat(routes): add chat-popup window routes"
```

---

### Task 5: 配置 Hash History

**Files:**
- Modify: `apps/desktop/src/renderer/src/router.ts`

- [ ] **Step 1: 更新 `router.ts` 使用 hash history**

```typescript
// apps/desktop/src/renderer/src/router.ts
import {
  createRouter as createTanStackRouter,
  createHashHistory,
} from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
    history: createHashHistory(),
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
```

- [ ] **Step 2: 验证构建**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/router.ts
git commit -m "feat(router): use hash history for multi-window support"
```

---

### Task 6: 更新 WindowManager 实现窗口创建

**Files:**
- Modify: `apps/desktop/src/main/services/WindowManager.ts`

- [ ] **Step 1: 实现 `createWelcomeWindow` 方法**

在 `WindowManager.ts` 中添加：

```typescript
createWelcomeWindow(): BrowserWindow {
  return this.createWindow('welcome')
}

private createWindow(type: 'welcome' | 'vault' | 'popup', params?: Record<string, string>): BrowserWindow {
  const mainWindow = new BrowserWindow({...})

  let hashRoute = ''
  switch (type) {
    case 'welcome':
      hashRoute = '/welcome'
      break
    case 'vault':
      hashRoute = `/vault/${params?.vaultId || ''}`
      break
    case 'popup':
      hashRoute = `/popup/${params?.threadId || ''}`
      break
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#${hashRoute}`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: hashRoute,
    })
  }

  return mainWindow
}
```

- [ ] **Step 2: 实现 `createVaultWindow` 和 `createChatPopupWindow`**

```typescript
createVaultWindow(vaultId: string): BrowserWindow {
  return this.createWindow('vault', { vaultId })
}

createChatPopupWindow(threadId: string): BrowserWindow {
  return this.createWindow('popup', { threadId })
}
```

- [ ] **Step 3: 验证构建**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/main/services/WindowManager.ts
git commit -m "feat(window): implement window creation methods for each window type"
```

---

### Task 7: 清理旧路由文件

**Files:**
- Delete: `apps/desktop/src/renderer/src/routes/chat.tsx`
- Delete: `apps/desktop/src/renderer/src/routes/settings.tsx`
- Delete: `apps/desktop/src/renderer/src/routes/rpc-debug.tsx`（保留或移除）
- Modify: `apps/desktop/src/renderer/src/routes/index.tsx`（移至 welcome 或删除）

- [ ] **Step 1: 删除旧路由文件**

```bash
rm apps/desktop/src/renderer/src/routes/chat.tsx
rm apps/desktop/src/renderer/src/routes/settings.tsx
# rpc-debug.tsx 根据需要保留或删除
```

- [ ] **Step 2: 将 `index.tsx` 移动到 `welcome/index.tsx`**

```bash
mv apps/desktop/src/renderer/src/routes/index.tsx apps/desktop/src/renderer/src/routes/welcome/index.tsx
```

- [ ] **Step 3: 更新 `welcome/index.tsx` 使用 `createFileRoute`**

```tsx
// apps/desktop/src/renderer/src/routes/welcome/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/welcome')({
  component: HomePage,
})

function HomePage() {
  return <div>Welcome Home</div>
}
```

- [ ] **Step 4: 验证构建**

Run: `cd apps/desktop && bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "refactor(routes): migrate old routes to new structure"
```

---

## 任务依赖关系

```
Task 1 (Root Layout)
    ↓
Task 2 (Welcome Routes) ──┐
    │                     │
Task 3 (Vault Routes) ────┼──→ Task 5 (Hash History)
    │                     │
Task 4 (Popup Routes) ────┘
    │
    ↓
Task 6 (WindowManager)
    │
    ↓
Task 7 (Cleanup)
```

---

## 验证清单

- [ ] `bunx tsc --noEmit` 无错误
- [ ] `bunx oxlint` 无错误
- [ ] `bunx oxfmt` 格式化通过
- [ ] 各窗口路由可独立访问
- [ ] Hash history 正确工作

---

## 后续步骤

1. 实现 WelcomePage 组件的具体引导流程
2. 实现 VaultSidebar 的 project/thread 导航
3. 实现 ThreadView 的消息展示
4. 集成 WindowManager 的窗口创建逻辑
