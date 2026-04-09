import { Fragment, memo } from 'react'

import { Folder01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { OutlineNode as OutlineNodeType } from '../../../hooks/useOutline'
import { OutlineNode } from './OutlineNode'

interface OutlineTreeProps {
	nodes: OutlineNodeType[]
	expandedNodes: Set<string>
	onToggle: (id: string) => void
	onNodeClick: (node: OutlineNodeType) => void
	depth?: number
}

function EmptyState() {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
			<HugeiconsIcon
				icon={Folder01Icon}
				className="text-muted-foreground/50 h-8 w-8"
			/>
			<p className="text-muted-foreground text-sm">No outline items</p>
		</div>
	)
}

export const OutlineTree = memo(function OutlineTree({
	nodes,
	expandedNodes,
	onToggle,
	onNodeClick,
	depth = 0,
}: OutlineTreeProps) {
	if (nodes.length === 0) {
		return <EmptyState />
	}

	return (
		<div className="flex flex-col">
			{nodes.map((node) => {
				const hasChildren = node.children && node.children.length > 0
				return (
					<Fragment key={node.id}>
						<div
							className="hover:bg-accent flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1"
							onClick={(e) => {
								e.stopPropagation()
								if (hasChildren) {
									onToggle(node.id)
								}
								onNodeClick(node)
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault()
									if (hasChildren) {
										onToggle(node.id)
									}
									onNodeClick(node)
								}
							}}
							role="treeitem"
							aria-expanded={
								node.children?.length
									? expandedNodes.has(node.id)
									: undefined
							}
							tabIndex={0}
						>
							<OutlineNode
								node={node}
								expandedNodes={expandedNodes}
								depth={depth}
							/>
						</div>

						{/* Render children if expanded */}
						{hasChildren && expandedNodes.has(node.id) && (
							<OutlineTree
								nodes={node.children ?? []}
								expandedNodes={expandedNodes}
								onToggle={onToggle}
								onNodeClick={onNodeClick}
								depth={depth + 1}
							/>
						)}
					</Fragment>
				)
			})}
		</div>
	)
})
