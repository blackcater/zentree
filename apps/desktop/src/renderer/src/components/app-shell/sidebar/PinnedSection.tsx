import { cn } from '@acme-ai/ui'
import { DragDropProvider, DragOverlay } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useAtomValue } from 'jotai'

import { threadsAtom, pinnedThreadsAtom } from '@renderer/atoms/thread'
import type { Thread } from '@renderer/types/thread'

import { ThreadCell } from './cell/ThreadCell'

interface SortableThreadProps {
	thread: Thread
	index: number
}

function SortableThread({ thread, index }: Readonly<SortableThreadProps>) {
	const { ref, isDragging } = useSortable({
		id: thread.id,
		index,
		type: 'thread',
	})

	return (
		<div
			ref={ref}
			className={cn(
				'select-none',
				isDragging && 'pointer-events-none opacity-0',
				!isDragging && 'cursor-grab active:cursor-grabbing'
			)}
		>
			<ThreadCell thread={thread} isPinned={true} />
		</div>
	)
}

export function PinnedSection() {
	const threads = useAtomValue(threadsAtom)
	const pinnedThreads = useAtomValue(pinnedThreadsAtom)

	if (pinnedThreads.length === 0) {
		return null
	}

	return (
		<DragDropProvider>
			<DragOverlay>
				{(source) => {
					const thread = threads.find((t) => t.id === source.id)
					if (!thread) return null
					return <ThreadCell thread={thread} isPinned />
				}}
			</DragOverlay>
			<section className="flex flex-col gap-1 px-2 py-2">
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
