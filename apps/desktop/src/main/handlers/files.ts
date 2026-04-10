import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { Container } from '@/shared/di'
import { ElectronRpcServer } from '@/shared/rpc/electron'
import type { API } from '@/types'

// ---------------------------------------------------------------------------
// Handler class - implementation + type source of truth
// ---------------------------------------------------------------------------

export class FilesHandler implements API.FilesAPI {
	static readonly #skippedDirs: Array<{ path: string; error: string }> = []

	static #logSkipped(dir: string, error: string): void {
		FilesHandler.#skippedDirs.push({ path: dir, error })
	}

	static #getDirKey(inode: number, device: number): string {
		return `${device}:${inode}`
	}

	async list(
		dirPath: string
	): Promise<{ files: API.FileNode[]; error?: string }> {
		try {
			const entries = await fs.readdir(dirPath, { withFileTypes: true })
			const files: API.FileNode[] = entries.map((entry): API.FileNode => {
				const fullPath = path.join(dirPath, entry.name)
				const result: API.FileNode = {
					name: entry.name,
					path: fullPath,
					type: entry.isDirectory() ? 'directory' : 'file',
				}
				if (entry.isFile()) {
					result.extension = path
						.extname(entry.name)
						.toLowerCase()
						.slice(1)
				}
				return result
			})
			files.sort((a, b) => {
				if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
				return a.name.localeCompare(b.name)
			})
			return { files }
		} catch (error) {
			return { files: [], error: String(error) }
		}
	}

	async search(
		query: string,
		rootPath: string
	): Promise<{ results: API.SearchResult[]; skippedCount: number }> {
		FilesHandler.#skippedDirs.length = 0
		const results: API.SearchResult[] = []
		const maxResults = 100
		const maxDepth = 20
		const visitedDirs = new Set<string>()

		const walk = async (dir: string, depth: number): Promise<void> => {
			if (results.length >= maxResults || depth > maxDepth) return
			try {
				const stats = await fs.stat(dir)
				if (stats.isDirectory()) {
					const dirKey = FilesHandler.#getDirKey(stats.ino, stats.dev)
					if (visitedDirs.has(dirKey)) return
					visitedDirs.add(dirKey)
				}
				const entries = await fs.readdir(dir, { withFileTypes: true })
				for (const entry of entries) {
					if (results.length >= maxResults) break
					const fullPath = path.join(dir, entry.name)
					if (
						entry.name.toLowerCase().includes(query.toLowerCase())
					) {
						results.push({
							name: entry.name,
							path: fullPath,
							type: entry.isDirectory() ? 'directory' : 'file',
						})
					}
					if (entry.isDirectory() && !entry.name.startsWith('.')) {
						await walk(fullPath, depth + 1)
					}
				}
			} catch (error) {
				FilesHandler.#logSkipped(dir, String(error))
			}
		}

		await walk(rootPath, 0)
		return { results, skippedCount: FilesHandler.#skippedDirs.length }
	}

	// -----------------------------------------------------------------------
	// Registration
	// -----------------------------------------------------------------------

	static registerHandlers(): void {
		const server = Container.inject(ElectronRpcServer)
		const router = server.router('files')
		const handler = new FilesHandler()

		router.handle('list', (dirPath) => handler.list(dirPath))
		router.handle('search', (query, rootPath) =>
			handler.search(query, rootPath)
		)
	}
}
