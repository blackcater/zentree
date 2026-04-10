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
	ToolUsePart,
	ToolResultPart,
	ReasoningPart,
	CompactionPart,
} from '@/shared/types'

interface AssistantPartsProps {
	parts: Part[]
}

// Context tool names that should be grouped together
const CONTEXT_TOOL_NAMES = ['read', 'glob', 'grep', 'websearch', 'webfetch']

interface GroupedParts {
	contextTools: Array<{ tool: ToolUsePart; result?: ToolResultPart }>
	otherParts: Array<
		| ToolUsePart
		| ToolResultPart
		| Exclude<Part, ToolUsePart | ToolResultPart>
	>
}

function groupParts(parts: Part[]): GroupedParts {
	const toolUseParts = parts.filter(
		(p): p is ToolUsePart => p.type === 'tool_use'
	)
	const toolResultParts = parts.filter(
		(p): p is ToolResultPart => p.type === 'tool_result'
	)

	// Group context tools with their results
	const contextTools: GroupedParts['contextTools'] = []
	const otherParts: GroupedParts['otherParts'] = []

	for (const tool of toolUseParts) {
		if (CONTEXT_TOOL_NAMES.includes(tool.name.toLowerCase())) {
			// Find corresponding result
			const result = toolResultParts.find(
				(r) => r.tool_use_id === tool.id
			)
			if (result) {
				contextTools.push({ tool, result })
			} else {
				contextTools.push({ tool })
			}
		} else {
			// Non-context tool - add with its result
			const result = toolResultParts.find(
				(r) => r.tool_use_id === tool.id
			)
			otherParts.push(tool)
			if (result) otherParts.push(result)
		}
	}

	// Add non-tool parts
	for (const part of parts) {
		if (part.type !== 'tool_use' && part.type !== 'tool_result') {
			otherParts.push(part)
		}
	}

	return { contextTools, otherParts }
}

function TextPartComponent({ part }: { part: TextPart }) {
	return (
		<div className="prose prose-sm max-w-none">
			<p className="text-sm whitespace-pre-wrap">{part.text}</p>
		</div>
	)
}

function ToolUsePartComponent({ part }: { part: ToolUsePart }) {
	return (
		<div className="bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1 font-mono text-xs">
			<HugeiconsIcon
				icon={ToolsIcon}
				className="text-muted-foreground h-3 w-3"
			/>
			<span className="text-muted-foreground">{part.name}</span>
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
				{part.reasoning}
			</div>
		</div>
	)
}

function CompactionPartComponent({ part }: { part: CompactionPart }) {
	return (
		<div className="bg-muted/30 flex items-start gap-2 rounded-lg p-2">
			<HugeiconsIcon
				icon={SparklesIcon}
				className="mt-0.5 h-4 w-4 text-blue-600/70"
			/>
			<div className="text-muted-foreground text-xs whitespace-pre-wrap">
				{part.summary}
			</div>
		</div>
	)
}

function AgentPartComponent({
	part,
}: {
	part: { type: 'agent'; agent_id: string; name?: string }
}) {
	return (
		<div className="flex items-center gap-2 text-xs">
			<HugeiconsIcon
				icon={BotIcon}
				className="text-muted-foreground h-3 w-3"
			/>
			<span className="text-muted-foreground">
				{part.name || part.agent_id}
			</span>
		</div>
	)
}

function ContextToolsComponent({
	tools,
}: {
	tools: GroupedParts['contextTools']
}) {
	if (tools.length === 0) return null

	return (
		<div className="bg-muted/20 flex flex-col gap-2 rounded-lg p-3">
			<div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
				<HugeiconsIcon icon={TextIcon} className="h-3 w-3" />
				<span>Context Tools</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{tools.map(({ tool, result }) => (
					<div key={tool.id} className="flex flex-col gap-1">
						<ToolUsePartComponent part={tool} />
						{result && (
							<div className="bg-background/50 max-h-32 overflow-auto rounded px-2 py-1 font-mono text-xs">
								<pre className="whitespace-pre-wrap">
									{result.content}
								</pre>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

export function AssistantParts({ parts }: AssistantPartsProps) {
	const { contextTools, otherParts } = groupParts(parts)

	return (
		<div className="flex flex-col gap-3">
			{contextTools.length > 0 && (
				<ContextToolsComponent tools={contextTools} />
			)}

			{otherParts.map((part, index) => {
				switch (part.type) {
					case 'text':
						return <TextPartComponent key={index} part={part} />
					case 'tool_use':
						return <ToolUsePartComponent key={index} part={part} />
					case 'reasoning':
						return (
							<ReasoningPartComponent key={index} part={part} />
						)
					case 'compaction':
						return (
							<CompactionPartComponent key={index} part={part} />
						)
					case 'agent':
						return (
							<AgentPartComponent
								key={index}
								part={
									part as {
										type: 'agent'
										agent_id: string
										name?: string
									}
								}
							/>
						)
					default:
						return null
				}
			})}
		</div>
	)
}
