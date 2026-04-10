import {
	TextIcon,
	ToolsIcon,
	SparklesIcon,
	BotIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type {
	Part,
	TextPart,
	ToolPart,
	ReasoningPart,
	CompactionPart,
} from '@/shared/types'

interface AssistantPartsProps {
	parts: Part[]
}

// Context tool names that should be grouped together
const CONTEXT_TOOL_NAMES = ['read', 'glob', 'grep', 'websearch', 'webfetch']

function TextPartComponent({ part }: { part: TextPart }) {
	return (
		<div className="prose prose-sm max-w-none">
			<p className="text-sm whitespace-pre-wrap">{part.text}</p>
		</div>
	)
}

function ToolPartComponent({ part }: { part: ToolPart }) {
	return (
		<div className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 font-mono text-xs">
			<HugeiconsIcon
				icon={ToolsIcon}
				className="text-muted-foreground h-3 w-3"
			/>
			<span className="text-muted-foreground">{part.tool}</span>
			<span className="text-muted-foreground/50">({part.status})</span>
		</div>
	)
}

function ReasoningPartComponent({ part }: { part: ReasoningPart }) {
	return (
		<div className="bg-muted/30 flex items-start gap-2 rounded-lg p-2">
			<HugeiconsIcon
				icon={SparklesIcon}
				className="mt-0.5 h-4 w-4 text-amber-600/70"
			/>
			<div className="text-muted-foreground text-xs whitespace-pre-wrap">
				{part.text}
			</div>
		</div>
	)
}

function CompactionPartComponent({ part }: { part: CompactionPart }) {
	return (
		<div className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-xs">
			<div className="bg-border h-px flex-1" />
			<span>{part.message || 'Context compacted'}</span>
			<div className="bg-border h-px flex-1" />
		</div>
	)
}

function AgentPartComponent({
	part,
}: {
	part: { type: 'agent'; name: string }
}) {
	return (
		<div className="flex items-center gap-2 text-xs">
			<HugeiconsIcon
				icon={BotIcon}
				className="text-muted-foreground h-3 w-3"
			/>
			<span className="text-muted-foreground">{part.name}</span>
		</div>
	)
}

function ContextToolsComponent({ tools }: { tools: ToolPart[] }) {
	if (tools.length === 0) return null

	return (
		<div className="bg-muted/20 flex flex-col gap-2 rounded-lg p-3">
			<div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
				<HugeiconsIcon icon={TextIcon} className="h-3 w-3" />
				<span>Context Tools ({tools.length})</span>
			</div>
			<div className="flex flex-col gap-2">
				{tools.map((tool) => (
					<ToolPartComponent key={tool.toolCallId} part={tool} />
				))}
			</div>
		</div>
	)
}

export function AssistantParts({ parts }: AssistantPartsProps) {
	// Separate context tools from other parts
	const contextTools = parts.filter(
		(p): p is ToolPart =>
			p.type === 'tool' &&
			CONTEXT_TOOL_NAMES.includes(p.tool.toLowerCase())
	)

	const otherParts = parts.filter(
		(p) =>
			!(
				p.type === 'tool' &&
				CONTEXT_TOOL_NAMES.includes((p as ToolPart).tool.toLowerCase())
			)
	)

	return (
		<div className="flex flex-col gap-3">
			{contextTools.length > 0 && (
				<ContextToolsComponent tools={contextTools} />
			)}

			{otherParts.map((part, index) => {
				switch (part.type) {
					case 'text':
						return <TextPartComponent key={index} part={part} />
					case 'tool':
						return <ToolPartComponent key={index} part={part} />
					case 'reasoning':
						return (
							<ReasoningPartComponent key={index} part={part} />
						)
					case 'compaction':
						return (
							<CompactionPartComponent key={index} part={part} />
						)
					case 'agent':
						return <AgentPartComponent key={index} part={part} />
					default:
						return null
				}
			})}
		</div>
	)
}
