import { useCallback, useEffect, useMemo, useState } from 'react'

import { useFileOperations } from '../hooks'
import type { FileNode, FileNodeData, UseFileTreeOptions } from '../types'

interface TreeNodeStore {
	[name: string]: FileNodeData[]
}

export function useFileTree(options: UseFileTreeOptions) {
	const { rootPath } = options
	const { listFiles } = useFileOperations()

	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
	const [loadedChildren, setLoadedChildren] = useState<TreeNodeStore>({})
	const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set())
	const [error, setError] = useState<string | null>(null)

	// Load root directory on mount
	useEffect(() => {
		if (!rootPath) return
		loadChildren(rootPath)
	}, [rootPath])

	const loadChildren = useCallback(
		async (dirPath: string) => {
			if (loadedChildren[dirPath] || loadingPaths.has(dirPath)) return

			setLoadingPaths((prev) => new Set(prev).add(dirPath))
			setError(null)

			try {
				const children = await listFiles(dirPath)
				setLoadedChildren((prev) => ({ ...prev, [dirPath]: children }))
			} catch (err) {
				setError(String(err))
			} finally {
				setLoadingPaths((prev) => {
					const next = new Set(prev)
					next.delete(dirPath)
					return next
				})
			}
		},
		[listFiles, loadedChildren, loadingPaths]
	)

	const toggleExpand = useCallback(
		(path: string) => {
			setExpandedPaths((prev) => {
				const next = new Set(prev)
				if (next.has(path)) {
					next.delete(path)
				} else {
					next.add(path)
					// Trigger lazy load when expanding
					loadChildren(path)
				}
				return next
			})
		},
		[loadChildren]
	)

	const isExpanded = useCallback(
		(path: string) => expandedPaths.has(path),
		[expandedPaths]
	)
	const isLoading = useCallback(
		(path: string) => loadingPaths.has(path),
		[loadingPaths]
	)

	const getChildren = useCallback(
		(path: string): FileNodeData[] => {
			return loadedChildren[path] ?? []
		},
		[loadedChildren]
	)

	// Build tree nodes for rendering
	const rootNodes = useMemo((): FileNode[] => {
		const children = loadedChildren[rootPath] ?? []
		return children.map((child) => ({
			...child,
			id: child.path,
			depth: 0,
		}))
	}, [loadedChildren, rootPath])

	return {
		rootNodes,
		expandedPaths,
		loadingPaths,
		error,
		toggleExpand,
		isExpanded,
		isLoading,
		getChildren,
	}
}
