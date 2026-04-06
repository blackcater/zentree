import { createFileRoute } from '@tanstack/react-router'

import { ThreadPage } from './-ThreadPage'

export const Route = createFileRoute('/vault/$vaultId/thread/$threadId')({
	component: ThreadPage,
})
