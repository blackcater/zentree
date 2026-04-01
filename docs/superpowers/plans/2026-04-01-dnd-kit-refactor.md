# Sidebar 拖拽动画重构计划

> 使用 @dnd-kit/react 重构拖拽实现，实现流畅的占位符动画效果

**Goal:** 实现占位符动画效果的拖拽：元素拖走后原地留空白，其他元素平滑移动，释放时落入空白

**Architecture:**
- PinnedSection: 使用 `useSortable` 实现置顶区 thread 拖拽排序
- FolderView: 使用 `useSortable` 实现 Folder 拖拽排序，FolderCell + ThreadCell 作为整体移动
- `DragOverlay` 显示拖拽中的元素预览
- 使用 `transition` 配置平滑动画

**Tech Stack:** @dnd-kit/react, React, TailwindCSS

---

## 文件结构

```
apps/desktop/src/renderer/src/components/app-shell/
├── AppSidebar.tsx                    # 添加 DragDropProvider
├── sidebar/
│   ├── PinnedSection.tsx            # 重构: 使用 useSortable
│   ├── cell/
│   │   └── FolderCell.tsx          # 添加 handleRef 支持
│   └── thread/
│       └── FolderView.tsx          # 重构: 使用 useSortable，Folder+ThreadCell 整体
```

---

## Task 1: 在 AppSidebar 添加 DragDropProvider

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/AppSidebar.tsx`

### 修改内容

```typescript
import { DragDropProvider } from '@dnd-kit/react'

export function AppSidebar(): React.JSX.Element {
	return (
		<aside className="...">
			<SidebarHeader />
			<ScrollArea className="flex-1">
				<DragDropProvider>
					<PinnedSection />
					<ProjectSection />
				</DragDropProvider>
			</ScrollArea>
			<SidebarFooter />
		</aside>
	)
}
```

---

## Task 2: 重构 PinnedSection 使用 useSortable

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx`

### 实现要点

1. 使用 `useSortable` hook 替代原生 drag events
2. `transition: { duration: 200, easing: 'ease-out', idle: true }` 实现平滑动画
3. `isDragging` 状态用于添加拖拽样式
4. 添加 `DragOverlay` 显示拖拽预览

### 核心代码结构

```typescript
import { useState, useCallback, useRef } from 'react'
import { useAtomValue, useAtom } from 'jotai'
import { useSortable, DragOverlay } from '@dnd-kit/react'
import { threadsAtom, pinnedThreadIdsAtom } from '../../atoms/thread-atoms'
import { ThreadCell } from '../cell/ThreadCell'

function SortableThread({ thread, index }) {
	const { ref, isDragging, transition } = useSortable({
		id: thread.id,
		index,
		transition: { duration: 200, easing: 'ease-out', idle: true },
	})

	return (
		<div
			ref={ref}
			style={{ transition }}
			className={isDragging ? 'opacity-50' : ''}
		>
			<ThreadCell
				thread={thread}
				isPinned={true}
				draggable={true}
			/>
		</div>
	)
}

export function PinnedSection() {
	const threads = useAtomValue(threadsAtom)
	const [pinnedThreadIds, setPinnedThreadIds] = useAtom(pinnedThreadIdsAtom)
	const [activeId, setActiveId] = useState<string | null>(null)

	// DragOverlay 显示正在拖拽的元素
	const activeThread = activeId ? threads.find(t => t.id === activeId) : null

	const pinnedThreads = pinnedThreadIds
		.map(id => threads.find(t => t.id === id))
		.filter(t => t != null)

	if (pinnedThreads.length === 0) return null

	return (
		<section className="flex flex-col gap-1 px-2 py-2">
			<DragOverlay>
				{activeThread && (
					<ThreadCell thread={activeThread} isPinned />
				)}
			</DragOverlay>
			<div className="flex flex-col gap-0.5">
				{pinnedThreads.map((thread, index) => (
					<SortableThread
						key={thread.id}
						thread={thread}
						index={index}
					/>
				))}
			</div>
		</section>
	)
}
```

