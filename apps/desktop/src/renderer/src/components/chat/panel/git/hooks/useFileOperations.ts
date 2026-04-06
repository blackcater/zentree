import { useCallback } from 'react'

import type {
	FileNodeData,
	ListFilesResponse,
	SearchFilesResponse,
} from '../types'

export function useFileOperations() {
	const listFiles = useCallback(
		async (dirPath: string): Promise<FileNodeData[]> => {
			const response = (await window.api.rpc.call(
				'/files/list',
				dirPath
			)) as ListFilesResponse
			if (response.error) {
				console.error('Failed to list files:', response.error)
				return []
			}
			return response.files
		},
		[]
	)

	const searchFiles = useCallback(
		async (
			query: string,
			rootPath: string
		): Promise<
			Array<{ name: string; path: string; type: 'file' | 'directory' }>
		> => {
			if (!query.trim()) return []
			try {
				const response = (await window.api.rpc.call(
					'/files/search',
					query,
					rootPath
				)) as SearchFilesResponse
				if (response.error) {
					console.error('Failed to search files:', response.error)
					return []
				}
				return response.results
			} catch (error) {
				console.error('Failed to search files:', error)
				return []
			}
		},
		[]
	)

	return {
		listFiles,
		searchFiles,
	}
}
