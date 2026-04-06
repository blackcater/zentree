import { createFileRoute } from '@tanstack/react-router'

import { NewThreadPage } from './-NewThreadPage'

export const Route = createFileRoute('/vault/$vaultId/')({
	component: NewThreadPage,
})
