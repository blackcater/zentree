import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAtom } from 'jotai'

import { currentProjectPathAtom } from '@renderer/stores/git.atoms'

import { FileTreeRow } from './FileTreeRow'
import { InlineCreateInput } from './InlineCreateInput'
import { ProjectFilesPanelHeader } from './ProjectFilesPanelHeader'
import type { FileNode, FileOperationCallbacks } from './types'

// ============================================================================
// Utility: Build tree from flat file list
// ============================================================================

function buildFileTree(files: FileNode[]): FileNode[] {
	const nodeMap = new Map<string, FileNode>()
	const roots: FileNode[] = []

	// First pass: create nodes with children arrays
	for (const file of files) {
		nodeMap.set(file.path, { ...file, children: [] })
	}

	// Second pass: build tree structure
	for (const file of files) {
		const node = nodeMap.get(file.path)!
		const parentPath = getParentPath(file.path)

		if (parentPath && nodeMap.has(parentPath)) {
			const parent = nodeMap.get(parentPath)!
			parent.children!.push(node)
		} else {
			roots.push(node)
		}
	}

	// Sort: directories first, then alphabetically
	const sortNodes = (nodes: FileNode[]): FileNode[] => {
		nodes.sort((a, b) => {
			if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
			return a.name.localeCompare(b.name)
		})
		for (const node of nodes) {
			if (node.children) sortNodes(node.children)
		}
		return nodes
	}

	return sortNodes(roots)
}

function getParentPath(path: string): string | null {
	const parts = path.split('/')
	parts.pop()
	return parts.length > 0 ? parts.join('/') : null
}

// ============================================================================
// Types
// ============================================================================

interface CreatingState {
	parentPath: string
	type: 'file' | 'folder'
	depth: number
}

// ============================================================================
// Component
// ============================================================================

