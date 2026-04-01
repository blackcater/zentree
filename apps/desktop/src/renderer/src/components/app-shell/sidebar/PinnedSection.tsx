// apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx
import { useState, useCallback, useRef, type DragEvent } from 'react'
import { useAtomValue, useAtom } from 'jotai'
import { threadsAtom, pinnedThreadIdsAtom } from '../atoms/thread-atoms'
import { ThreadCell } from './cell/ThreadCell'

export function PinnedSection() {
	const threads = useAtomValue(threadsAtom)
	const [pinnedThreadIds, setPinnedThreadIds] = useAtom(pinnedThreadIdsAtom)
	const [draggedId, setDraggedId] = useState<string | null>(null)
	const threadRefs = useRef<Map<string, HTMLDivElement>>(new Map())

	// 根据 pinnedThreadIds 的顺序获取置顶线程
	const pinnedThreads = pinnedThreadIds
		.map((id) => threads.find((t) => t.id === id))
		.filter((t): t is NonNullable<typeof t> => t != null)

	const handleDragStart = useCallback((e: DragEvent, threadId: string) => {
		setDraggedId(threadId)
		e.dataTransfer.effectAllowed = 'move'
		e.dataTransfer.setData('text/plain', threadId)
	}, [])

	const handleDragEnd = useCallback(() => {
		setDraggedId(null)
	}, [])

	const handleDragOver = useCallback(
		(e: DragEvent, targetId: string) => {
			e.preventDefault()
			if (draggedId === targetId) return
			e.dataTransfer.dropEffect = 'move'

			const targetEl = threadRefs.current.get(targetId)
			if (!targetEl) return

			const rect = targetEl.getBoundingClientRect()
			const midY = rect.top + rect.height / 2
			const position: 'before' | 'after' = e.clientY < midY ? 'before' : 'after'

			// 立即更新顺序
			setPinnedThreadIds((prev) => {
				const list = [...prev]
				const draggedIdx = list.indexOf(draggedId)
				const targetIdx = list.indexOf(targetId)
				if (draggedIdx === -1 || targetIdx === -1) return prev
				if (draggedIdx === targetIdx) return prev

				const [dragged] = list.splice(draggedIdx, 1)
				const newIdx = position === 'before' ? targetIdx : targetIdx + 1
				list.splice(newIdx, 0, dragged)
				return list
			})
		},
		[draggedId, setPinnedThreadIds]
	)

	if (pinnedThreads.length === 0) {
		return null
	}

	return (
		<section className="flex flex-col gap-1 px-2 py-2">
			<div className="flex flex-col gap-0.5">
				{pinnedThreads.map((thread) => (
					<div
						key={thread.id}
						ref={(el) => {
							if (el) threadRefs.current.set(thread.id, el)
							else threadRefs.current.delete(thread.id)
						}}
						onDragOver={(e) => handleDragOver(e, thread.id)}
					>
						<ThreadCell
							thread={thread}
							isPinned={true}
							draggable={true}
							onDragStart={(e) => handleDragStart(e, thread.id)}
							onDragEnd={handleDragEnd}
						/>
					</div>
				))}
			</div>
		</section>
	)
}
