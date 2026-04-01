# Sidebar Atom 重构设计

## 目标

重构 desktop 渲染层侧边栏的状态管理，使用 Jotai Atom 封装业务逻辑，提升代码可维护性和复用性。

## 目录结构

```
renderer/src/
├── atoms/
│   ├── sidebar.ts       # sidebarAtom, sidebarPreferencesAtom
│   ├── project.ts        # projectsAtom, openProjectsAtom
│   └── thread.ts         # threadsAtom, sortedThreadsAtom, pinnedThreadsAtom,
│                         # projectThreadsSelector, selectedThreadIdAtom
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

export interface SidebarPreferences {
  collapsed: boolean
  width: number
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

export const openProjectsAtom = atom<Set<string>>(new Set())
```

### thread.ts

```typescript
import { atom } from 'jotai'
import type { Thread } from '../types/thread'

// View mode: 'folder' | 'flat'
export const viewModeAtom = atom<'folder' | 'flat'>('folder')

// Selected thread
export const selectedThreadIdAtom = atom<string | null>(null)

// Pinned thread IDs - ordered array
export const pinnedThreadIdsAtom = atom<string[]>([])

// All threads - base data
export const threadsAtom = atom<Thread[]>([])

// Derived: pinned threads (maintains order from pinnedThreadIdsAtom)
export const pinnedThreadsAtom = atom((get) => {
  const threads = get(threadsAtom)
  const pinnedIds = get(pinnedThreadIdsAtom)
  return pinnedIds
    .map(id => threads.find(t => t.id === id))
    .filter((t): t is Thread => t != null)
})

// Derived: unpinned threads sorted by updatedAt desc
export const sortedThreadsAtom = atom((get) => {
  const threads = get(threadsAtom)
  return threads
    .filter(t => !t.isPinned)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
})

// Derived: threads in a specific project (unpinned, sorted)
export const projectThreadsSelector = atom((get) => (projectId: string) => {
  const threads = get(threadsAtom)
  return threads
    .filter(t => t.projectId === projectId && !t.isPinned)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
})
```

## 类型设计

### types/thread.ts

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

### types/project.ts

```typescript
export interface Project {
  id: string
  title: string
  order: number
}
```

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
