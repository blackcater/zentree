# Sidebar Atom 重构设计

## 目标

重构 desktop 渲染层侧边栏的状态管理，使用 Jotai Atom 封装业务逻辑，提升代码可维护性和复用性。

## 目录结构

```
renderer/src/
├── atoms/
│   ├── sidebar.ts        # sidebarAtom
│   ├── project.ts        # projectsAtom, openedProjectIdsAtom,
│                         # areAllProjectsExpandedAtom, areAllProjectsCollapsedAtom
│   └── thread.ts         # threadsAtom, pinnedThreadsAtom, pinnedThreadIdsAtom,
│                         # flatThreadsAtom, projectTreeAtom
├── types/
│   ├── sidebar.ts        # SidebarState, SidebarViewMode
│   ├── thread.ts         # Thread
│   └── project.ts        # Project
└── components/
    └── app-shell/
        ├── AppSidebar.tsx
        └── sidebar/
            ├── SidebarHeader.tsx
            ├── SidebarFooter.tsx
            ├── section/
            │   ├── PinnedSection.tsx
            │   ├── ProjectSection.tsx
            │   ├── FlatView.tsx
            │   └── FolderView.tsx
            └── cell/
                ├── Cell.tsx
                ├── FolderCell.tsx
                ├── ThreadCell.tsx
                └── TitleCell.tsx
```

## Atom 设计

### sidebar.ts

```typescript
import { atomWithStorage } from 'jotai/utils'

export interface SidebarState {
  collapsed: boolean
  width: number
  viewMode: 'folder' | 'flat'
  sortOrder: 'asc' | 'desc'
  sortField: 'updatedAt' | 'createdAt'
}

export const sidebarAtom = atomWithStorage<SidebarState>('sidebar-state', {
  collapsed: false,
  width: 256,
  viewMode: 'folder',
  sortOrder: 'desc',
  sortField: 'updatedAt',
})
```

### project.ts

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

### thread.ts

```typescript
import { atom } from 'jotai'
import type { Thread } from '../types/thread'
import { sidebarAtom } from './sidebar'

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
    const field = sidebar.sortField
    const order = sidebar.sortOrder === 'asc' ? 1 : -1
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
        const field = sidebar.sortField
        const order = sidebar.sortOrder === 'asc' ? 1 : -1
        const aVal = field === 'updatedAt' ? a.updatedAt.getTime() : a.createdAt.getTime()
        const bVal = field === 'updatedAt' ? b.updatedAt.getTime() : b.createdAt.getTime()
        return (aVal - bVal) * order
      }),
  }))
})
```

## 类型设计

### types/thread.ts

```typescript
import type { Project } from './project'

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

### types/project.ts

```typescript
import type { Thread } from './thread'

export interface Project {
  id: string
  title: string
}

export interface ProjectTreeNode {
  project: Project
  threads: Thread[]
}

export type ProjectTree = ProjectTreeNode[]

### types/sidebar.ts

```typescript
export interface SidebarState {
  collapsed: boolean
  width: number
  viewMode: 'folder' | 'flat'
  sortOrder: 'asc' | 'desc'
  sortField: 'updatedAt' | 'createdAt'
}

export type SidebarViewMode = 'folder' | 'flat'
```

## 组件调整

1. **删除重复定义**：`components/app-shell/atoms/thread-atoms.ts` 中的内容合并到 `atoms/thread.ts`
2. **删除重复类型**：`components/app-shell/types/thread.ts` 中的内容合并到 `types/thread.ts`
3. **重组目录**：`FolderView.tsx` 和 `FlatView.tsx` 移动到 `section/` 目录下

## 迁移步骤

1. 创建 `renderer/src/atoms/` 和 `renderer/src/types/` 目录结构
2. 定义所有 atom 和类型
3. 更新组件 import 路径
4. 删除旧的重复文件
5. 运行 `bunx tsc --noEmit` 和 `bunx oxlint` 验证

## 后续扩展

以下业务逻辑可后续封装为派生 atom：

- 拖拽排序逻辑
- 搜索/过滤逻辑
- 项目折叠状态管理
