import { cn } from '@acme-ai/ui'
import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useAtom, useAtomValue } from 'jotai'

import { projectsAtom, openedProjectIdsAtom } from '@renderer/atoms/project'
import { threadsAtom, pinnedThreadIdsAtom } from '@renderer/atoms/thread'
import type { Thread } from '@renderer/types/thread'
import { findElementUntilRoot } from '~/src/shared/dom'

import { FolderCell } from '../cell/FolderCell'
import { ThreadCell } from '../cell/ThreadCell'

interface SortableFolderProps {
	folder: { id: string; title: string; order: number }
	threads: Thread[]
	index: number
	isOpen: boolean
	onToggle: (id: string) => void
}

function SortableFolder({
	folder,
	threads: folderThreads,
	index,
	isOpen,
	onToggle,
}: Readonly<SortableFolderProps>) {
	const { ref, isDragging } = useSortable({
		id: folder.id,
		index,
		type: 'folder',
	})

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
						<ThreadCell key={thread.id} thread={thread} />
					))}
				</div>
			</div>
		</div>
	)
}

export function FolderView() {
	const [openedProjectIds, setOpenedProjectIds] =
		useAtom(openedProjectIdsAtom)
	const projects = useAtomValue(projectsAtom)
	const threads = useAtomValue(threadsAtom)
	const pinnedThreadIds = useAtomValue(pinnedThreadIdsAtom)

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

	const folderContents = projects.map((folder) => ({
		folder,
		threads: threads.filter(
			(t) => t.projectId === folder.id && !pinnedThreadIds.includes(t.id)
		),
	}))

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
					const folder = projects.find((f) => f.id === source.id)
					if (!folder) return null
					return (
						<FolderCell
							id={folder.id}
							title={folder.title}
							isExpanded={false}
							onToggle={handleToggleFolder}
						/>
					)
				}}
			</DragOverlay>
			<div className="flex flex-col gap-0.5">
				{folderContents.map(
					({ folder, threads: folderThreads }, index) => (
						<SortableFolder
							key={folder.id}
							folder={folder}
							threads={folderThreads}
							index={index}
							isOpen={openedProjectIds.has(folder.id)}
							onToggle={handleToggleFolder}
						/>
					)
				)}
			</div>
		</DragDropProvider>
	)
}
