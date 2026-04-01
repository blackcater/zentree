import { atom } from 'jotai'

import type { Thread, Folder } from '../types/thread'

// View mode: 'folder' | 'flat'
export const viewModeAtom = atom<'folder' | 'flat'>('folder')

// Folder expanded state - persisted to localStorage
export const openFoldersAtom = atom<Set<string>>(new Set<string>())

// Pinned threads - ordered array (NOT Set)
export const pinnedThreadIdsAtom = atom<string[]>(['t1', 't5', 't6'])

// Mock data for development
export const threadsAtom = atom<Thread[]>([
	{
		id: 't1',
		title: 'Thread 1',
		updatedAt: new Date('2026-03-30'),
		isPinned: true,
		folderId: 'f1',
	},
	{
		id: 't2',
		title: 'Thread 2 in Folder A',
		updatedAt: new Date('2026-03-29'),
		isPinned: false,
		folderId: 'f1',
	},
	{
		id: 't3',
		title: 'Thread 3 in Folder A',
		updatedAt: new Date('2026-03-28'),
		isPinned: false,
		folderId: 'f1',
	},
	{
		id: 't4',
		title: 'Thread 4 in Folder B',
		updatedAt: new Date('2026-03-27'),
		isPinned: false,
		folderId: 'f2',
	},
	{
		id: 't5',
		title: 'Thread 5 Pinned',
		updatedAt: new Date('2026-03-26'),
		isPinned: true,
		folderId: 'f2',
	},
	{
		id: 't6',
		title: 'Thread 6 Pinned',
		updatedAt: new Date('2026-03-25'),
		isPinned: true,
		folderId: 'f1',
	},
])

export const foldersAtom = atom<Folder[]>([
	{ id: 'f1', title: 'Folder A', order: 0 },
	{ id: 'f2', title: 'Folder B', order: 1 },
])
