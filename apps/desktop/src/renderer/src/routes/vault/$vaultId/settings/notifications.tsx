import { createFileRoute } from '@tanstack/react-router'

import { NotificationsPage } from './-NotificationsPage'

export const Route = createFileRoute('/vault/$vaultId/settings/notifications')({
	component: NotificationsPage,
})
