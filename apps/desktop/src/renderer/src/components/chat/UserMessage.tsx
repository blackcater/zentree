import { UserIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import type { Message } from '@/shared/types'

interface UserMessageProps {
	message: Message
}

// Extract text content from message parts
function extractTextFromParts(parts: Message['parts']): string {
	return parts
		.filter(
			(part): part is { type: 'text'; text: string } =>
				part.type === 'text'
		)
		.map((part) => part.text)
		.join('')
}

export function UserMessage({ message }: UserMessageProps) {
	const text = extractTextFromParts(message.parts)

	return (
		<div className="flex items-start gap-3">
			<div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
				<HugeiconsIcon
					icon={UserIcon}
					className="text-primary h-4 w-4"
				/>
			</div>
			<div className="flex flex-col gap-1">
				<span className="text-muted-foreground text-xs font-medium">
					You
				</span>
				<div className="bg-muted/50 rounded-lg px-3 py-2">
					<p className="text-sm whitespace-pre-wrap">{text}</p>
				</div>
			</div>
		</div>
	)
}
