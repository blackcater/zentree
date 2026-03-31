import { useState, useCallback, useRef, type DragEvent } from 'react'

import { useAtom, useAtomValue, useSetAtom } from 'jotai'

import {
	foldersAtom,
	threadsAtom,
	openFoldersAtom,
} from '../../atoms/thread-atoms'
import { FolderCell } from '../cell/FolderCell'
import { ThreadCell } from '../cell/ThreadCell'

export function FolderView() {
	const [openFolders, setOpenFolders] = useAtom(openFoldersAtom)
	const folders = useAtomValue(foldersAtom)
	const threads = useAtomValue(threadsAtom)
	const setFolders = useSetAtom(foldersAtom)

	// Drop indicator state
	const [dropTargetId, setDropTargetId] = useState<string | null>(null)
	const [dropPosition, setDropPosition] = useState<'before' | 'after' | null>(
		null
	)
	const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null)

	// Refs for each folder header to calculate drop position accurately
	const folderHeaderRefs = useRef<Map<string, HTMLDivElement>>(new Map())

	const handleDragStart = useCallback((e: DragEvent, folderId: string) => {
		setDraggedFolderId(folderId)
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', folderId)
	}, [])

	const handleDragOver = useCallback(
		(e: DragEvent, folderId: string, folderThreads: { id: string }[]) => {
			e.preventDefault()
			if (draggedFolderId === folderId) return

			e.dataTransfer.dropEffect = 'move'
			setDropTargetId(folderId)

			// Get the folder header element
			const headerElement = folderHeaderRefs.current.get(folderId)
			if (!headerElement) return

			const headerRect = headerElement.getBoundingClientRect()
			const mouseY = e.clientY

			// Check if mouse is below the folder header
			// If yes and folder is expanded, "after" means after last thread
			const isBelowHeader = mouseY > headerRect.bottom
			const isOpen = openFolders.has(folderId)
			const hasThreads = folderThreads.length > 0

			let position: 'before' | 'after'

			if (isBelowHeader && isOpen && hasThreads) {
				// Mouse is in the expanded thread area
				// "after" means after the last thread
				// "before" still means before the folder (in the thread area, before first thread)
				position = 'before' // In expanded area, only "before" makes sense for thread insertion
			} else {
				// Use the folder header's midpoint
				const headerMidY = headerRect.top + headerRect.height / 2
				position = mouseY < headerMidY ? 'before' : 'after'
			}

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

				// Remove dragged folder from its current position
				const [draggedFolder] = folderList.splice(draggedIndex, 1)

				// Find the new target index after removal
				let newTargetIndex = folderList.findIndex(
					(f) => f.id === folderId
				)

				// Insert at new position
				if (position === 'before') {
					folderList.splice(newTargetIndex, 0, draggedFolder)
				} else {
					folderList.splice(newTargetIndex + 1, 0, draggedFolder)
				}

				// Update order values
				return folderList.map((f, i) => ({ ...f, order: i }))
			})
		},
		[draggedFolderId, openFolders, setFolders]
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

	// Group threads by folder
	const folderContents = folders.map((folder) => ({
		folder,
		threads: threads.filter((t) => t.folderId === folder.id),
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
						className="flex flex-col gap-0.5"
						onDragOver={(e) =>
							handleDragOver(e, folder.id, folderThreads)
						}
						onDragLeave={handleDragLeave}
						onDrop={(e) => handleDrop(e, folder.id)}
					>
						<div
							ref={(el) => {
								if (el)
									folderHeaderRefs.current.set(folder.id, el)
								else folderHeaderRefs.current.delete(folder.id)
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
