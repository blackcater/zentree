import { createFileRoute } from '@tanstack/react-router'

import { AutomationsPage } from './-AutomationsPage'

export const Route = createFileRoute('/vault/$vaultId/automations')({
	component: AutomationsPage,
})
