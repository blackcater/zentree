import { useState } from 'react'

interface ChatInputProps {
	threadId: string | undefined
	onSend: (content: string) => Promise<void>
	disabled?: boolean
}

export function ChatInput({
	threadId,
	onSend,
	disabled,
}: Readonly<ChatInputProps>): React.JSX.Element {
	const [message, setMessage] = useState('')
	const [isSending, setIsSending] = useState(false)

	async function handleSubmit(e: React.FormEvent): Promise<void> {
		e.preventDefault()

		if (!message.trim() || !threadId || isSending) {
			return
		}

		setIsSending(true)
		try {
			await onSend(message.trim())
			setMessage('')
		} catch (error) {
			console.error('Failed to send message:', error)
		} finally {
			setIsSending(false)
		}
	}

	const canSend = threadId && message.trim() && !isSending && !disabled

	return (
		<form onSubmit={handleSubmit} className="border-border border-t p-4">
			<div className="mx-auto flex max-w-3xl items-end gap-3">
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder={
						threadId
							? 'Type your message...'
							: 'Select a thread to start chatting'
					}
					disabled={!threadId || disabled}
					rows={1}
					className="border-input bg-background focus:ring-ring flex-1 resize-none rounded-lg border px-4 py-3 focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					style={{
						minHeight: '48px',
						maxHeight: '200px',
					}}
					onKeyDown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault()
							handleSubmit(e)
						}
					}}
				/>
				<button
					type="submit"
					disabled={!canSend}
					className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-12 w-12 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isSending ? (
						<svg
							className="h-5 w-5 animate-spin"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							/>
						</svg>
					) : (
						<svg
							className="h-5 w-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
							/>
						</svg>
					)}
				</button>
			</div>
		</form>
	)
}
