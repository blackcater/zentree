import { useState, useCallback } from 'react'

import type { UIMessage } from '@renderer/types/session'
import { useOutline } from '@renderer/hooks/chat/useOutline'
import type { OutlineNode } from '@renderer/types/outline'
import { OutlinePanelHeader } from './OutlinePanelHeader'
import { OutlineTree } from './OutlineTree'

interface OutlinePanelProps {
	messages: UIMessage[]
	onNavigate?: (node: OutlineNode) => void
	className?: string
}

export function OutlinePanel({
	messages,
	onNavigate,
	className,
}: OutlinePanelProps) {
	const { nodes, totalCount } = useOutline({ messages })
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

	const handleToggle = useCallback((id: string) => {
		setExpandedNodes((prev) => {
			const next = new Set(prev)
			if (next.has(id)) {
				next.delete(id)
			} else {
				next.add(id)
			}
			return next
		})
	}, [])

	const handleNodeClick = useCallback(
		(node: OutlineNode) => {
			onNavigate?.(node)
		},
		[onNavigate]
	)

	return (
		<div className={`flex h-full flex-col ${className ?? ''}`}>
			<OutlinePanelHeader totalCount={totalCount} />

			<div className="flex-1 overflow-auto">
				<OutlineTree
					nodes={nodes}
					expandedNodes={expandedNodes}
					onToggle={handleToggle}
					onNodeClick={handleNodeClick}
				/>
			</div>
		</div>
	)
}
