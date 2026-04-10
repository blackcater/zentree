import simpleGit, { type SimpleGit } from 'simple-git'

import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'
import type { API } from '@/types'

export class GitHandler implements API.GitAPI {
	#get(repoPath: string): SimpleGit {
		return simpleGit(repoPath)
	}

	async status(repoPath: string): Promise<API.GitStatus> {
		const git = this.#get(repoPath)
		const result = await git.status()
		return {
			current: result.current,
			tracking: result.tracking,
			staged: result.staged,
			unstaged: result.modified,
			untracked: result.not_added,
			conflicted: result.conflicted,
		}
	}

	async branches(repoPath: string): Promise<API.GitBranch[]> {
		const git = this.#get(repoPath)
		const branchSummary = await git.branch()
		return branchSummary.all.map((name) => ({
			name,
			current: name === branchSummary.current,
		}))
	}

	async currentBranch(repoPath: string): Promise<string> {
		const git = this.#get(repoPath)
		const branchSummary = await git.branch()
		return branchSummary.current
	}

	async log(repoPath: string, count = 50): Promise<API.GitLogEntry[]> {
		const git = this.#get(repoPath)
		const result = await git.log({
			maxCount: count,
			'--no-optional-locks': null,
		})
		return result.all.map((entry) => ({
			hash: entry.hash,
			date: entry.date,
			message: entry.message,
			author_name: entry.author_name,
			author_email: entry.author_email,
		}))
	}

	async diffStat(
		repoPath: string
	): Promise<{ additions: number; deletions: number }> {
		const git = this.#get(repoPath)
		const result = await git.diff(['--stat'])
		let additions = 0
		let deletions = 0
		for (const line of result.split('\n')) {
			const match = line.match(/\+(\d+).*?-\d+/)
			if (match) {
				additions += parseInt(match[1], 10)
				deletions += parseInt(match[2], 10)
			}
		}
		return { additions, deletions }
	}

	async stage(repoPath: string, files: string[]): Promise<void> {
		const git = this.#get(repoPath)
		await git.add(files)
	}

	async unstage(repoPath: string, files: string[]): Promise<void> {
		const git = this.#get(repoPath)
		await git.reset(['HEAD', '--', ...files])
	}

	async stageAll(repoPath: string): Promise<void> {
		const git = this.#get(repoPath)
		await git.add('-A')
	}

	async unstageAll(repoPath: string): Promise<void> {
		const git = this.#get(repoPath)
		await git.reset(['HEAD'])
	}

	async discard(repoPath: string, files: string[]): Promise<void> {
		const git = this.#get(repoPath)
		await git.checkout(['--', ...files])
	}

	async commit(repoPath: string, message: string): Promise<{ hash: string }> {
		const git = this.#get(repoPath)
		const result = await git.commit(message)
		return { hash: result.commit }
	}

	async checkout(
		repoPath: string,
		branch: string
	): Promise<{ success: boolean }> {
		const git = this.#get(repoPath)
		try {
			await git.checkout(branch)
			return { success: true }
		} catch {
			return { success: false }
		}
	}

	async createBranch(repoPath: string, name: string): Promise<void> {
		const git = this.#get(repoPath)
		await git.checkoutLocalBranch(name)
	}

	async push(
		repoPath: string
	): Promise<{ success: boolean; message?: string }> {
		const git = this.#get(repoPath)
		try {
			const result = await git.push()
			return { success: true, message: result.pushed.join(', ') }
		} catch (err) {
			return { success: false, message: String(err) }
		}
	}

	async pull(
		repoPath: string
	): Promise<{ success: boolean; message?: string }> {
		const git = this.#get(repoPath)
		try {
			await git.pull()
			return { success: true }
		} catch (err) {
			return { success: false, message: String(err) }
		}
	}

	async fetch(repoPath: string): Promise<void> {
		const git = this.#get(repoPath)
		await git.fetch(['--all', '--no-optional-locks'])
	}

	async generateCommitMessage(repoPath: string): Promise<string> {
		const status = await this.status(repoPath)
		const changes =
			status.staged.length +
			status.unstaged.length +
			status.untracked.length
		return `Update ${changes} files`
	}

	// -----------------------------------------------------------------------
	// Registration
	// -----------------------------------------------------------------------

	static registerHandlers(): void {
		const server = Container.inject(ElectronRpcServer)
		const router = server.router('git')
		const handler = new GitHandler()

		router.handle('status', (repoPath) => handler.status(repoPath))
		router.handle('branches', (repoPath) => handler.branches(repoPath))
		router.handle('currentBranch', (repoPath) =>
			handler.currentBranch(repoPath)
		)
		router.handle('log', (repoPath, count) => handler.log(repoPath, count))
		router.handle('diffStat', (repoPath) => handler.diffStat(repoPath))
		router.handle('stage', (repoPath, files) =>
			handler.stage(repoPath, files)
		)
		router.handle('unstage', (repoPath, files) =>
			handler.unstage(repoPath, files)
		)
		router.handle('stageAll', (repoPath) => handler.stageAll(repoPath))
		router.handle('unstageAll', (repoPath) => handler.unstageAll(repoPath))
		router.handle('discard', (repoPath, files) =>
			handler.discard(repoPath, files)
		)
		router.handle('commit', (repoPath, message) =>
			handler.commit(repoPath, message)
		)
		router.handle('checkout', (repoPath, branch) =>
			handler.checkout(repoPath, branch)
		)
		router.handle('createBranch', (repoPath, name) =>
			handler.createBranch(repoPath, name)
		)
		router.handle('push', (repoPath) => handler.push(repoPath))
		router.handle('pull', (repoPath) => handler.pull(repoPath))
		router.handle('fetch', (repoPath) => handler.fetch(repoPath))
		router.handle('generateCommitMessage', (repoPath) =>
			handler.generateCommitMessage(repoPath)
		)
	}
}
