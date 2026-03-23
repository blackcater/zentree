import { useAtom } from 'jotai'

import { threadIdAtom } from '../atoms'
import { ChatHeader, ChatMessages, ChatInput } from '../components/chat'

export function ChatPage(): React.JSX.Element {
	const [threadId] = useAtom(threadIdAtom)

	async function handleSendMessage(content: string): Promise<void> {
		if (!threadId) return

		// Send user message via IPC
		await window.api.invoke('message:send', { threadId, content })
	}

	async function handleStopAgent(): Promise<void> {
		if (!threadId) return

		// Get thread info to find agentId
		try {
			const thread = await window.api.invoke<{ agentId: string }>(
				'thread:get',
				{ threadId }
			)
			await window.api.invoke('agent:stop', { agentId: thread.agentId })
		} catch (error) {
			console.error('Failed to stop agent:', error)
		}
	}

	return (
		<div className="flex h-full flex-col">
			<ChatHeader threadId={threadId} onStop={handleStopAgent} />
			<ChatMessages threadId={threadId} />
			<ChatInput threadId={threadId} onSend={handleSendMessage} />
		</div>
	)
}
