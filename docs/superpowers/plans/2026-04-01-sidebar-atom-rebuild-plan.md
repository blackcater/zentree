# Sidebar Atom 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 desktop 渲染层侧边栏的状态管理，使用 Jotai Atom 封装业务逻辑

**Architecture:** 创建 `renderer/src/atoms/` 和 `renderer/src/types/` 目录，定义基础 atom 和派生 atom，将排序/过滤等业务逻辑封装在 atom 中，删除重复的类型定义和 atom

**Tech Stack:** Jotai, TypeScript

---

## 文件结构

```
renderer/src/
├── atoms/
│   ├── sidebar.ts        # 已有，新增导入类型
│   ├── project.ts        # 新增
│   └── thread.ts         # 新增
├── types/
│   ├── sidebar.ts        # 新增
│   ├── thread.ts         # 新增
│   └── project.ts        # 新增
└── components/
    └── app-shell/
        └── sidebar/
            ├── section/                  # 新增目录
            │   ├── FlatView.tsx         # 从 thread/ 移动
            │   └── FolderView.tsx        # 从 thread/ 移动
            └── ...
```

---

## Task 1: 创建 types/sidebar.ts

**Files:**
- Create: `apps/desktop/src/renderer/src/types/sidebar.ts`

- [ ] **Step 1: 创建文件**

```typescript
export type SidebarViewMode = 'folder' | 'flat'

export interface SidebarState {
  collapsed: boolean
  width: number
  viewMode: SidebarViewMode
  sortOrder: 'asc' | 'desc'
  sortField: 'updatedAt' | 'createdAt'
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/types/sidebar.ts
git commit -m "feat: add SidebarState and SidebarViewMode types"
```

---

## Task 2: 创建 types/thread.ts

**Files:**
- Create: `apps/desktop/src/renderer/src/types/thread.ts`

- [ ] **Step 1: 创建文件**

```typescript
export interface Thread {
  id: string
  title: string
  projectId: string
  updatedAt: Date
  createdAt: Date
  isPinned: boolean
}

export type ThreadSortField = 'updatedAt' | 'createdAt'
export type ThreadSortOrder = 'asc' | 'desc'
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/types/thread.ts
git commit -m "feat: add Thread type and related types"
```

---

## Task 3: 创建 types/project.ts

**Files:**
- Create: `apps/desktop/src/renderer/src/types/project.ts`
- Modify: `apps/desktop/src/renderer/src/types/thread.ts:1` (添加 import)

- [ ] **Step 1: 创建 types/project.ts**

```typescript
export interface Project {
  id: string
  title: string
}

export interface ProjectTreeNode {
  project: Project
  threads: import('./thread').Thread[]
}

export type ProjectTree = ProjectTreeNode[]
```

- [ ] **Step 2: 更新 types/thread.ts**

在 `types/thread.ts` 顶部添加:

```typescript
export interface Thread {
  id: string
  title: string
  projectId: string
  updatedAt: Date
  createdAt: Date
  isPinned: boolean
}

export type ThreadSortField = 'updatedAt' | 'createdAt'
export type ThreadSortOrder = 'asc' | 'desc'
```

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/renderer/src/types/project.ts apps/desktop/src/renderer/src/types/thread.ts
git commit -m "feat: add Project type and ProjectTreeNode"
```

---

## Task 4: 更新 atoms/sidebar.ts

**Files:**
- Modify: `apps/desktop/src/renderer/src/atoms/sidebar.ts`

- [ ] **Step 1: 更新 sidebar.ts**

将 `sidebar.ts` 更新为:

```typescript
import { atomWithStorage } from 'jotai/utils'
import type { SidebarState } from '../types/sidebar'

