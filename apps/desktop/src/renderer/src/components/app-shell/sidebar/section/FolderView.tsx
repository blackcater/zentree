import { cn } from '@acme-ai/ui'
import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import { findElementUntilRoot } from '@/shared/dom'
import {
	openedProjectIdsAtom,
	pinnedThreadIdsAtom,
	projectTreeAtom,
} from '@renderer/stores'
import type { Project } from '@renderer/types'
import type { Thread } from '@renderer/types/thread'

import { FolderCell } from '../cell/FolderCell'
import { ThreadCell } from '../cell/ThreadCell'

interface SortableFolderProps {
	folder: Project
	threads: Thread[]
	index: number
	isOpen: boolean
	onToggle: (id: string) => void
	onTogglePin: (threadId: string) => void
	onMenuOpenInFinder?: (id: string) => void
	onMenuCreateWorktree?: (id: string) => void
	onMenuEditName?: (id: string) => void
	onMenuArchiveThreads?: (id: string) => void
	onMenuDelete?: (id: string) => void
}

function SortableFolder({
	folder,
	threads: folderThreads,
	index,
	isOpen,
	onToggle,
	onTogglePin,
	onMenuOpenInFinder,
	onMenuCreateWorktree,
	onMenuEditName,
	onMenuArchiveThreads,
	onMenuDelete,
}: Readonly<SortableFolderProps>) {
	const { ref, isDragging } = useSortable({
		id: folder.id,
		index,
		type: 'folder',
	})

	function handleArchive(_threadId: string) {
		// TODO: Archive thread
	}

	return (
		<div
			ref={ref}
			className={cn(
				'select-none',
				isDragging && 'pointer-events-none opacity-0'
			)}
		>
			<FolderCell
				id={folder.id}
				title={folder.title}
				isExpanded={isOpen}
				isDragging={isDragging}
				onToggle={onToggle}
				{...((onMenuOpenInFinder ||
					onMenuCreateWorktree ||
					onMenuEditName ||
					onMenuArchiveThreads ||
					onMenuDelete) && {
					onMenuOpenInFinder,
					onMenuCreateWorktree,
					onMenuEditName,
					onMenuArchiveThreads,
					onMenuDelete,
				})}
			/>
			<div
				className="transition-[grid-template-rows] duration-200 ease-in-out"
				style={{
					display: 'grid',
					gridTemplateRows: isOpen ? '1fr' : '0fr',
				}}
			>
				<div style={{ overflow: 'hidden' }}>
					{folderThreads.map((thread) => (
						<ThreadCell
							key={thread.id}
							thread={thread}
							onTogglePin={onTogglePin}
							onArchive={handleArchive}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

interface FolderViewProps {
	onMenuOpenInFinder?: (id: string) => void
	onMenuCreateWorktree?: (id: string) => void
	onMenuEditName?: (id: string) => void
	onMenuArchiveThreads?: (id: string) => void
	onMenuDelete?: (id: string) => void
}

export function FolderView(props: Readonly<FolderViewProps>) {
	const [openedProjectIds, setOpenedProjectIds] =
		useAtom(openedProjectIdsAtom)
	const setPinnedThreadIds = useSetAtom(pinnedThreadIdsAtom)
	const projectTree = useAtomValue(projectTreeAtom)

	const handleToggleFolder = (folderId: string) => {
		setOpenedProjectIds((prev: Set<string>) => {
			const next = new Set(prev)
			if (next.has(folderId)) {
				next.delete(folderId)
			} else {
				next.add(folderId)
			}
			return next
		})
	}

	const handleTogglePin = (threadId: string) => {
		setPinnedThreadIds((prev) => {
			if (prev.includes(threadId)) {
				return prev.filter((id) => id !== threadId)
			}
			return [...prev, threadId]
		})
	}

	return (
		<DragDropProvider
			onBeforeDragStart={(event) => {
				if (!event.cancelable) return
				const pos = event.operation.position.current
				const ele = document.elementFromPoint(
					pos.x,
					pos.y
				) as HTMLElement | null
				if (!ele) return
				const folderElm = findElementUntilRoot(
					ele,
					(ele) => ele.dataset['cell'] === 'folder'
				)
				if (folderElm) return
				event.preventDefault()
			}}
		>
			<DragOverlay>
				{(source) => {
					const node = projectTree.find(
						(n) => n.project.id === source.id
					)
					if (!node) return null
					return (
						<FolderCell
							id={node.project.id}
							title={node.project.title}
							isExpanded={false}
							onToggle={handleToggleFolder}
						/>
					)
				}}
			</DragOverlay>
			<div className="flex max-w-full flex-col gap-0.5">
				{projectTree.map(
					({ project, threads: folderThreads }, index) => (
						<SortableFolder
							key={project.id}
							folder={project}
							threads={folderThreads}
							index={index}
							isOpen={openedProjectIds.has(project.id)}
							onToggle={handleToggleFolder}
							onTogglePin={handleTogglePin}
							{...props}
						/>
					)
				)}
			</div>
		</DragDropProvider>
	)
}
