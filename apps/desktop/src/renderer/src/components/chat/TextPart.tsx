import { useState } from 'react'

import type { TextPart } from '@/shared/types'

interface TextPartProps {
	part: TextPart
}

// Simple copy icon SVG
function CopyIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
			<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
		</svg>
	)
}

// Simple check icon SVG
function CheckIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	)
}

// Simple markdown renderer - handles basic formatting
function Markdown({ content }: { content: string }) {
	// Handle code blocks (```language\ncode\n```)
	const parts = content.split(/(```[\s\S]*?```)/g)

	return (
		<div className="prose prose-sm max-w-none">
			{parts.map((part, index) => {
				if (part.startsWith('```')) {
					const match = part.match(/```(\w*)\n([\s\S]*?)```/)
					if (match) {
						return (
							<pre
								key={index}
								className="bg-muted/50 overflow-auto rounded-md px-3 py-2 font-mono text-xs"
							>
								<code>{match[2]}</code>
							</pre>
						)
					}
				}

				// Handle inline code (`code`)
				const inlineParts = part.split(/(`[^`]+`)/g)
				return (
					<span key={index}>
						{inlineParts.map((inlinePart, i) => {
							if (
								inlinePart.startsWith('`') &&
								inlinePart.endsWith('`')
							) {
								return (
									<code
										key={i}
										className="bg-muted/50 rounded px-1 py-0.5 font-mono text-xs"
									>
										{inlinePart.slice(1, -1)}
									</code>
								)
							}
							// Handle **bold**
							const boldParts =
								inlinePart.split(/(\*\*[^*]+\*\*)/g)
							return (
								<span key={i}>
									{boldParts.map((bp, j) => {
										if (
											bp.startsWith('**') &&
											bp.endsWith('**')
										) {
											return (
												<strong key={j}>
													{bp.slice(2, -2)}
												</strong>
											)
										}
										return bp
									})}
								</span>
							)
						})}
					</span>
				)
			})}
		</div>
	)
}

export function TextPart({ part }: TextPartProps) {
	const [copied, setCopied] = useState(false)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(part.text)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	return (
		<div className="group relative">
			<div className="text-sm whitespace-pre-wrap">
				<Markdown content={part.text} />
			</div>
			<button
				type="button"
				onClick={handleCopy}
				className="hover:bg-muted/50 absolute top-2 right-2 rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
				title="Copy text"
			>
				{copied ? (
					<CheckIcon className="h-4 w-4 text-green-500" />
				) : (
					<CopyIcon className="text-muted-foreground h-4 w-4" />
				)}
			</button>
		</div>
	)
}
