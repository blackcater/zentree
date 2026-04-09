import { memo } from 'react'

import {
	ListTreeIcon,
	User03Icon,
	BotIcon,
	ToolsIcon,
	ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type {
	OutlineNode as OutlineNodeType,
	OutlineNodeType as NodeType,
} from '../../../hooks/useOutline'

interface OutlineNodeProps {
	node: OutlineNodeType
	expandedNodes: Set<string>
	depth: number
}

const NODE_TYPE_COLORS: Record<NodeType, string> = {
	user: 'text-blue-500',
	assistant: 'text-green-500',
	tool_call: 'text-orange-500',
	tool_result: 'text-orange-400',
}

function getNodeIcon(type: NodeType) {
	switch (type) {
		case 'user':
			return User03Icon
		case 'assistant':
			return BotIcon
		case 'tool_call':
			return ToolsIcon
		case 'tool_result':
			return ListTreeIcon
		default:
			return ListTreeIcon
	}
}

function ChevronIcon({ isExpanded }: { isExpanded: boolean }) {
	return (
		<HugeiconsIcon
			icon={ArrowRight01Icon}
			className="text-muted-foreground h-4 w-4"
			style={{
				transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
				transition: 'transform 150ms',
			}}
		/>
	)
}

export const OutlineNode = memo(function OutlineNode({
	node,
	expandedNodes,
	depth,
}: OutlineNodeProps) {
	const isExpanded = expandedNodes.has(node.id)
	const hasChildren = node.children && node.children.length > 0
	const colorClass = NODE_TYPE_COLORS[node.type]
	const Icon = getNodeIcon(node.type)

	return (
		<div className="flex items-center gap-1.5">
			{/* Indent spacer */}
			<span
				className="inline-block"
				style={{ width: depth * 16, height: '16px' }}
			/>

			{/* Expand/Collapse Chevron */}
			{hasChildren ? (
				<span className="flex h-4 w-4 items-center justify-center">
					<ChevronIcon isExpanded={isExpanded} />
				</span>
			) : (
				<span className="h-4 w-4" />
			)}

			{/* Node Icon */}
			<HugeiconsIcon
				icon={Icon}
				className={`h-3.5 w-3.5 shrink-0 ${colorClass}`}
			/>

			{/* Node Label */}
			<span
				className="text-foreground truncate text-sm"
				title={node.label}
			>
				{node.label}
			</span>
		</div>
	)
})
