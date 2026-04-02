# 侧边栏与 Panel 可折叠/调整大小实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现侧边栏和 Panel 的可折叠和可调整大小功能，使用 react-resizable-panels

**Architecture:** 使用 ResizablePanelGroup 实现水平面板布局，通过 atomWithStorage 持久化状态，通过 HeaderContext 实现动态顶栏

**Tech Stack:** react-resizable-panels, Jotai atomWithStorage, React Context

---

## 文件结构

```
apps/desktop/src/renderer/src/
├── atoms/
│   └── panel.ts                          # 新增: Panel 状态 atom
├── contexts/
│   └── HeaderContext.tsx                 # 新增: 动态顶栏 Context
├── components/app-shell/
│   ├── AppSidebar.tsx                     # 修改: 响应 collapsed
│   ├── AppHeader.tsx                      # 修改: 支持动态内容
│   └── panel/
│       ├── PanelRouter.tsx                # 新增: Panel 路由
│       ├── GitPanel.tsx                   # 新增: 占位组件
│       ├── FilesPanel.tsx                 # 新增: 占位组件
│       └── OutlinePanel.tsx               # 新增: 占位组件
├── routes/vault/
│   ├── $vaultId.tsx                       # 修改: 使用 ResizablePanelGroup
│   └── $vaultId/thread/$threadId.tsx      # 修改: 注册 Panel 按钮
└── types/
    └── panel.ts                           # 新增: Panel 类型定义
```

---

## 任务列表

### Task 1: 安装依赖

**Files:**
- Modify: `apps/desktop/package.json`

- [ ] **Step 1: 安装 react-resizable-panels**

Run: `cd /Users/blackcater/Workspace/Codes/Labs/Acme/apps/desktop && bun add react-resizable-panels`
Expected: 包安装成功

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "deps: add react-resizable-panels"
```

---

### Task 2: 创建 Panel 类型定义

**Files:**
- Create: `apps/desktop/src/renderer/src/types/panel.ts`

- [ ] **Step 1: 创建类型定义**

```typescript
export type PanelType = 'git' | 'files' | 'outline' | null

