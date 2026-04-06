import { useAtomValue, useSetAtom } from 'jotai'

import {
	openedProjectIdsAtom,
	projectsAtom,
	sidebarAtom,
} from '@renderer/stores'

import { ThreadTitleCell } from './cell/ThreadTitleCell'
import { FlatView } from './section/FlatView'
import { FolderView } from './section/FolderView'

export function ProjectSection() {
	const sidebar = useAtomValue(sidebarAtom)
	const projects = useAtomValue(projectsAtom)
	const setOpenedProjectIds = useSetAtom(openedProjectIdsAtom)
	const organizeMode = sidebar.organizeMode

	const handleCollapseAll = () => {
		setOpenedProjectIds(new Set(projects.map((p) => p.id)))
	}

	const handleExpandAll = () => {
		setOpenedProjectIds(new Set())
	}

	const handleAddFolder = () => {
		// TODO: Add Project
		console.log('Add folder clicked')
	}

	// FolderCell 菜单处理
	const handleMenuOpenInFinder = (id: string) => {
		console.log('Open in Finder:', id)
	}

	const handleMenuCreateWorktree = (id: string) => {
		console.log('Create worktree:', id)
	}

	const handleMenuEditName = (id: string) => {
		console.log('Edit name:', id)
	}

	const handleMenuArchiveThreads = (id: string) => {
		console.log('Archive threads:', id)
	}

	const handleMenuDelete = (id: string) => {
		console.log('Delete:', id)
	}

	return (
		<section
			className="flex max-w-full flex-col px-2 pb-4"
			style={{ width: `${sidebar.width}px` }}
		>
			<ThreadTitleCell
				title="Threads"
				onCollapseAll={handleCollapseAll}
				onExpandAll={handleExpandAll}
				onAdd={handleAddFolder}
			/>
			{organizeMode === 'folder' ? (
				<FolderView
					onMenuOpenInFinder={handleMenuOpenInFinder}
					onMenuCreateWorktree={handleMenuCreateWorktree}
					onMenuEditName={handleMenuEditName}
					onMenuArchiveThreads={handleMenuArchiveThreads}
					onMenuDelete={handleMenuDelete}
				/>
			) : (
				<FlatView />
			)}
		</section>
	)
}
