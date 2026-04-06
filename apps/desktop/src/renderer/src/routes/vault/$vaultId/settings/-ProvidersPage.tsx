import { Button } from '@acme-ai/ui/foundation'

import {
	SettingsContent,
	SettingsSection,
} from '@renderer/components/settings/SettingsContent'

export function ProvidersPage(): React.JSX.Element {
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
