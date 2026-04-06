import { memo, useCallback } from 'react'

import type { FileNode } from '../types'
import { FileIcon } from './FileIcon'
import { TreeNodeIndent } from './TreeNodeIndent'

interface TreeNodeProps {
	node: FileNode
	isExpanded?: boolean
	isLoading?: boolean
	onToggle?: (path: string) => void
	onClick?: (node: FileNode, rect: DOMRect) => void
}

export const TreeNode = memo(function TreeNode({
	node,
	isExpanded = false,
	isLoading = false,
	onToggle,
	onClick,
}: TreeNodeProps) {
	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			if (node.type === 'directory') {
				onToggle?.(node.path)
			} else {
				const rect = e.currentTarget.getBoundingClientRect()
				onClick?.(node, rect)
			}
		},
		[node, onToggle, onClick]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				handleClick(e as unknown as React.MouseEvent)
			}
		},
		[handleClick]
	)

	return (
		<div
			className="hover:bg-accent flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1"
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			role="treeitem"
			aria-expanded={node.type === 'directory' ? isExpanded : undefined}
			tabIndex={0}
		>
			<TreeNodeIndent depth={node.depth} />

			{/* Expand/Collapse Icon */}
			{node.type === 'directory' && (
				<span className="text-muted-foreground flex h-4 w-4 items-center justify-center">
					{isLoading ? (
						<SpinnerIcon />
					) : (
						<ChevronIcon isExpanded={isExpanded} />
					)}
				</span>
			)}

			{/* File/Folder Icon */}
			<FileIcon node={node} className="text-foreground" />

			{/* Node Name */}
			<span className="text-foreground truncate text-sm">
				{node.name}
			</span>
		</div>
	)
})

function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			style={{
				transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
				transition: 'transform 150ms',
			}}
		>
			<polyline points="9 18 15 12 9 6" />
		</svg>
	)
}

function SpinnerIcon() {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			className="animate-spin"
		>
			<circle cx="12" cy="12" r="10" opacity="0.25" />
			<path d="M12 2a10 10 0 0 1 10 10" />
		</svg>
	)
}
