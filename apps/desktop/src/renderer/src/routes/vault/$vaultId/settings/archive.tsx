import { createFileRoute } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute('/vault/$vaultId/settings/archive')({
	component: ArchivePage,
})

function ArchivePage() {
	return (
		<SettingsContent>
			<SettingsSection
				title="Archive"
				description="View and restore archived projects and threads"
			>
				<div className="text-muted-foreground text-sm">
					No archived items.
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
