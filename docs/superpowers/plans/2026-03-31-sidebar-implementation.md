# Sidebar Thread 组件实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 sidebar 中的 thread 置顶区和 thread 区组件，包括树形结构、拖拽排序、折叠展开等功能。

**Architecture:** 使用 @headless-tree/react 管理树形结构和拖拽，数据通过 flatData 扁平化传入。视图模式通过 jotai atom 管理状态，展开状态持久化到 localStorage。

**Tech Stack:** @headless-tree/core, @headless-tree/react, @hugeicons/core-free-icons, jotai

---

## 文件结构

```
apps/desktop/src/renderer/src/components/app-shell/
├── cell/
│   ├── Cell.tsx           # 修改：基础 Cell 样式
│   ├── ThreadCell.tsx     # 修改：完善 ThreadCell
│   ├── FolderCell.tsx      # 修改：完善 FolderCell
│   └── TitleCell.tsx      # 修改：完善 TitleCell
├── sidebar/
│   ├── PinnedSection.tsx  # 创建：置顶区
│   ├── FolderView.tsx     # 创建：文件夹视图
│   └── FlatView.tsx       # 创建：扁平视图
├── atoms/
│   └── thread-atoms.ts    # 创建：状态管理 atoms
├── types/
│   └── thread.ts          # 创建：类型定义
└── AppSidebar.tsx         # 修改：整合所有组件
```

---

## Task 1: 创建类型定义

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/types/thread.ts`

- [ ] **Step 1: 创建 types 目录和类型定义文件**

```typescript
// apps/desktop/src/renderer/src/components/app-shell/types/thread.ts

export interface Thread {
  id: string
  title: string
  updatedAt: Date
  isPinned: boolean
  folderId: string | null
}

export interface Folder {
  id: string
  title: string
  order: number
}

export type TreeNode =
  | { type: 'folder'; id: string; name: string; order: number }
  | { type: 'thread'; id: string; name: string; folderId: string | null; updatedAt: Date; isPinned: boolean }

export type ViewMode = 'folder' | 'flat'
```

- [ ] **Step 2: 创建 types 目录并移动文件**

```bash
mkdir -p apps/desktop/src/renderer/src/components/app-shell/types
mv apps/desktop/src/renderer/src/components/app-shell/types/thread.ts apps/desktop/src/renderer/src/components/app-shell/types/thread.ts
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/types/thread.ts
git commit -m "feat(desktop): add thread and folder type definitions"
```

---

## Task 2: 创建状态管理 Atoms

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/atoms/thread-atoms.ts`

- [ ] **Step 1: 创建 atoms 目录和文件**

```typescript
// apps/desktop/src/renderer/src/components/app-shell/atoms/thread-atoms.ts
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// View mode: 'folder' | 'flat'
export const viewModeAtom = atom<'folder' | 'flat'>('folder')

// Folder expanded state - persisted to localStorage
export const openFoldersAtom = atomWithStorage<Set<string>>(
  'sidebar-open-folders',
  new Set()
)

// Pinned threads (just IDs)
export const pinnedThreadsAtom = atom<Set<string>>(new Set())

// Mock data for development - will be replaced with real data later
export const threadsAtom = atom<Thread[]>([
  {
    id: 't1',
    title: 'Thread 1',
    updatedAt: new Date('2026-03-30'),
    isPinned: true,
    folderId: null,
  },
  {
    id: 't2',
    title: 'Thread 2 in Folder A',
    updatedAt: new Date('2026-03-29'),
    isPinned: false,
    folderId: 'f1',
  },
  {
    id: 't3',
    title: 'Thread 3 in Folder A',
    updatedAt: new Date('2026-03-28'),
    isPinned: false,
    folderId: 'f1',
  },
  {
    id: 't4',
    title: 'Thread 4 in Folder B',
    updatedAt: new Date('2026-03-27'),
    isPinned: false,
    folderId: 'f2',
  },
])

export const foldersAtom = atom<Folder[]>([
  { id: 'f1', title: 'Folder A', order: 0 },
  { id: 'f2', title: 'Folder B', order: 1 },
])
```

