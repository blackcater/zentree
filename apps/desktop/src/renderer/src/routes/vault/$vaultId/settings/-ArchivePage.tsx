import {
	SettingsContent,
	SettingsSection,
} from '@renderer/components/settings/SettingsContent'

export function ArchivePage(): React.JSX.Element {
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
