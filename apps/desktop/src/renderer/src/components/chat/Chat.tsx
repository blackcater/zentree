export interface ChatProps {
	threadId?: string
}

export function Chat({ threadId }: Readonly<ChatProps>) {
	if (!threadId) {
		return (
			<div className="flex h-full items-center justify-center">
				New Thread (no threadId)
			</div>
		)
	}

	return <div>Thread View: {threadId}</div>
}
