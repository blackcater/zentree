import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile, unlink, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { createId } from '@paralleldrive/cuid2'

import { log } from '../lib/logger'
import type { Folder } from '../types'

export class FolderStore {
	readonly #basePath: string

	constructor(basePath: string) {
		this.#basePath = basePath
	}

	private getFoldersDir(): string {
		return join(this.#basePath, 'folders')
	}

	private getFolderPath(folderId: string): string {
		return join(this.getFoldersDir(), `${folderId}.json`)
	}

	async create(data: Omit<Folder, 'id' | 'createdAt'>): Promise<Folder> {
		const folder: Folder = {
			...data,
			id: createId(),
			createdAt: new Date(),
		}

		const foldersDir = this.getFoldersDir()
		if (!existsSync(foldersDir)) {
			await mkdir(foldersDir, { recursive: true })
		}

		const folderPath = this.getFolderPath(folder.id)
		await writeFile(folderPath, JSON.stringify(folder, null, 2), 'utf-8')

		log.info('Folder created', { folderId: folder.id })
		return folder
	}

	async get(folderId: string): Promise<Folder | null> {
		const folderPath = this.getFolderPath(folderId)

		if (!existsSync(folderPath)) {
			return null
		}

		try {
			const content = await readFile(folderPath, 'utf-8')
			return JSON.parse(content) as Folder
		} catch (error) {
			log.error('Failed to read folder', { folderId, error })
			return null
		}
	}

	async listByProject(projectId: string): Promise<Folder[]> {
		const foldersDir = this.getFoldersDir()

		if (!existsSync(foldersDir)) {
			return []
		}

		try {
			const entries = await readdir(foldersDir, { withFileTypes: true })
			const folderPaths = entries
				.filter(
					(entry) => entry.isFile() && entry.name.endsWith('.json')
				)
				.map((entry) => join(foldersDir, entry.name))

			const folders: Folder[] = []
			for (const folderPath of folderPaths) {
				const content = await readFile(folderPath, 'utf-8')
				const folder = JSON.parse(content) as Folder
				if (folder.projectId === projectId) {
					folders.push(folder)
				}
			}

			return folders.sort(
				(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
			)
		} catch (error) {
			log.error('Failed to list folders by project', { projectId, error })
			return []
		}
	}

	async delete(folderId: string): Promise<boolean> {
		const folderPath = this.getFolderPath(folderId)

		if (!existsSync(folderPath)) {
			return false
		}

		try {
			await unlink(folderPath)
			log.info('Folder deleted', { folderId })
			return true
		} catch (error) {
			log.error('Failed to delete folder', { folderId, error })
			return false
		}
	}
}
