# Sidebar Atom 重构设计

## 目标

1. FolderCell 的菜单交互事件留空，给上层组件使用
2. ThreadTitleCell 的菜单交互事件留空，给上层组件使用
3. 所有事件的处理逻辑在 ProjectSection 和 PinnedSection 中完成
4. ThreadTitleCell 使用 atom 来完成部分按钮显示隐藏，部分菜单功能是否被选中

## SidebarState 结构调整

### types/sidebar.ts

```typescript
export type OrganizeMode = 'folder' | 'flat'
export type SortBy = 'updatedAt' | 'createdAt'
export type ShowMode = 'all' | 'relevant'

export interface SidebarState {
  collapsed: boolean
  width: number
  organizeMode: OrganizeMode
  sortBy: SortBy
  showMode: ShowMode
}
```

### atoms/sidebar.ts

```typescript
export const sidebarAtom = atomWithStorage<SidebarState>('sidebar-state', {
  collapsed: false,
  width: 256,
  organizeMode: 'folder',
  sortBy: 'updatedAt',
  showMode: 'all',
})
```

**变更说明：**
- `viewMode` → `organizeMode`
- 删除 `sortOrder`（默认规则：最新在最前面）
- `sortField` → `sortBy`
- 新增 `showMode`

---

## FolderCell 重构

### Props 变更

```typescript
export interface FolderCellProps {
  className?: string
  id: string
  title: string
  isExpanded: boolean
  isDragging?: boolean
  onToggle: (id: string) => void
  onAddThread?: (folderId: string) => void
  // 新增菜单回调
  onMenuOpenInFinder?: (id: string) => void
  onMenuCreateWorktree?: (id: string) => void
  onMenuEditName?: (id: string) => void
  onMenuArchiveThreads?: (id: string) => void
  onMenuDelete?: (id: string) => void
}
```

### 菜单项实现

每个菜单项需要 `e.preventDefault()` 阻止默认行为：

```typescript
<DropdownMenuItem onClick={(e) => { e.preventDefault(); onMenuOpenInFinder?.(id) }}>
  <HugeiconsIcon icon={Folder03Icon} />
  Open in Finder
</DropdownMenuItem>
```

---

## ThreadTitleCell 重构

### Atom 来源

- 展开/折叠按钮显示：来自 `atoms/project.ts`
  - `isAllProjectsExpandedAtom`（derived）
  - `isAllProjectsCollapsedAtom`（derived）
- 菜单选中状态：`atoms/sidebar.ts` 中的 `sidebarAtom`

### 按钮显示逻辑

```typescript
import { isAllProjectsExpandedAtom, isAllProjectsCollapsedAtom } from '@renderer/atoms/project'
import { sidebarAtom } from '@renderer/atoms/sidebar'

const isAllProjectsExpanded = useAtomValue(isAllProjectsExpandedAtom)
const isAllProjectsCollapsed = useAtomValue(isAllProjectsCollapsedAtom)
```

### Props

```typescript
export interface ThreadTitleCellProps {
  title: string
  onSort?: () => void
  onAdd?: () => void
  className?: string
}
```

### 菜单选中状态

通过 `useAtom(sidebarAtom)` 读取当前状态，通过 `useSetAtom` 修改状态：

```typescript
const [sidebar] = useAtom(sidebarAtom)
const setSidebar = useSetAtom(sidebarAtom)

// 菜单项 onClick 处理
const handleOrganizeChange = (mode: OrganizeMode) => {
  setSidebar((prev) => ({ ...prev, organizeMode: mode }))
}

const handleSortByChange = (sortBy: SortBy) => {
  setSidebar((prev) => ({ ...prev, sortBy }))
}

const handleShowModeChange = (mode: ShowMode) => {
  setSidebar((prev) => ({ ...prev, showMode: mode }))
}

// <DropdownMenuCheckboxItem
//   checked={sidebar.organizeMode === 'folder'}
//   onCheckedChange={() => handleOrganizeChange('folder')}>
```

**注意：** ThreadTitleCell 的菜单事件直接在组件内部处理，无需通过回调传递给上层组件。

---

## ProjectSection 事件处理

### 需要处理的事件

**FolderCell 菜单事件（通过 FolderView 传递）：**
- `onMenuOpenInFinder`
- `onMenuCreateWorktree`
- `onMenuEditName`
- `onMenuArchiveThreads`
- `onMenuDelete`

**ThreadTitleCell 按钮事件：**
- Collapse All（展开/折叠按钮的回调）
- Expand All
- Add（新增文件夹）

**注意：** ThreadTitleCell 的菜单事件（organizeMode、sortBy、showMode 切换）直接在 ThreadTitleCell 内部处理，无需通过回调传递。

### Collapse All / Expand All 实现

使用 `projectsAtom` 获取所有项目 ID：

```typescript
const handleCollapseAll = () => {
  const projects = getAtomValue(projectsAtom)
  setOpenedProjectIds(new Set(projects.map((p) => p.id)))
}

const handleExpandAll = () => {
  setOpenedProjectIds(new Set())
}
```

---

## PinnedSection

PinnedSection 目前处理 ThreadCell 的 onTogglePin、onArchive 事件，保持不变。

---

## 实现顺序

1. 修改 `types/sidebar.ts`（类型定义）
2. 修改 `atoms/sidebar.ts`（atom 默认值）
3. 修改 `FolderCell.tsx`（添加菜单回调 props）
4. 修改 `ThreadTitleCell.tsx`（使用 atom 控制按钮显示 + 菜单事件在组件内处理 atom）
5. 修改 `FolderView.tsx`（传递菜单回调给 FolderCell）
6. 修改 `ProjectSection.tsx`（实现 Collapse/Expand All 和 Add 按钮事件 + 传递 FolderCell 回调）
