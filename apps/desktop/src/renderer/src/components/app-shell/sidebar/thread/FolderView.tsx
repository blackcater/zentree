import { cn } from '@acme-ai/ui'
import { DragOverlay } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useAtom, useAtomValue } from 'jotai'

import {
	foldersAtom,
	threadsAtom,
	openFoldersAtom,
	pinnedThreadIdsAtom,
} from '../../atoms/thread-atoms'
import { FolderCell } from '../cell/FolderCell'
import { ThreadCell } from '../cell/ThreadCell'

interface SortableFolderProps {
	folder: { id: string; title: string; order: number }
	threads: Array<{
		id: string
		title: string
		updatedAt: Date
		isPinned: boolean
		folderId: string
	}>
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
		transition: { duration: 200, easing: 'ease-out' },
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
						<ThreadCell
							key={thread.id}
							thread={thread}
							draggable={false}
						/>
					))}
				</div>
			</div>
		</div>
	)
}

export function FolderView() {
	const [openFolders, setOpenFolders] = useAtom(openFoldersAtom)
	const folders = useAtomValue(foldersAtom)
	const threads = useAtomValue(threadsAtom)
	const pinnedThreadIds = useAtomValue(pinnedThreadIdsAtom)

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

	const folderContents = folders.map((folder) => ({
		folder,
		threads: threads.filter(
			(t) => t.folderId === folder.id && !pinnedThreadIds.includes(t.id)
		),
	}))

	return (
		<div className="flex flex-col gap-0.5">
			<DragOverlay>
				{(source) => {
					if (!source) return null
					const folder = folders.find((f) => f.id === source.id)
					if (!folder) return null
					return (
						<FolderCell
							id={folder.id}
							title={folder.title}
							isExpanded={false}
							onToggle={handleToggleFolder}
							draggable={false}
						/>
					)
				}}
			</DragOverlay>
			{folderContents.map(({ folder, threads: folderThreads }, index) => (
				<SortableFolder
					key={folder.id}
					folder={folder}
					threads={folderThreads}
					index={index}
					isOpen={openFolders.has(folder.id)}
					onToggle={handleToggleFolder}
				/>
			))}
		</div>
	)
}
