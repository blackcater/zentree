import { useState, useCallback, useRef, useEffect } from 'react'

import { MailSend02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface InputBarProps {
	disabled?: boolean
	onSend?: (msg: string) => void
}

export function InputBar({ disabled = false, onSend }: InputBarProps) {
	const [value, setValue] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// Auto-resize textarea
	useEffect(() => {
		const textarea = textareaRef.current
		if (textarea) {
			textarea.style.height = 'auto'
			textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
		}
	}, [value])

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault()
			const trimmed = value.trim()
			if (trimmed && !disabled && onSend) {
				onSend(trimmed)
				setValue('')
			}
		},
		[value, disabled, onSend]
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// Submit on Enter (without Shift)
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSubmit(e as unknown as React.FormEvent)
			}
		},
		[handleSubmit]
	)

	return (
		<div className="border-border/50 bg-background/80 border-t p-4 backdrop-blur-sm">
			<form onSubmit={handleSubmit} className="flex items-end gap-3">
				<div className="relative flex-1">
					<textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message..."
						disabled={disabled}
						rows={1}
						className="border-input bg-background placeholder:text-muted-foreground focus:ring-ring/50 w-full resize-none rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						style={{ minHeight: '44px', maxHeight: '200px' }}
					/>
				</div>
				<button
					type="submit"
					disabled={disabled || !value.trim()}
					className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				>
					<HugeiconsIcon icon={MailSend02Icon} className="h-4 w-4" />
				</button>
			</form>
		</div>
	)
}
