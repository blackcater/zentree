import { DragDropProvider, PointerSensor } from '@dnd-kit/react'
import { useAtom } from 'jotai'

import { viewModeAtom } from '../atoms/thread-atoms'
import { ThreadTitleCell } from './cell/ThreadTitleCell'
import { FlatView } from './thread/FlatView'
import { FolderView } from './thread/FolderView'

export function ProjectSection() {
	const [viewMode, setViewMode] = useAtom(viewModeAtom)

	const handleSort = () => {
		if (viewMode === 'folder') {
			setViewMode('flat')
		} else if (viewMode === 'flat') {
			setViewMode('folder')
		}
	}

	const handleAddFolder = () => {
		// TODO: Add Project
	}

	return (
		<DragDropProvider sensors={[PointerSensor]}>
			<section className="flex flex-col gap-1 px-2">
				<ThreadTitleCell
					title="Threads"
					onSort={handleSort}
					onAdd={handleAddFolder}
				/>
				{viewMode === 'folder' ? <FolderView /> : <FlatView />}
			</section>
		</DragDropProvider>
	)
}
