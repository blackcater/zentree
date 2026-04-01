import { useAtom } from 'jotai'

import { sidebarAtom } from '@renderer/atoms/sidebar'

import { ThreadTitleCell } from './cell/ThreadTitleCell'
import { FlatView } from './section/FlatView'
import { FolderView } from './section/FolderView'

export function ProjectSection() {
	const [sidebar, setSidebar] = useAtom(sidebarAtom)
	const viewMode = sidebar.viewMode

	const handleSort = () => {
		if (viewMode === 'folder') {
			setSidebar({ ...sidebar, viewMode: 'flat' })
		} else if (viewMode === 'flat') {
			setSidebar({ ...sidebar, viewMode: 'folder' })
		}
	}

	const handleAddFolder = () => {
		// TODO: Add Project
	}

	return (
		<section className="flex flex-col gap-1 px-2">
			<ThreadTitleCell
				title="Threads"
				onSort={handleSort}
				onAdd={handleAddFolder}
			/>
			{viewMode === 'folder' ? <FolderView /> : <FlatView />}
		</section>
	)
}
