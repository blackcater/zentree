import { useState, useCallback, useRef, type DragEvent } from 'react'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import {
	foldersAtom,
	threadsAtom,
	openFoldersAtom,
	pinnedThreadIdsAtom,
} from '../../atoms/thread-atoms'
import { FolderCell } from '../cell/FolderCell'
import { ThreadCell } from '../cell/ThreadCell'

export function FolderView() {
	const [openFolders, setOpenFolders] = useAtom(openFoldersAtom)
	const folders = useAtomValue(foldersAtom)
	const threads = useAtomValue(threadsAtom)
	const setFolders = useSetAtom(foldersAtom)
	const pinnedThreadIds = useAtomValue(pinnedThreadIdsAtom)

	// Drop indicator state
	const [dropTargetId, setDropTargetId] = useState<string | null>(null)
	const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(
		null
	)
	const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null)

	// Refs for each folder cell to calculate drop position accurately
	const folderCellRefs = useRef<Map<string, HTMLDivElement>>(new Map())

	const handleDragStart = useCallback((e: DragEvent, folderId: string) => {
		setDraggedFolderId(folderId)
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', folderId)
	}, [])

	const handleDragOver = useCallback(
		(e: DragEvent, folderId: string) => {
			e.preventDefault()
			if (draggedFolderId === folderId) return
			e.dataTransfer.dropEffect = 'move'

			const cellEl = folderCellRefs.current.get(folderId)
			if (!cellEl) return

			const rect = cellEl.getBoundingClientRect()
			const midY = rect.top + rect.height / 2
			const position: 'before' | 'after' = e.clientY < midY ? 'before' : 'after'

			setDropTargetId(folderId)
			setDropPosition(position)

			// Live reorder: update folders state immediately for visual preview
			setFolders((prev) => {
				const folderList = [...prev]
				const draggedIndex = folderList.findIndex(
					(f) => f.id === draggedFolderId
				)
				const targetIndex = folderList.findIndex(
					(f) => f.id === folderId
				)

				if (draggedIndex === -1 || targetIndex === -1) return prev
				if (draggedIndex === targetIndex) return prev

				const [draggedFolder] = folderList.splice(draggedIndex, 1)
				let newTargetIndex = folderList.findIndex(
					(f) => f.id === folderId
				)

				if (position === 'before') {
					folderList.splice(newTargetIndex, 0, draggedFolder)
				} else {
					folderList.splice(newTargetIndex + 1, 0, draggedFolder)
				}

				return folderList.map((f, i) => ({ ...f, order: i }))
			})
		},
		[draggedFolderId, setFolders]
	)

	const handleDragLeave = useCallback(() => {
		setDropTargetId(null)
		setDropPosition(null)
	}, [])

	const handleDrop = useCallback((e: DragEvent, _targetFolderId: string) => {
		e.preventDefault()

		// Drop finalizes the order - nothing extra needed since we already updated on dragover
		setDropTargetId(null)
		setDropPosition(null)
		setDraggedFolderId(null)
	}, [])

	const handleDragEnd = useCallback(() => {
		setDropTargetId(null)
		setDropPosition(null)
		setDraggedFolderId(null)
	}, [])

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

	// Group threads by folder, filtering out pinned threads
	const folderContents = folders.map((folder) => ({
		folder,
		threads: threads.filter(
			(t) => t.folderId === folder.id && !pinnedThreadIds.includes(t.id)
		),
	}))

	return (
		<div className="flex flex-col gap-0.5">
			{/* Folders with their threads */}
			{folderContents.map(({ folder, threads: folderThreads }) => {
				const isOpen = openFolders.has(folder.id)
				const isDropTarget = dropTargetId === folder.id
				const isDragging = draggedFolderId === folder.id
				return (
					<div
						key={folder.id}
						className="flex flex-col gap-0.5 transition-transform duration-200 ease-out"
						onDragOver={(e) => handleDragOver(e, folder.id)}
						onDrop={(e) => handleDrop(e, folder.id)}
					>
						<div
							ref={(el) => {
								if (el)
									folderCellRefs.current.set(folder.id, el)
								else folderCellRefs.current.delete(folder.id)
							}}
						>
							<FolderCell
								id={folder.id}
								title={folder.title}
								isExpanded={isOpen}
								onToggle={handleToggleFolder}
								onAddThread={(_folderId) => {
									// TODO: implement add thread to folder
								}}
								dropPosition={
									isDropTarget ? dropPosition : null
								}
								isDragging={isDragging}
								draggable={true}
								onDragStart={(e) =>
									handleDragStart(e, folder.id)
								}
								onDragEnd={handleDragEnd}
							/>
						</div>
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
			})}
		</div>
	)
}
