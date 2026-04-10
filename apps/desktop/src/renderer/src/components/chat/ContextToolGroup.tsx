import { TextIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { ToolPart } from '@/shared/types'

import { ToolCard } from './ToolCard'

interface ContextToolGroupProps {
	tools: ToolPart[]
}

// Context tool names that should be grouped together
const CONTEXT_TOOL_NAMES = ['read', 'glob', 'grep', 'websearch', 'webfetch']

export function ContextToolGroup({ tools }: ContextToolGroupProps) {
	// Filter to only context tools
	const contextTools = tools.filter((tool) =>
		CONTEXT_TOOL_NAMES.includes(tool.tool.toLowerCase())
	)

	if (contextTools.length === 0) return null

	return (
		<div className="bg-muted/20 flex flex-col gap-2 rounded-lg p-3">
			<div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
				<HugeiconsIcon icon={TextIcon} className="h-3 w-3" />
				<span>Gathered context: {contextTools.length} tools</span>
			</div>
			<div className="flex flex-col gap-2">
				{contextTools.map((tool) => (
					<ToolCard key={tool.toolCallId} part={tool} />
				))}
			</div>
		</div>
	)
}
