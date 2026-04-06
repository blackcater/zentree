import { createFileRoute } from '@tanstack/react-router'

import { ProjectSettingsPage } from './-ProjectSettingsPage'

export const Route = createFileRoute('/vault/$vaultId/settings/projects/$projectId')({
	component: ProjectSettingsPage,
})
