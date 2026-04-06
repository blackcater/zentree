import { atom } from 'jotai'

import type { SortBy } from '@renderer/types/sidebar'
import type { Thread } from '@renderer/types/thread'

import { mockPinnedThreadIds, mockThreads } from './mock-data'
import { projectsAtom } from './project'
import { sidebarAtom } from './sidebar'

// All threads - base data
export const threadsAtom = atom<Thread[]>(mockThreads)

// Pinned thread IDs - ordered array
export const pinnedThreadIdsAtom = atom<string[]>(mockPinnedThreadIds)

// Derived: pinned threads (maintains order from pinnedThreadIdsAtom)
export const pinnedThreadsAtom = atom((get) => {
	const threads = get(threadsAtom)
	const pinnedIds = get(pinnedThreadIdsAtom)
	return pinnedIds
		.map((id) => threads.find((t) => t.id === id))
		.filter((t): t is Thread => t != null)
})

// Derived: unpinned threads for flat view, sorted by sidebar preferences
export const flatThreadsAtom = atom((get) => {
	const threads = get(threadsAtom)
	const pinnedIds = get(pinnedThreadIdsAtom)
	const sidebar = get(sidebarAtom)

	const unpinned = threads.filter((t) => !pinnedIds.includes(t.id))

	return [...unpinned].sort((a, b) => {
		const field: SortBy = sidebar.sortBy
		const order = -1
		const aVal =
			field === 'updatedAt'
				? a.updatedAt.getTime()
				: a.createdAt.getTime()
		const bVal =
			field === 'updatedAt'
				? b.updatedAt.getTime()
				: b.createdAt.getTime()
		return (aVal - bVal) * order
	})
})

// Derived: project tree with threads, sorted by sidebar preferences
export const projectTreeAtom = atom((get) => {
	const threads = get(threadsAtom)
	const pinnedIds = get(pinnedThreadIdsAtom)
	const projects = get(projectsAtom)
	const sidebar = get(sidebarAtom)

	return projects.map((project) => ({
		project,
		threads: threads
			.filter(
				(t) => t.projectId === project.id && !pinnedIds.includes(t.id)
			)
			.sort((a, b) => {
				const field: SortBy = sidebar.sortBy
				const order = -1
				const aVal =
					field === 'updatedAt'
						? a.updatedAt.getTime()
						: a.createdAt.getTime()
				const bVal =
					field === 'updatedAt'
						? b.updatedAt.getTime()
						: b.createdAt.getTime()
				return (aVal - bVal) * order
			}),
	}))
})
