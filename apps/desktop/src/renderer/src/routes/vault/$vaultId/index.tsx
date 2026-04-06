import { createFileRoute } from '@tanstack/react-router'

import { Chat } from '@renderer/components/chat/Chat'

export const Route = createFileRoute('/vault/$vaultId/')({
	component: NewThreadPage,
})

function NewThreadPage() {
	return <Chat />
}
