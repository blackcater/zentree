import { Button } from '@acme-ai/ui/foundation'
import { createFileRoute } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute('/vault/$vaultId/settings/providers')({
	component: ProvidersPage,
})

function ProvidersPage() {
	return (
		<SettingsContent>
			<SettingsSection
				title="Providers"
				description="Configure model providers and API keys"
			>
				<div className="text-muted-foreground mb-4 text-sm">
					No providers configured yet.
				</div>
				<Button>Add Provider</Button>
			</SettingsSection>
		</SettingsContent>
	)
}
