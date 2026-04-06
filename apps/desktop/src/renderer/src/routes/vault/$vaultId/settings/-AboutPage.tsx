import { Button } from '@acme-ai/ui/foundation'
import { Separator } from '@acme-ai/ui/foundation'

import {
	SettingsContent,
	SettingsSection,
} from '@renderer/components/settings/SettingsContent'

export function AboutPage(): React.JSX.Element {
	return (
		<SettingsContent>
			<SettingsSection
				title="About"
				description="Application information and updates"
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Application</span>
						<span className="text-muted-foreground text-sm">
							Acme
						</span>
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Version</span>
						<span className="text-muted-foreground text-sm">
							1.0.0
						</span>
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							Check for Updates
						</span>
						<Button variant="outline" size="sm">
							Check Now
						</Button>
					</div>
					<Separator />
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							Release Notes
						</span>
						<Button variant="link" size="sm">
							View Changelog
						</Button>
					</div>
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