export interface PanelState {
  collapsed: boolean
  width: number
  type: PanelType
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/types/panel.ts
git commit -m "feat(types): add PanelState and PanelType"
```

---

### Task 3: 创建 panelAtom

**Files:**
- Create: `apps/desktop/src/renderer/src/atoms/panel.ts`

- [ ] **Step 1: 创建 atom**

```typescript
import { atomWithStorage } from 'jotai/utils'

import type { PanelState } from '../types/panel'

export const panelAtom = atomWithStorage<PanelState>('panel-state', {
  collapsed: false,
  width: 320,
  type: null,
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/atoms/panel.ts
git commit -m "feat(panel): add panelAtom for Panel state"
```

---

### Task 4: 创建 HeaderContext

**Files:**
- Create: `apps/desktop/src/renderer/src/contexts/HeaderContext.tsx`

- [ ] **Step 1: 创建 Context**

```tsx
import { createContext, useContext, useState, type ReactNode } from 'react'

interface HeaderContent {
  title?: ReactNode
  actions?: ReactNode[]
}

interface HeaderContextValue {
  content: HeaderContent
  setContent: (content: HeaderContent) => void
}

const HeaderContext = createContext<HeaderContextValue>({
  content: {},
  setContent: () => {},
})

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HeaderContent>({})

  return (
    <HeaderContext.Provider value={{ content, setContent }}>
      {children}
    </HeaderContext.Provider>
  )
}

export function useHeader(): HeaderContextValue {
  return useContext(HeaderContext)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/contexts/HeaderContext.tsx
git commit -m "feat(header): add HeaderContext for dynamic header"
```

---

### Task 5: 创建 Panel 占位组件

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/panel/GitPanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/app-shell/panel/FilesPanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/app-shell/panel/OutlinePanel.tsx`
- Create: `apps/desktop/src/renderer/src/components/app-shell/panel/index.ts`

- [ ] **Step 1: 创建 GitPanel.tsx**

```tsx
export function GitPanel(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Git Panel - 待实现
    </div>
  )
}
```

- [ ] **Step 2: 创建 FilesPanel.tsx**

```tsx
export function FilesPanel(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Files Panel - 待实现
    </div>
  )
}
```

- [ ] **Step 3: 创建 OutlinePanel.tsx**

```tsx
export function OutlinePanel(): React.JSX.Element {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      Outline Panel - 待实现
    </div>
  )
}
```

- [ ] **Step 4: 创建 index.ts**

```tsx
export { GitPanel } from './GitPanel'
export { FilesPanel } from './FilesPanel'
export { OutlinePanel } from './OutlinePanel'
```

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/panel/
git commit -m "feat(panel): add placeholder Panel components"
```

---

### Task 6: 创建 PanelRouter

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/panel/PanelRouter.tsx`
- Modify: `apps/desktop/src/renderer/src/components/app-shell/panel/index.ts`

- [ ] **Step 1: 创建 PanelRouter.tsx**

```tsx
import type { PanelType } from '@renderer/types/panel'
import { FilesPanel, GitPanel, OutlinePanel } from './index'

interface PanelRouterProps {
  type: PanelType
}

export function PanelRouter({ type }: PanelRouterProps): React.JSX.Element | null {
  switch (type) {
    case 'git':
      return <GitPanel />
    case 'files':
      return <FilesPanel />
    case 'outline':
      return <OutlinePanel />
    default:
      return null
  }
}
```

- [ ] **Step 2: 更新 index.ts 导出**

```tsx
export { GitPanel } from './GitPanel'
export { FilesPanel } from './FilesPanel'
export { OutlinePanel } from './OutlinePanel'
export { PanelRouter } from './PanelRouter'
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/panel/PanelRouter.tsx
git add apps/desktop/src/renderer/src/components/app-shell/panel/index.ts
git commit -m "feat(panel): add PanelRouter component"
```

---

### Task 7: 修改 AppSidebar 响应 collapsed 状态

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/AppSidebar.tsx:1-27`

- [ ] **Step 1: 查看当前 AppSidebar 实现**

读取当前 AppSidebar.tsx 文件

- [ ] **Step 2: 修改 AppSidebar 支持 collapsed**

```tsx
import { ScrollArea } from '@acme-ai/ui/foundation'
import { useAtomValue } from 'jotai'

import { sidebarAtom } from '@renderer/atoms'

import { PinnedSection } from './sidebar/PinnedSection'
import { ProjectSection } from './sidebar/ProjectSection'
import { SidebarFooter } from './sidebar/SidebarFooter'
import { SidebarHeader } from './sidebar/SidebarHeader'

export function AppSidebar(): React.JSX.Element {
  const sidebar = useAtomValue(sidebarAtom)

  if (sidebar.collapsed) {
    return (
      <aside className="text-secondary-foreground relative flex h-full shrink-0 flex-col overflow-hidden pt-10">
        <SidebarHeader collapsed />
      </aside>
    )
  }

  return (
    <aside
      className="text-secondary-foreground relative flex h-full shrink-0 flex-col overflow-hidden pt-10"
      style={{ width: `${sidebar.width}px` }}
    >
      <SidebarHeader />
      <ScrollArea className="flex-1 overflow-hidden" type="scroll">
        <PinnedSection />
        <ProjectSection />
      </ScrollArea>
      <SidebarFooter />
    </aside>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/AppSidebar.tsx
git commit -m "feat(sidebar): support collapsed state in AppSidebar"
```

---

### Task 8: 修改 AppHeader 支持动态内容

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/AppHeader.tsx`

- [ ] **Step 1: 查看当前 AppHeader 实现**

读取 AppHeader.tsx 文件

- [ ] **Step 2: 修改 AppHeader 使用 HeaderContext**

```tsx
import { useHeader } from '@renderer/contexts/HeaderContext'

// 假设原有结构为:
// <header className="...">...</header>
// 需要将原有的 title 替换为 {content.title}
// 将原有的 actions 扩展为 [...原有actions, ...content.actions]
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/AppHeader.tsx
git commit -m "feat(header): make AppHeader dynamic via HeaderContext"
```

---

### Task 9: 修改 VaultLayout 使用 ResizablePanelGroup

**Files:**
- Modify: `apps/desktop/src/renderer/src/routes/vault/$vaultId.tsx`

- [ ] **Step 1: 查看当前 VaultLayout 实现**

读取 $vaultId.tsx 文件

- [ ] **Step 2: 重写 VaultLayout**

```tsx
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useAtomValue } from 'jotai'

import { sidebarAtom } from '@renderer/atoms'
import { HeaderProvider, useHeader } from '@renderer/contexts/HeaderContext'
import { AppHeader, AppSidebar } from '@renderer/components/app-shell'
import { panelAtom } from '@renderer/atoms/panel'
import { PanelRouter } from '@renderer/components/app-shell/panel/PanelRouter'

export const Route = createFileRoute('/vault/$vaultId')({
  component: VaultLayout,
})

function VaultLayout(): React.JSX.Element {
  const sidebar = useAtomValue(sidebarAtom)
  const [panel, setPanel] = useAtom(panelAtom)
  const { content } = useHeader()

  return (
    <HeaderProvider>
      <div className="relative z-1 flex h-full w-full flex-1 flex-col">
        <AppHeader title={content.title} actions={content.actions} />
        <PanelGroup direction="horizontal">
          <Panel
            id="sidebar"
            order={1}
            collapsed={sidebar.collapsed}
            minSize={20}
            maxSize={50}
            defaultSize={25}
          >
            <AppSidebar />
          </Panel>

          <PanelResizeHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />

          <Panel id="main" order={2}>
            <div className="flex h-full w-full flex-1 flex-col overflow-hidden py-1 pr-1">
              <main className="bg-background h-full w-full rounded-lg">
                <Outlet />
              </main>
            </div>
          </Panel>

          {!panel.collapsed && panel.type && (
            <>
              <PanelResizeHandle className="w-1 bg-transparent hover:bg-primary/20 transition-colors" />
              <Panel id="panel" order={3} minSize={25} maxSize={45} defaultSize={32}>
                <PanelRouter type={panel.type} />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </HeaderProvider>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/routes/vault/$vaultId.tsx
git commit -m "feat(layout): integrate ResizablePanelGroup for sidebar and panel"
```

---

### Task 10: 修改 ThreadPage 注册 Panel 按钮

**Files:**
- Modify: `apps/desktop/src/renderer/src/routes/vault/$vaultId/thread/$threadId.tsx`

- [ ] **Step 1: 查看当前 ThreadPage 实现**

读取 $threadId.tsx 文件

- [ ] **Step 2: 修改 ThreadPage 注册顶栏内容**

```tsx
import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAtom } from 'jotai'

import { Chat } from '@renderer/components/chat/Chat'
import { panelAtom } from '@renderer/atoms/panel'
import { useHeader } from '@renderer/contexts/HeaderContext'

export const Route = createFileRoute('/vault/$vaultId/thread/$threadId')({
  component: ThreadPage,
})

export function ThreadPage(): React.JSX.Element {
  const { threadId } = Route.useParams()
  const [panel, setPanel] = useAtom(panelAtom)
  const { setContent } = useHeader()

  useEffect(() => {
    setContent({
      title: `Thread: ${threadId}`,
      actions: [
        <button
          key="panel-toggle"
          onClick={() => setPanel((prev) => ({ ...prev, collapsed: !prev.collapsed }))}
          className="px-2 py-1 text-sm"
        >
          {panel.collapsed ? '展开' : '折叠'}
        </button>,
      ],
    })
  }, [threadId, panel.collapsed, setPanel, setContent])

  if (!threadId) {
    return null
  }

  return <Chat threadId={threadId} />
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/routes/vault/$vaultId/thread/$threadId.tsx
git commit -m "feat(thread): register panel toggle in ThreadPage header"
```

---

### Task 11: 修改 AppHeader 支持 props

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/AppHeader.tsx`

- [ ] **Step 1: 查看并修改 AppHeader**

```tsx
interface AppHeaderProps {
  title?: React.ReactNode
  actions?: React.ReactNode[]
}

// 在组件中使用 props.title 和 props.actions 替换原有内容
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/AppHeader.tsx
git commit -m "feat(header): accept title and actions props"
```

---

## 实施检查清单

完成所有任务后，验证：

- [ ] 侧边栏可以折叠/展开
- [ ] 侧边栏可以拖拽调整宽度
- [ ] Panel 可以折叠/展开
- [ ] Panel 可以拖拽调整宽度
- [ ] Panel 类型切换正常
- [ ] 状态持久化到 localStorage
- [ ] 运行 `bunx tsc --noEmit` 无错误
- [ ] 运行 `bunx oxlint` 无错误
- [ ] 运行 `bunx oxfmt` 格式化正确
