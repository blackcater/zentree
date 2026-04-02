import { createFileRoute } from '@tanstack/react-router'

import { ThreadPage } from './thread/$threadId'

export const Route = createFileRoute('/vault/$vaultId/')({
	component: ThreadPage,
})
