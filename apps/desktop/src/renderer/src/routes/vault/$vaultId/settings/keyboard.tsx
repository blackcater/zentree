import { createFileRoute } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute('/vault/$vaultId/settings/keyboard')({
	component: KeyboardPage,
})

function KeyboardPage() {
	return (
		<SettingsContent>
			<SettingsSection
				title="Keyboard Shortcuts"
				description="View and customize keyboard shortcuts"
			>
				<div className="text-muted-foreground text-sm">
					Keyboard shortcuts configuration coming soon.
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
