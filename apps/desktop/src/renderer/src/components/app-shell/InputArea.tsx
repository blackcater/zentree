import { useState, useCallback, type KeyboardEvent } from 'react'
import { ArrowUp } from 'lucide-react'

import { cn } from '@acme-ai/ui/lib/utils'
import { Button } from '@acme-ai/ui/foundation'

interface InputAreaProps {
	className?: string
	onSend?: (message: string) => void
}

export function InputArea({ className, onSend }: InputAreaProps) {
	const [value, setValue] = useState('')

	const handleSend = useCallback(() => {
		if (value.trim() && onSend) {
			onSend(value.trim())
			setValue('')
		}
	}, [value, onSend])

	const handleKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			if (event.key === 'Enter' && !event.shiftKey) {
				event.preventDefault()
				handleSend()
			}
		},
		[handleSend]
	)

	const isDisabled = !value.trim()

	return (
		<div
			className={cn(
				'flex items-center gap-2 rounded-full bg-input px-4 py-2',
				className
			)}
		>
			<input
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Type a message..."
				className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
			/>
			<Button
				type="button"
				size="icon-sm"
				variant="ghost"
				disabled={isDisabled}
				onClick={handleSend}
				className={cn('rounded-full', isDisabled && 'opacity-50')}
			>
				<ArrowUp className="size-4" />
			</Button>
		</div>
	)
}