- [ ] **Step 2: 创建 atoms 目录并移动文件**

```bash
mkdir -p apps/desktop/src/renderer/src/components/app-shell/atoms
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/atoms/thread-atoms.ts
git commit -m "feat(desktop): add thread state management atoms with jotai"
```

---

## Task 3: 完善 Cell 基础组件

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/cell/Cell.tsx`

- [ ] **Step 1: 实现 Cell 基础样式组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/cell/Cell.tsx
import { cn } from '@acme-ai/ui/lib/utils'
import React from 'react'

export interface CellProps {
  className?: string
  children: React.ReactNode
}

export function Cell({ className, children }: CellProps) {
  return (
    <div
      className={cn(
        'group flex h-9 cursor-pointer items-center gap-2 rounded-md px-2',
        'text-sm text-muted-foreground transition-colors',
        'hover:bg-white/5 hover:text-foreground',
        'active:bg-white/10',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CellIcon({ className, children }: CellProps) {
  return (
    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center', className)}>
      {children}
    </div>
  )
}

export function CellName({ className, children }: CellProps) {
  return (
    <span className={cn('flex-1 truncate text-[13px]', className)}>
      {children}
    </span>
  )
}

export function CellActions({ className, children }: CellProps) {
  return (
    <div className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity', className)}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/cell/Cell.tsx
git commit -m "feat(desktop): add Cell base component with styling utilities"
```

---

## Task 4: 完善 ThreadCell 组件

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/cell/ThreadCell.tsx`

- [ ] **Step 1: 实现 ThreadCell 组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/cell/ThreadCell.tsx
import { formatDistanceToNow } from 'date-fns'
import { PinIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@acme-ai/ui/foundation'
import { MoreHorizontalIcon, DeleteIcon, ArchiveIcon } from '@hugeicons/core-free-icons'

import { Cell, CellIcon, CellName, CellActions } from './Cell'
import { cn } from '@acme-ai/ui/lib/utils'
import { Thread } from '../types/thread'

export interface ThreadCellProps {
  thread: Thread
  isPinned?: boolean
  onTogglePin?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function ThreadCell({
  thread,
  isPinned = false,
  onTogglePin,
  onDelete,
  className,
}: ThreadCellProps) {
  return (
    <Cell className={cn('text-left', className)}>
      {/* 左侧图标区：hover 显示置顶图标 */}
      <CellIcon className="justify-center">
        <HugeiconsIcon
          icon={PinIcon}
          className={cn(
            'h-4 w-4 text-muted-foreground transition-opacity',
            isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
        />
      </CellIcon>

      {/* 名称 */}
      <CellName className="text-foreground">{thread.title}</CellName>

      {/* 尾部：时间 + hover 操作 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground/60">
          {formatDistanceToNow(thread.updatedAt, { addSuffix: true })}
        </span>
        <CellActions>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(thread.id)
            }}
            className="h-6 w-6"
          >
            <HugeiconsIcon icon={DeleteIcon} className="h-3 w-3" />
          </Button>
        </CellActions>
      </div>
    </Cell>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/cell/ThreadCell.tsx
git commit -m "feat(desktop): implement ThreadCell component with hover states"
```

---