export function ProjectFilesPanel() {
	const [projectPath] = useAtom(currentProjectPathAtom)
	const [files, setFiles] = useState<FileNode[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState('')
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
	const [creating, setCreating] = useState<CreatingState | null>(null)
	const [totalFileCount, setTotalFileCount] = useState(0)

	const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	)

	// --------------------------------------------------------------------------
	// Load files from project path
	// --------------------------------------------------------------------------

	const loadFiles = useCallback(async () => {
		if (!projectPath) {
			setFiles([])
			setTotalFileCount(0)
			return
		}

		setLoading(true)
		setError(null)

		try {
			const result = await window.api.files.list(projectPath)
			if (result.error) {
				setError(result.error)
				setFiles([])
				setTotalFileCount(0)
			} else {
				setFiles(result.files)
				setTotalFileCount(result.files.length)
			}
		} catch (err) {
			setError(String(err))
			setFiles([])
			setTotalFileCount(0)
		} finally {
			setLoading(false)
		}
	}, [projectPath])

	// Initial load
	useEffect(() => {
		loadFiles()
	}, [loadFiles])

	// --------------------------------------------------------------------------
	// File watching (placeholder - API doesn't support it yet)
	// --------------------------------------------------------------------------

	// TODO: Implement with filesApi.watch / filesApi.onChanged / filesApi.unwatch
	// For now, we'll use a manual refresh approach

	// --------------------------------------------------------------------------
	// Debounced search with auto-expand
	// --------------------------------------------------------------------------

	useEffect(() => {
		clearTimeout(searchDebounceRef.current)

		if (!searchQuery.trim()) {
			return
		}

		searchDebounceRef.current = setTimeout(async () => {
			try {
				const result = await window.api.files.search(
					searchQuery,
					projectPath
				)
				// Auto-expand all directories containing matching results
				const pathsToExpand = new Set<string>()
				for (const r of result.results) {
					// Always expand parent directories
					const parts = r.path.split('/')
					for (let i = 1; i < parts.length; i++) {
						pathsToExpand.add(parts.slice(0, i).join('/'))
					}
				}
				setExpandedPaths(pathsToExpand)
			} catch {
				// Search failed, ignore
			}
		}, 200)

		return () => clearTimeout(searchDebounceRef.current)
	}, [searchQuery, projectPath])

	// --------------------------------------------------------------------------
	// Build file tree
	// --------------------------------------------------------------------------

	const fileTree = useMemo(() => buildFileTree(files), [files])

	// --------------------------------------------------------------------------
	// Flatten tree for rendering with depth tracking
	// --------------------------------------------------------------------------

	const flattenedNodes = useMemo(() => {
		const result: Array<{ node: FileNode; depth: number }> = []
		const traverse = (nodes: FileNode[], depth: number) => {
			for (const node of nodes) {
				result.push({ node, depth })
				if (node.children && expandedPaths.has(node.path)) {
					traverse(node.children, depth + 1)
				}
			}
		}
		traverse(fileTree, 0)
		return result
	}, [fileTree, expandedPaths])

	// --------------------------------------------------------------------------
	// Handlers
	// --------------------------------------------------------------------------

	const handleToggle = useCallback((node: FileNode) => {
		setExpandedPaths((prev) => {
			const next = new Set(prev)
			if (next.has(node.path)) {
				next.delete(node.path)
			} else {
				next.add(node.path)
			}
			return next
		})
	}, [])

	const handleFileClick = useCallback((node: FileNode) => {
		console.log('File clicked:', node.path)
		// TODO: Open file in editor
	}, [])

	const handleNewFile = useCallback((node: FileNode) => {
		setCreating({ parentPath: node.path, type: 'file', depth: 1 })
	}, [])

	const handleNewFolder = useCallback((node: FileNode) => {
		setCreating({ parentPath: node.path, type: 'folder', depth: 1 })
	}, [])

	const handleCopyPath = useCallback((node: FileNode) => {
		navigator.clipboard.writeText(node.path)
	}, [])

	const handleShowInFinder = useCallback((node: FileNode) => {
		// TODO: Implement show in finder via IPC
		console.log('Show in finder:', node.path)
	}, [])

	const handleRename = useCallback((node: FileNode) => {
		// TODO: Implement rename via IPC
		console.log('Rename:', node.path)
	}, [])

	const handleMoveToTrash = useCallback((node: FileNode) => {
		// TODO: Implement move to trash via IPC
		console.log('Move to trash:', node.path)
	}, [])

	const handleOpenInEditor = useCallback((node: FileNode) => {
		console.log('Open in editor:', node.path)
		// TODO: Implement open in editor via IPC
	}, [])

	const handleCreateCommit = useCallback(
		async (name: string) => {
			if (!creating) return

			const newPath = `${creating.parentPath}/${name}`
			// TODO: Implement file/folder creation via IPC
			console.log('Create:', creating.type, newPath)
			setCreating(null)
			// Refresh after creation
			loadFiles()
		},
		[creating, loadFiles]
	)

	const handleCreateCancel = useCallback(() => {
		setCreating(null)
	}, [])

	// Build callbacks object for FileTreeRow
	const callbacks: FileOperationCallbacks = {
		onOpenInEditor: handleOpenInEditor,
		onNewFile: handleNewFile,
		onNewFolder: handleNewFolder,
		onCopyPath: handleCopyPath,
		onShowInFinder: handleShowInFinder,
		onRename: handleRename,
		onMoveToTrash: handleMoveToTrash,
	}

	// --------------------------------------------------------------------------
	// Render
	// --------------------------------------------------------------------------

	return (
		<div className="flex h-full flex-col">
			<ProjectFilesPanelHeader
				totalFiles={totalFileCount}
				onSearch={setSearchQuery}
				onRefresh={loadFiles}
				loading={loading}
			/>

			<div className="flex-1 overflow-auto">
				{error && (
					<div className="text-destructive p-3 text-xs">{error}</div>
				)}

				{!projectPath && (
					<div className="text-muted-foreground flex h-full items-center justify-center text-xs">
						No project selected
					</div>
				)}

				{projectPath && files.length === 0 && !loading && (
					<div className="text-muted-foreground flex h-full items-center justify-center text-xs">
						No files in project
					</div>
				)}

				{flattenedNodes.map(({ node, depth }) => (
					<FileTreeRow
						key={node.path}
						node={node}
						depth={depth}
						isExpanded={expandedPaths.has(node.path)}
						onToggle={handleToggle}
						onFileClick={handleFileClick}
						{...callbacks}
					/>
				))}

				{creating && (
					<InlineCreateInput
						depth={creating.depth}
						type={creating.type}
						onCommit={handleCreateCommit}
						onCancel={handleCreateCancel}
					/>
				)}
			</div>
		</div>
	)
}