export const sidebarAtom = atomWithStorage<SidebarState>('sidebar-state', {
  collapsed: false,
  width: 256,
  viewMode: 'folder',
  sortOrder: 'desc',
  sortField: 'updatedAt',
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/atoms/sidebar.ts
git commit -m "refactor: sidebarAtom now imports SidebarState from types"
```

---

## Task 5: 创建 atoms/project.ts

**Files:**
- Create: `apps/desktop/src/renderer/src/atoms/project.ts`

- [ ] **Step 1: 创建 atoms/project.ts**

```typescript
import { atomWithStorage } from 'jotai/utils'
import { atom } from 'jotai'
import type { Project } from '../types/project'

export const projectsAtom = atomWithStorage<Project[]>('projects', [])

export const openedProjectIdsAtom = atom<Set<string>>(new Set())

// Derived: are all projects expanded
export const isAllProjectsExpandedAtom = atom((get) => {
  const projects = get(projectsAtom)
  const openedProjectIds = get(openedProjectIdsAtom)
  return projects.length > 0 && projects.every(p => openedProjectIds.has(p.id))
})

// Derived: are all projects collapsed
export const isAllProjectsCollapsedAtom = atom((get) => {
  const openedProjectIds = get(openedProjectIdsAtom)
  return openedProjectIds.size === 0
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/atoms/project.ts
git commit -m "feat: add project atoms with derived selectors"
```

---

## Task 6: 创建 atoms/thread.ts

**Files:**
- Create: `apps/desktop/src/renderer/src/atoms/thread.ts`

- [ ] **Step 1: 创建 atoms/thread.ts**

```typescript
import { atom } from 'jotai'
import type { Thread, ThreadSortField, ThreadSortOrder } from '../types/thread'
import { sidebarAtom } from './sidebar'
import { projectsAtom } from './project'

// All threads - base data
export const threadsAtom = atom<Thread[]>([])

// Pinned thread IDs - ordered array
export const pinnedThreadIdsAtom = atom<string[]>([])

// Derived: pinned threads (maintains order from pinnedThreadIdsAtom)
export const pinnedThreadsAtom = atom((get) => {
  const threads = get(threadsAtom)
  const pinnedIds = get(pinnedThreadIdsAtom)
  return pinnedIds
    .map(id => threads.find(t => t.id === id))
    .filter((t): t is Thread => t != null)
})

// Derived: unpinned threads for flat view, sorted by sidebar preferences
export const flatThreadsAtom = atom((get) => {
  const threads = get(threadsAtom)
  const pinnedIds = get(pinnedThreadIdsAtom)
  const sidebar = get(sidebarAtom)

  const unpinned = threads.filter(t => !pinnedIds.includes(t.id))

  return [...unpinned].sort((a, b) => {
    const field: ThreadSortField = sidebar.sortField
    const order: ThreadSortOrder = sidebar.sortOrder === 'asc' ? 1 : -1
    const aVal = field === 'updatedAt' ? a.updatedAt.getTime() : a.createdAt.getTime()
    const bVal = field === 'updatedAt' ? b.updatedAt.getTime() : b.createdAt.getTime()
    return (aVal - bVal) * order
  })
})

// Derived: project tree with threads, sorted by sidebar preferences
export const projectTreeAtom = atom((get) => {
  const threads = get(threadsAtom)
  const pinnedIds = get(pinnedThreadIdsAtom)
  const projects = get(projectsAtom)
  const sidebar = get(sidebarAtom)

  return projects.map((project) => ({
    project,
    threads: threads
      .filter(t => t.projectId === project.id && !pinnedIds.includes(t.id))
      .sort((a, b) => {
        const field: ThreadSortField = sidebar.sortField
        const order: ThreadSortOrder = sidebar.sortOrder === 'asc' ? 1 : -1
        const aVal = field === 'updatedAt' ? a.updatedAt.getTime() : a.createdAt.getTime()
        const bVal = field === 'updatedAt' ? b.updatedAt.getTime() : b.createdAt.getTime()
        return (aVal - bVal) * order
      }),
  }))
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/desktop/src/renderer/src/atoms/thread.ts
git commit -m "feat: add thread atoms with derived selectors"
```

---

## Task 7: 移动 FolderView.tsx 和 FlatView.tsx 到 section/ 目录

**Files:**
- Create: `apps/desktop/src/renderer/src/components/app-shell/sidebar/section/FolderView.tsx`
- Create: `apps/desktop/src/renderer/src/components/app-shell/sidebar/section/FlatView.tsx`
- Delete: `apps/desktop/src/renderer/src/components/app-shell/sidebar/thread/FolderView.tsx`
- Delete: `apps/desktop/src/renderer/src/components/app-shell/sidebar/thread/FlatView.tsx`
- Modify: `FolderView.tsx` 和 `FlatView.tsx` 中的 import 路径

- [ ] **Step 1: 创建 section 目录并移动 FolderView.tsx**

读取 `apps/desktop/src/renderer/src/components/app-shell/sidebar/thread/FolderView.tsx`，然后在 `section/` 目录下创建更新后的版本，import 路径更新为:
- `../../atoms/thread` → `../../../atoms/thread`
- `../../atoms/project` → `../../../atoms/project`
- `../cell/FolderCell` → `../cell/FolderCell`
- `../cell/ThreadCell` → `../cell/ThreadCell`

- [ ] **Step 2: 移动 FlatView.tsx**

读取 `apps/desktop/src/renderer/src/components/app-shell/sidebar/thread/FlatView.tsx`，然后在 `section/` 目录下创建更新后的版本，import 路径更新为:
- `../../atoms/thread` → `../../../atoms/thread`
- `../cell/ThreadCell` → `../cell/ThreadCell`

- [ ] **Step 3: 删除旧的 thread/ 目录下的文件**

```bash
rm apps/desktop/src/renderer/src/components/app-shell/sidebar/thread/FolderView.tsx
rm apps/desktop/src/renderer/src/components/app-shell/sidebar/thread/FlatView.tsx
```

- [ ] **Step 4: 如果 thread/ 目录为空则删除**

```bash
rmdir apps/desktop/src/renderer/src/components/app-shell/sidebar/thread 2>/dev/null || true
```

- [ ] **Step 5: Commit**

```bash
git add -A apps/desktop/src/renderer/src/components/app-shell/sidebar/section/
git commit -m "refactor: move FolderView and FlatView to section/ directory"
```

---

## Task 8: 更新组件 import 路径

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/ProjectSection.tsx`
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx`
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/SidebarHeader.tsx`

- [ ] **Step 1: 更新 ProjectSection.tsx**

将 `../atoms/thread-atoms` 改为:
- `viewModeAtom` → 从 `sidebarAtom` 获取
- `foldersAtom` → `projectsAtom` (重命名)
- `threadsAtom` → 使用 `projectTreeAtom` 替代手动计算
- `openFoldersAtom` → `openedProjectIdsAtom`

- [ ] **Step 2: 更新 PinnedSection.tsx**

将 `../atoms/thread-atoms` 改为 `../../../atoms/thread`

- [ ] **Step 3: 更新 SidebarHeader.tsx（如需要）**

根据实际使用的 atom 更新 import

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/ProjectSection.tsx
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx
git add apps/desktop/src/renderer/src/components/app-shell/sidebar/SidebarHeader.tsx
git commit -m "refactor: update component imports to new atom locations"
```

---

## Task 9: 删除重复文件

**Files:**
- Delete: `apps/desktop/src/renderer/src/components/app-shell/atoms/thread-atoms.ts`
- Delete: `apps/desktop/src/renderer/src/components/app-shell/types/thread.ts`

- [ ] **Step 1: 删除重复文件**

```bash
rm apps/desktop/src/renderer/src/components/app-shell/atoms/thread-atoms.ts
rm apps/desktop/src/renderer/src/components/app-shell/types/thread.ts
```

- [ ] **Step 2: 如果 atoms/ 目录为空则删除**

```bash
rmdir apps/desktop/src/renderer/src/components/app-shell/atoms 2>/dev/null || true
```

- [ ] **Step 3: 如果 types/ 目录为空则删除**

```bash
rmdir apps/desktop/src/renderer/src/components/app-shell/types 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor: remove duplicate thread-atoms and types"
```

---

## Task 10: 验证

**Files:**
- Run: `bunx tsc --noEmit`
- Run: `bunx oxlint`

- [ ] **Step 1: 运行 TypeScript 检查**

```bash
cd apps/desktop && bunx tsc --noEmit
```

- [ ] **Step 2: 运行 oxlint 检查**

```bash
cd apps/desktop && bunx oxlint
```

- [ ] **Step 3: 如有错误则修复**

根据错误信息修复问题，可能需要调整 import 路径或类型定义

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: resolve type checking and linting errors"
```

---

## 执行总结

| Task | 描述 | 状态 |
|------|------|------|
| 1 | 创建 types/sidebar.ts | ⬜ |
| 2 | 创建 types/thread.ts | ⬜ |
| 3 | 创建 types/project.ts | ⬜ |
| 4 | 更新 atoms/sidebar.ts | ⬜ |
| 5 | 创建 atoms/project.ts | ⬜ |
| 6 | 创建 atoms/thread.ts | ⬜ |
| 7 | 移动 FolderView/FlatView 到 section/ | ⬜ |
| 8 | 更新组件 import 路径 | ⬜ |
| 9 | 删除重复文件 | ⬜ |
| 10 | 验证 | ⬜ |
