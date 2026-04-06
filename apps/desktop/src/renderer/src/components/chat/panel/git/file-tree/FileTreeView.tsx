// apps/desktop/src/renderer/src/components/chat/panel/git/file-tree/FileTreeView.tsx
import { useCallback, useMemo } from 'react'
import type { FileNode } from '../types'
import { useFileTree } from './useFileTree'
import { TreeNode } from './TreeNode'

interface FileTreeViewProps {
	rootPath: string
	onFileClick?: (node: FileNode, rect: DOMRect) => void
}

export function FileTreeView({ rootPath, onFileClick }: FileTreeViewProps) {
	const {
		rootNodes,
		expandedPaths,
		loadingPaths,
		toggleExpand,
		isExpanded,
		isLoading,
		getChildren,
		error,
	} = useFileTree({ rootPath, onFileClick })

	// Flatten the tree for rendering (depth-first traversal)
	const flattenedNodes = useMemo(() => {
		const result: Array<FileNode & { isExpanded: boolean; isLoading: boolean }> = []

		function traverse(nodes: FileNode[], depth: number) {
			for (const node of nodes) {
				const expanded = isExpanded(node.path)
				result.push({
					...node,
					depth,
					isExpanded: expanded,
					isLoading: isLoading(node.path),
				})

				if (expanded && node.type === 'directory') {
					const children = getChildren(node.path)
					traverse(
						children.map((child) => ({ ...child, id: child.path, depth: depth + 1 })),
						depth + 1
					)
				}
			}
		}

		traverse(rootNodes, 0)
		return result
	}, [rootNodes, expandedPaths, loadingPaths, isExpanded, isLoading, getChildren])

	const handleToggle = useCallback(
		(path: string) => {
			toggleExpand(path)
		},
		[toggleExpand]
	)

	if (error) {
		return (
			<div className="p-4 text-destructive text-sm">
				Error loading files: {error}
			</div>
		)
	}

	if (!rootNodes.length) {
		return (
			<div className="p-4 text-muted-foreground text-sm">
				Loading files...
			</div>
		)
	}

	return (
		<div className="overflow-auto" role="tree">
			{flattenedNodes.map((node) => (
				<TreeNode
					key={node.id}
					node={node}
					isExpanded={node.isExpanded}
					isLoading={node.isLoading}
					onToggle={handleToggle}
					onClick={onFileClick}
				/>
			))}
		</div>
	)
}