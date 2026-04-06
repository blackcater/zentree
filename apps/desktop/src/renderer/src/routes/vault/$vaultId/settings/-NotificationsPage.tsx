import React from 'react'

import { Slider } from '@acme-ai/ui/foundation'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@acme-ai/ui/foundation'
import { Label } from '@acme-ai/ui/foundation'
import { SettingsContent, SettingsSection } from '@renderer/components/settings/SettingsContent'

export function NotificationsPage(): React.JSX.Element {
	const [sound, setSound] = React.useState('ping')
	const [volume, setVolume] = React.useState([70])

	return (
		<SettingsContent>
			<SettingsSection
				title="Notifications"
				description="Configure notification sounds and volume"
			>
				<div className="flex items-center justify-between">
					<Label htmlFor="sound" className="text-sm font-medium">
						Notification Sound
					</Label>
					<Select value={sound} onValueChange={setSound}>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ping">Ping</SelectItem>
							<SelectItem value="arcade">Arcade</SelectItem>
							<SelectItem value="chime">Chime</SelectItem>
							<SelectItem value="none">None</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label htmlFor="volume" className="text-sm font-medium">
							Volume
						</Label>
						<span className="text-xs text-muted-foreground">{volume[0]}%</span>
					</div>
					<Slider
						id="volume"
						value={volume}
						onValueChange={setVolume}
						max={100}
						step={1}
					/>
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
