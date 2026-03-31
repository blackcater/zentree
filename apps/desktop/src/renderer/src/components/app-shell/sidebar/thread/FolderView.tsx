import { useState, useCallback, type DragEvent } from 'react'

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
			setDropTargetId(folderId)

			// Calculate position based on mouse Y relative to element
			const rect = (
				e.currentTarget as HTMLElement
			).getBoundingClientRect()
			const midY = rect.top + rect.height / 2
			setDropPosition(e.clientY < midY ? 'before' : 'after')
		},
		[draggedFolderId]
	)

	const handleDragLeave = useCallback(() => {
		setDropTargetId(null)
		setDropPosition(null)
	}, [])

	const handleDrop = useCallback(
		(e: DragEvent, targetFolderId: string) => {
			e.preventDefault()

			const draggedId =
				e.dataTransfer.getData('text/plain') || draggedFolderId
			if (!draggedId || draggedId === targetFolderId) {
				setDropTargetId(null)
				setDropPosition(null)
				setDraggedFolderId(null)
				return
			}

			// Reorder folders
			setFolders((prev) => {
				const folderList = [...prev]
				const draggedIndex = folderList.findIndex(
					(f) => f.id === draggedId
				)
				const targetIndex = folderList.findIndex(
					(f) => f.id === targetFolderId
				)

				if (draggedIndex === -1 || targetIndex === -1) return prev

				const [draggedFolder] = folderList.splice(draggedIndex, 1)
				const newTargetIndex = folderList.findIndex(
					(f) => f.id === targetFolderId
				)

				if (dropPosition === 'before') {
					folderList.splice(newTargetIndex, 0, draggedFolder)
				} else {
					folderList.splice(newTargetIndex + 1, 0, draggedFolder)
				}

				// Update order values
				return folderList.map((f, i) => ({ ...f, order: i }))
			})

			setDropTargetId(null)
			setDropPosition(null)
			setDraggedFolderId(null)
		},
		[draggedFolderId, dropPosition, setFolders]
	)

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
						onDragOver={(e) => handleDragOver(e, folder.id)}
						onDragLeave={handleDragLeave}
						onDrop={(e) => handleDrop(e, folder.id)}
					>
						<FolderCell
							id={folder.id}
							title={folder.title}
							isExpanded={isOpen}
							onToggle={handleToggleFolder}
							onAddThread={(_folderId) => {
								// TODO: implement add thread to folder
							}}
							dropPosition={isDropTarget ? dropPosition : null}
							isDragging={isDragging}
							draggable={true}
							onDragStart={(e) => handleDragStart(e, folder.id)}
							onDragEnd={handleDragEnd}
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
