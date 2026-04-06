import { createFileRoute } from '@tanstack/react-router'

import { ExtensionsPage } from './-ExtensionsPage'

export const Route = createFileRoute('/vault/$vaultId/extensions')({
	component: ExtensionsPage,
})
