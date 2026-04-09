/**
 * Typed API facade for renderer process
 * Exposes gitApi from window.api.git with full type safety
 */

import type { GitHandler } from '@main/handlers/git'

/**
 * Git API facade with typed methods
 * Calls are forwarded to main process via IPC
 */
export const gitApi = {
	status: (repoPath: string) => window.api.git.status(repoPath),
	branches: (repoPath: string) => window.api.git.branches(repoPath),
	currentBranch: (repoPath: string) => window.api.git.currentBranch(repoPath),
	log: (repoPath: string, count?: number) =>
		window.api.git.log(repoPath, count),
	diffStat: (repoPath: string) => window.api.git.diffStat(repoPath),
	stage: (repoPath: string, files: string[]) =>
		window.api.git.stage(repoPath, files),
	unstage: (repoPath: string, files: string[]) =>
		window.api.git.unstage(repoPath, files),
	stageAll: (repoPath: string) => window.api.git.stageAll(repoPath),
	unstageAll: (repoPath: string) => window.api.git.unstageAll(repoPath),
	discard: (repoPath: string, files: string[]) =>
		window.api.git.discard(repoPath, files),
	commit: (repoPath: string, message: string) =>
		window.api.git.commit(repoPath, message),
	checkout: (repoPath: string, branch: string) =>
		window.api.git.checkout(repoPath, branch),
	createBranch: (repoPath: string, name: string) =>
		window.api.git.createBranch(repoPath, name),
	push: (repoPath: string) => window.api.git.push(repoPath),
	pull: (repoPath: string) => window.api.git.pull(repoPath),
	fetch: (repoPath: string) => window.api.git.fetch(repoPath),
	generateCommitMessage: (repoPath: string) =>
		window.api.git.generateCommitMessage(repoPath),
} satisfies Pick<GitHandler, keyof GitHandler>
