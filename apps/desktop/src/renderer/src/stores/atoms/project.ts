import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Project } from '@renderer/types/project'

import { mockProjects } from './mock-data'

export const projectsAtom = atomWithStorage<Project[]>('projects', mockProjects)

export const openedProjectIdsAtom = atom<Set<string>>(new Set<string>())

// Derived: are all projects expanded
export const isAllProjectsExpandedAtom = atom((get) => {
	const projects = get(projectsAtom)
	const openedProjectIds = get(openedProjectIdsAtom)
	return (
		projects.length > 0 && projects.every((p) => openedProjectIds.has(p.id))
	)
})

// Derived: are all projects collapsed
export const isAllProjectsCollapsedAtom = atom((get) => {
	const openedProjectIds = get(openedProjectIdsAtom)
	return openedProjectIds.size === 0
})
