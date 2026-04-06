import { useState } from 'react'

import {
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Slider,
} from '@acme-ai/ui/foundation'
import { createFileRoute } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute('/vault/$vaultId/settings/notifications')({
	component: NotificationsPage,
})

function NotificationsPage() {
	const [sound, setSound] = useState('ping')
	const [volume, setVolume] = useState([70])

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
						<span className="text-muted-foreground text-xs">
							{volume[0]}%
						</span>
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
