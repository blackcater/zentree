import type {
	GitBranch,
	GitLogEntry,
	GitStatus,
} from '@main/handlers/git.schema'
import { atom } from 'jotai'

/**
 * Current project path for git operations
 * TODO: This should potentially be derived from a currentProjectAtom that selects from projectsAtom
 */
export const currentProjectPathAtom = atom<string>('')

/**
 * Current git status (staged, unstaged, untracked files)
 */
export const gitStatusAtom = atom<GitStatus | null>(null)

/**
 * List of all branches
 */
export const gitBranchesAtom = atom<GitBranch[]>([])

/**
 * Current branch name
 */
export const gitCurrentBranchAtom = atom<string>('')

/**
 * Recent commit log entries
 */
export const gitLogAtom = atom<GitLogEntry[]>([])

/**
 * Diff statistics (additions and deletions)
 */
export const gitDiffStatAtom = atom<{ additions: number; deletions: number }>({
	additions: 0,
	deletions: 0,
})