### 拖拽状态管理

需要在 `onDragStart` / `onDragEnd` 中同步 pinnedThreadIdsAtom：

```typescript
// 使用 onDragEnd 更新状态
// @dnd-kit/react 的 useSortable 会自动处理乐观排序
// 我们只需要在 onDragEnd 时将 optimistic 状态持久化
```

---

## Task 3: 重构 FolderView 使用 useSortable

**Files:**
- Modify: `apps/desktop/src/renderer/src/components/app-shell/sidebar/thread/FolderView.tsx`

### 实现要点

1. **Folder 容器（包括 FolderCell + 展开的 ThreadCell）作为 sortable 元素**
2. **FolderCell 作为 drag handle**
3. `transition: { duration: 200, easing: 'ease-out', idle: true }` 实现平滑动画
4. `isDragging` 状态控制整体透明度

### 核心代码结构

```typescript
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useSortable, DragOverlay } from '@dnd-kit/react'
import {
	foldersAtom,
	threadsAtom,
	openFoldersAtom,
	pinnedThreadIdsAtom,
} from '../../atoms/thread-atoms'
import { FolderCell } from '../cell/FolderCell'
import { ThreadCell } from '../cell/ThreadCell'

function SortableFolder({ folder, threads, index }) {
	const { ref, isDragging, transition } = useSortable({
		id: folder.id,
		index,
		transition: { duration: 200, easing: 'ease-out', idle: true },
	})

	return (
		<div
			ref={ref}
			style={{ transition }}
			className={isDragging ? 'opacity-50' : ''}
		>
			<FolderCell ... />
			{/* Thread list */}
		</div>
	)
}

export function FolderView() {
	// ...

	const folderContents = folders.map((folder) => ({
		folder,
		threads: threads.filter(
			(t) => t.folderId === folder.id && !pinnedThreadIds.includes(t.id)
		),
	}))

	return (
		<div className="flex flex-col gap-0.5">
			{folderContents.map(({ folder, threads: folderThreads }, index) => (
				<SortableFolder
					key={folder.id}
					folder={folder}
					threads={folderThreads}
					index={index}
				/>
			))}
		</div>
	)
}
```

### FolderCell 添加 handleRef 支持

```typescript
// FolderCell.tsx
export interface FolderCellProps {
	// ... existing props
	handleRef?: Ref<HTMLDivElement>  // 新增: drag handle ref
}

// 在 FolderCell 内部
<div ref={handleRef} className="cursor-grab active:cursor-grabbing">
	{/* Folder content */}
</div>
```

---

## Task 4: 验证与测试

### 检查清单
- [ ] PinnedSection 拖拽有占位符动画
- [ ] FolderView 拖拽有占位符动画
- [ ] Folder 拖拽时 FolderCell + ThreadCell 整体移动
- [ ] 拖拽释放有平滑动画
- [ ] 拖拽时显示拖拽指针样式

---

## 动画效果说明

### 占位符动画工作原理

1. **拖拽开始**: 被拖拽元素设置 `isDragging=true`，视觉上变透明
2. **移动中**: @dnd-kit 的乐观排序自动移动其他元素，产生平滑过渡
3. **释放**: 拖拽覆盖层动画到最终位置，然后状态更新

### 关键 CSS/Tailwind 类

```css
/* 拖拽中元素 */
opacity-50

/* 拖拽指针 */
cursor-grab     /* 默认 */
cursor-grabbing /* 拖拽中 */

/* 容器过渡 */
transition-transform duration-200 ease-out
```

---

## 潜在问题

1. **Folder 内的 ThreadCell**: 根据 spec，Folder 内的 ThreadCell 不可拖拽，它们只是被动跟随 Folder 移动
2. **跨区拖拽**: PinnedSection 和 FolderView 是独立的 sortable 上下文，目前不支持跨区拖拽
3. **状态同步**: 需要确保拖拽结束后的状态与 UI 状态一致