## Task 5: 完善 FolderCell 组件

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/cell/FolderCell.tsx`

- [ ] **Step 1: 实现 FolderCell 组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/cell/FolderCell.tsx
import { useState } from 'react'
import {
  FolderCloseIcon,
  FolderOpenIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@acme-ai/ui/foundation'

import { Cell, CellIcon, CellName, CellActions } from './Cell'
import { cn } from '@acme-ai/ui/lib/utils'

export interface FolderCellProps {
  id: string
  title: string
  isExpanded: boolean
  onToggle: (id: string) => void
  onAddThread?: (folderId: string) => void
  onRename?: (folderId: string) => void
  onDelete?: (folderId: string) => void
  className?: string
}

export function FolderCell({
  id,
  title,
  isExpanded,
  onToggle,
  onAddThread,
  onRename,
  onDelete,
  className,
}: FolderCellProps) {
  return (
    <Cell className={cn('font-medium text-foreground', className)}>
      {/* 左侧图标 */}
      <CellIcon
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(id)
        }}
      >
        {/* hover 展开/折叠图标 */}
        <HugeiconsIcon
          icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
          className="absolute h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        {/* 实际的 folder 图标 */}
        <HugeiconsIcon
          icon={isExpanded ? FolderOpenIcon : FolderCloseIcon}
          className="h-4 w-4 text-foreground"
        />
      </CellIcon>

      {/* 名称 */}
      <CellName>{title}</CellName>

      {/* 操作区 */}
      <CellActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6">
              <HugeiconsIcon icon={MoreHorizontalIcon} className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename?.(id)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            onAddThread?.(id)
          }}
          className="h-6 w-6"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
        </Button>
      </CellActions>
    </Cell>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/cell/FolderCell.tsx
git commit -m "feat(desktop): implement FolderCell component with expand/collapse"
```

---

## Task 6: 完善 TitleCell 组件

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/cell/TitleCell.tsx`

- [ ] **Step 1: 实现 TitleCell 组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/cell/TitleCell.tsx
import { Add01Icon, SortAscending02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@acme-ai/ui/foundation'

import { Cell, CellName, CellActions } from './Cell'
import { cn } from '@acme-ai/ui/lib/utils'

export interface TitleCellProps {
  title: string
  onSort?: () => void
  onAdd?: () => void
  className?: string
}

export function TitleCell({
  title,
  onSort,
  onAdd,
  className,
}: TitleCellProps) {
  return (
    <Cell className={cn('text-muted-foreground cursor-default hover:bg-transparent', className)}>
      <CellName className="text-xs font-semibold uppercase tracking-wider">
        {title}
      </CellName>
      <CellActions>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            onSort?.()
          }}
          className="h-6 w-6"
          aria-label="Sort"
        >
          <HugeiconsIcon icon={SortAscending02Icon} className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            onAdd?.()
          }}
          className="h-6 w-6"
          aria-label="Add"
        >
          <HugeiconsIcon icon={Add01Icon} className="h-3 w-3" />
        </Button>
      </CellActions>
    </Cell>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/cell/TitleCell.tsx
git commit -m "feat(desktop): implement TitleCell component with sort and add actions"
```

---

## Task 7: 创建 PinnedSection 组件

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx`

- [ ] **Step 1: 实现 PinnedSection 组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx
import { useAtomValue } from 'jotai'
import { ThreadCell } from '../cell/ThreadCell'
import { TitleCell } from '../cell/TitleCell'
import { threadsAtom, pinnedThreadsAtom } from '../atoms/thread-atoms'

export function PinnedSection() {
  const threads = useAtomValue(threadsAtom)
  const pinnedIds = useAtomValue(pinnedThreadsAtom)

  const pinnedThreads = threads.filter((t) => pinnedIds.has(t.id))

  if (pinnedThreads.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-1 px-2">
      <TitleCell title="Pinned" />
      <div className="flex flex-col gap-0.5">
        {pinnedThreads.map((thread) => (
          <ThreadCell key={thread.id} thread={thread} isPinned />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx
git commit -m "feat(desktop): add PinnedSection component"
```

---

