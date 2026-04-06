import { createFileRoute } from '@tanstack/react-router'

import { ProvidersPage } from './-ProvidersPage'

export const Route = createFileRoute('/vault/$vaultId/settings/providers')({
	component: ProvidersPage,
})
