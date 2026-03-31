import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

import type { Thread, Folder } from '../types/thread'

// View mode: 'folder' | 'flat'
export const viewModeAtom = atom<'folder' | 'flat'>('folder')

// Folder expanded state - persisted to localStorage
export const openFoldersAtom = atomWithStorage<Set<string>>(
  'sidebar-open-folders',
  new Set()
)

// Pinned threads (just IDs)
export const pinnedThreadsAtom = atom<Set<string>>(new Set())

// Mock data for development - will be replaced with real data later
export const threadsAtom = atom<Thread[]>([
  {
    id: 't1',
    title: 'Thread 1',
    updatedAt: new Date('2026-03-30'),
    isPinned: true,
    folderId: null,
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
])

export const foldersAtom = atom<Folder[]>([
  { id: 'f1', title: 'Folder A', order: 0 },
  { id: 'f2', title: 'Folder B', order: 1 },
])