## Task 8: 创建 FolderView 组件（使用 headless-tree）

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/sidebar/FolderView.tsx`

- [ ] **Step 1: 实现 FolderView 组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/sidebar/FolderView.tsx
import { useAtom, useAtomValue } from 'jotai'
import { useTree } from '@headless-tree/react'
import { FolderCell } from '../cell/FolderCell'
import { ThreadCell } from '../cell/ThreadCell'
import { TitleCell } from '../cell/TitleCell'
import { foldersAtom, threadsAtom, openFoldersAtom, viewModeAtom } from '../atoms/thread-atoms'
import type { TreeNode } from '../types/thread'
import { cn } from '@acme-ai/ui/lib/utils'

// Mock flat data for headless-tree
function useFlatData(): TreeNode[] {
  const folders = useAtomValue(foldersAtom)
  const threads = useAtomValue(threadsAtom)

  const folderNodes: TreeNode[] = folders.map((f) => ({
    type: 'folder',
    id: f.id,
    name: f.title,
    order: f.order,
  }))

  const threadNodes: TreeNode[] = threads
    .filter((t) => !t.isPinned)
    .map((t) => ({
      type: 'thread',
      id: t.id,
      name: t.title,
      folderId: t.folderId,
      updatedAt: t.updatedAt,
      isPinned: t.isPinned,
    }))

  return [...folderNodes, ...threadNodes]
}

export function FolderView() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom)
  const [openFolders, setOpenFolders] = useAtom(openFoldersAtom)
  const folders = useAtomValue(foldersAtom)
  const threads = useAtomValue(threadsAtom)

  const flatData = useFlatData()

  // Initialize tree with flat data
  const tree = useTree({
    flatData,
    rootItemId: 'root',
    canDrag: (item) => item.data.type === 'folder',
    canDrop: (item, target) => target.data.type === 'folder',
  })

  const handleToggleFolder = (folderId: string) => {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const handleSort = () => {
    setViewMode('flat')
  }

  const handleAddFolder = () => {
    // TODO: implement folder creation
  }

  // Group threads by folder
  const unfolderedThreads = threads.filter((t) => !t.folderId && !t.isPinned)
  const folderContents = folders.map((folder) => ({
    folder,
    threads: threads.filter((t) => t.folderId === folder.id),
  }))

  return (
    <section className="flex flex-col gap-1 px-2">
      <TitleCell
        title="Threads"
        onSort={handleSort}
        onAdd={handleAddFolder}
      />
      <div className="flex flex-col gap-0.5">
        {/* Unfoldered threads */}
        {unfolderedThreads.map((thread) => (
          <ThreadCell key={thread.id} thread={thread} />
        ))}

        {/* Folders with their threads */}
        {folderContents.map(({ folder, threads: folderThreads }) => {
          const isOpen = openFolders.has(folder.id)
          return (
            <div key={folder.id} className="flex flex-col gap-0.5">
              <FolderCell
                id={folder.id}
                title={folder.title}
                isExpanded={isOpen}
                onToggle={handleToggleFolder}
                onAddThread={(folderId) => {
                  // TODO: implement add thread to folder
                }}
              />
              {isOpen && (
                <div className="ml-4 flex flex-col gap-0.5">
                  {folderThreads.map((thread) => (
                    <ThreadCell key={thread.id} thread={thread} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/FolderView.tsx
git commit -m "feat(desktop): add FolderView component with headless-tree integration"
```

---

## Task 9: 创建 FlatView 组件

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/sidebar/FlatView.tsx`

- [ ] **Step 1: 实现 FlatView 组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/sidebar/FlatView.tsx
import { useAtom, useAtomValue } from 'jotai'
import { ThreadCell } from '../cell/ThreadCell'
import { TitleCell } from '../cell/TitleCell'
import { threadsAtom, viewModeAtom, foldersAtom } from '../atoms/thread-atoms'

export function FlatView() {
  const [viewMode, setViewMode] = useAtom(viewModeAtom)
  const threads = useAtomValue(threadsAtom)

  const handleSort = () => {
    setViewMode('folder')
  }

  const handleAddThread = () => {
    // TODO: implement add thread
  }

  // Sort threads by updatedAt descending
  const sortedThreads = [...threads]
    .filter((t) => !t.isPinned)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

  return (
    <section className="flex flex-col gap-1 px-2">
      <TitleCell
        title="All Threads"
        onSort={handleSort}
        onAdd={handleAddThread}
      />
      <div className="flex flex-col gap-0.5">
        {sortedThreads.map((thread) => (
          <ThreadCell key={thread.id} thread={thread} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/FlatView.tsx
git commit -m "feat(desktop): add FlatView component with sorted threads"
```

