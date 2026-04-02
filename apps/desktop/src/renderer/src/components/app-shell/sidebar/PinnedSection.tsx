import { cn } from '@acme-ai/ui'
import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useAtomValue, useSetAtom } from 'jotai'

import { pinnedThreadIdsAtom, pinnedThreadsAtom } from '@renderer/atoms'
import type { Thread } from '@renderer/types'

import { ThreadCell } from './cell/ThreadCell'

interface SortableThreadProps {
	thread: Thread
	index: number
}

function SortableThread({ thread, index }: Readonly<SortableThreadProps>) {
	const setPinnedThreadIds = useSetAtom(pinnedThreadIdsAtom)
	const { ref, isDragging } = useSortable({
		id: thread.id,
		index,
		type: 'thread',
	})

	function handleTogglePin(id: string) {
		setPinnedThreadIds((prev) => prev.filter((threadId) => threadId !== id))
	}

	function handleArchive(id: string) {
		// TODO: Archive thread
	}

	return (
		<div
			ref={ref}
			className={cn(
				'select-none',
				isDragging && 'pointer-events-none opacity-0',
				!isDragging && 'cursor-grab active:cursor-grabbing'
			)}
		>
			<ThreadCell
				thread={thread}
				isPinned
				onTogglePin={handleTogglePin}
				onArchive={handleArchive}
			/>
		</div>
	)
}

export function PinnedSection() {
	const pinnedThreads = useAtomValue(pinnedThreadsAtom)

	if (pinnedThreads.length === 0) {
		return null
	}

	return (
		<DragDropProvider>
			<DragOverlay>
				{(source) => {
					const thread = pinnedThreads.find((t) => t.id === source.id)
					if (!thread) return null
					return <ThreadCell thread={thread} isPinned />
				}}
			</DragOverlay>
			<section className="flex max-h-48 min-h-0 flex-col gap-1 overflow-y-auto px-2 py-2">
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
		</DragDropProvider>
	)
}
