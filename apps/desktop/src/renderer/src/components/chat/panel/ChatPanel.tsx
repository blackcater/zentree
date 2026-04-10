import { useChatSession } from '@renderer/hooks/useChatSession'

import { InputBar } from './InputBar'
import { MessageList } from './MessageList'
import { PermissionDialog } from './PermissionDialog'

export function ChatPanel() {
	const { activeSession, isProcessing, sendMessage } = useChatSession()

	return (
		<div className="bg-background flex h-full flex-col">
			{activeSession ? (
				<>
					<MessageList session={activeSession} />
					<InputBar disabled={isProcessing} onSend={sendMessage} />
				</>
			) : (
				<div className="text-muted-foreground flex flex-1 items-center justify-center">
					No active session. Create one to start chatting.
				</div>
			)}
			<PermissionDialog />
		</div>
	)
}
