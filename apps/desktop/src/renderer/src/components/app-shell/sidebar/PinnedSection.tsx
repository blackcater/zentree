// apps/desktop/src/renderer/src/components/app-shell/sidebar/PinnedSection.tsx
import { DragOverlay } from '@dnd-kit/react'
import { useSortable } from '@dnd-kit/react/sortable'
import { useAtomValue, useAtom } from 'jotai'

import { threadsAtom, pinnedThreadIdsAtom } from '../atoms/thread-atoms'
import { ThreadCell } from './cell/ThreadCell'

interface SortableThreadProps {
	thread: {
		id: string
		title: string
		updatedAt: Date
		isPinned: boolean
		folderId: string
	}
	index: number
}

function SortableThread({ thread, index }: SortableThreadProps) {
	const { ref, isDragging } = useSortable({
		id: thread.id,
		index,
		transition: { duration: 200, easing: 'ease-out', idle: true },
	})

	return (
		<div ref={ref} className={isDragging ? 'opacity-50' : undefined}>
			<ThreadCell thread={thread} isPinned={true} draggable={true} />
		</div>
	)
}

export function PinnedSection() {
	const threads = useAtomValue(threadsAtom)
	const [pinnedThreadIds] = useAtom(pinnedThreadIdsAtom)

	const pinnedThreads = pinnedThreadIds
		.map((id) => threads.find((t) => t.id === id))
		.filter((t): t is NonNullable<typeof t> => t != null)

	if (pinnedThreads.length === 0) {
		return null
	}

	return (
		<section className="flex flex-col gap-1 px-2 py-2">
			<DragOverlay>
				{(source) => {
					if (!source) return null
					const thread = threads.find((t) => t.id === source.id)
					if (!thread) return null
					return <ThreadCell thread={thread} isPinned />
				}}
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