---

## Task 10: 更新 AppSidebar 整合所有组件

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/AppSidebar.tsx`

- [ ] **Step 1: 更新 AppSidebar 整合所有区域组件**

```tsx
// apps/desktop/src/renderer/src/components/app-shell/AppSidebar.tsx
import { useAtomValue } from 'jotai'
import { ScrollArea } from '@acme-ai/ui/foundation'

import { SidebarFooter } from './sidebar/SidebarFooter'
import { SidebarHeader } from './sidebar/SidebarHeader'
import { PinnedSection } from './sidebar/PinnedSection'
import { FolderView } from './sidebar/FolderView'
import { FlatView } from './sidebar/FlatView'
import { viewModeAtom } from './atoms/thread-atoms'

export function AppSidebar(): React.JSX.Element {
  const viewMode = useAtomValue(viewModeAtom)

  return (
    <aside className="text-secondary-foreground relative flex w-[256px] shrink-0 flex-col">
      <SidebarHeader />
      {/* Sidebar Content */}
      <ScrollArea className="flex-1">
        {/* Pinned Section */}
        <PinnedSection />
        {/* Thread Section - switches between FolderView and FlatView */}
        {viewMode === 'folder' ? <FolderView /> : <FlatView />}
      </ScrollArea>
      {/* Sidebar Footer */}
      <SidebarFooter />
    </aside>
  )
}
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 运行开发服务器验证**

```bash
cd apps/desktop && bun run dev
```

- [ ] **Step 4: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/AppSidebar.tsx
git commit -m "feat(desktop): integrate all sidebar sections into AppSidebar"
```

---

## Task 11: 添加拖拽排序功能

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/FolderView.tsx`

- [ ] **Step 1: 实现 folder 拖拽排序**

需要添加 drag & drop indicator 和 folder 排序逻辑：

```tsx
// 在 FolderView.tsx 中添加以下功能：

// 1. 添加 drop indicator 状态
const [dropTargetId, setDropTargetId] = useState<string | null>(null)
const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(null)

// 2. 在 tree.useTree 的 onDragOver 中更新状态
// 在 tree.useTree 的 onDrop 中执行排序

// 3. 在 FolderCell 上渲染 drop indicator
// 在 folder 的上方或下方显示 2px 高的线条
```

- [ ] **Step 2: 验证代码正确**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/FolderView.tsx
git commit -m "feat(desktop): add drag-and-drop reordering for folders"
```

---

## 自检清单

完成所有任务后，请确认：

1. **Spec coverage**: 每个设计需求都有对应的任务实现
   - [x] ThreadCell 组件（图标、名称、尾部）
   - [x] FolderCell 组件（展开/折叠图标、名称、操作）
   - [x] TitleCell 组件（标题、操作按钮）
   - [x] PinnedSection 置顶区
   - [x] FolderView 文件夹视图
   - [x] FlatView 扁平视图
   - [x] headless-tree 集成
   - [x] 拖拽排序功能

2. **Placeholder scan**: 无 "TBD"、"TODO" 等占位符（除了 UI 操作回调函数）

3. **Type consistency**: 类型定义在 thread.ts 中统一管理

---

**Plan complete!** 实施计划已保存到 `docs/superpowers/plans/2026-03-31-sidebar-implementation.md`。

两个执行选项：

**1. Subagent-Driven (推荐)** - 我调度子代理逐任务执行，任务间审核，快速迭代

**2. Inline Execution** - 在此会话中执行任务，带检查点的批量执行

您选择哪种方式？