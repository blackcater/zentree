import { createFileRoute } from '@tanstack/react-router'

import { ChatPopupPage } from './-ChatPopupPage'

export const Route = createFileRoute('/chat-popup/$threadId/')({
	component: ChatPopupPage,
})
