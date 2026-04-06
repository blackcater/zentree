import React from 'react'

import { Switch } from '@acme-ai/ui/foundation'
import { Label } from '@acme-ai/ui/foundation'
import { SettingsContent, SettingsSection } from '@renderer/components/settings/SettingsContent'

export function GeneralPage(): React.JSX.Element {
	// TODO: These will be connected to actual settings store via IPC
	const [preventSleep, setPreventSleep] = React.useState(false)
	const [confirmQuit, setConfirmQuit] = React.useState(true)
	const [openLinksInApp, setOpenLinksInApp] = React.useState(false)

	return (
		<SettingsContent>
			<SettingsSection
				title="General"
				description="Configure general app preferences"
			>
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="prevent-sleep" className="text-sm font-medium">
							Prevent Sleep During Chat
						</Label>
						<p className="text-xs text-muted-foreground">
							Prevents system sleep while in chat
						</p>
					</div>
					<Switch
						id="prevent-sleep"
						checked={preventSleep}
						onCheckedChange={setPreventSleep}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="confirm-quit" className="text-sm font-medium">
							Confirm Before Quit
						</Label>
						<p className="text-xs text-muted-foreground">
							Shows confirmation dialog when quitting
						</p>
					</div>
					<Switch
						id="confirm-quit"
						checked={confirmQuit}
						onCheckedChange={setConfirmQuit}
					/>
				</div>

				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label htmlFor="open-links" className="text-sm font-medium">
							Open Links In-App
						</Label>
						<p className="text-xs text-muted-foreground">
							Opens links in built-in browser instead of default browser
						</p>
					</div>
					<Switch
						id="open-links"
						checked={openLinksInApp}
						onCheckedChange={setOpenLinksInApp}
					/>
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
