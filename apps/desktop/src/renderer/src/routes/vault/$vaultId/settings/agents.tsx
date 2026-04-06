import { Button } from '@acme-ai/ui/foundation'
import { createFileRoute } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute('/vault/$vaultId/settings/agents')({
	component: AgentsPage,
})

function AgentsPage() {
	return (
		<SettingsContent>
			<SettingsSection
				title="Agents"
				description="Configure ACP-compatible agents"
			>
				<div className="text-muted-foreground mb-4 text-sm">
					No agents configured yet.
				</div>
				<Button>Add Agent</Button>
			</SettingsSection>
		</SettingsContent>
	)
}
