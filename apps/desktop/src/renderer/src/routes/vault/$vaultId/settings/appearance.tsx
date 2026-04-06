import { useState } from 'react'

import {
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@acme-ai/ui/foundation'
import { createFileRoute } from '@tanstack/react-router'

import { SettingsContent, SettingsSection } from '@renderer/components/settings'

export const Route = createFileRoute('/vault/$vaultId/settings/appearance')({
	component: AppearancePage,
})

function AppearancePage() {
	const [theme, setTheme] = useState('system')
	const [fontFamily, setFontFamily] = useState('system')
	const [fontSize, setFontSize] = useState('14')
	const [language, setLanguage] = useState('en')

	return (
		<SettingsContent>
			<SettingsSection
				title="Appearance"
				description="Customize how the app looks on your device"
			>
				<div className="flex items-center justify-between">
					<Label htmlFor="theme" className="text-sm font-medium">
						Theme
					</Label>
					<Select value={theme} onValueChange={setTheme}>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="light">Light</SelectItem>
							<SelectItem value="dark">Dark</SelectItem>
							<SelectItem value="system">System</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center justify-between">
					<Label
						htmlFor="font-family"
						className="text-sm font-medium"
					>
						Font Family
					</Label>
					<Select value={fontFamily} onValueChange={setFontFamily}>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="system">System</SelectItem>
							<SelectItem value="inter">Inter</SelectItem>
							<SelectItem value="geist">Geist</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center justify-between">
					<Label htmlFor="font-size" className="text-sm font-medium">
						Font Size
					</Label>
					<Select value={fontSize} onValueChange={setFontSize}>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="12">12px</SelectItem>
							<SelectItem value="14">14px</SelectItem>
							<SelectItem value="16">16px</SelectItem>
							<SelectItem value="18">18px</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center justify-between">
					<Label htmlFor="language" className="text-sm font-medium">
						Language
					</Label>
					<Select value={language} onValueChange={setLanguage}>
						<SelectTrigger className="w-[180px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="en">English</SelectItem>
							<SelectItem value="zh-CN">中文</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</SettingsSection>
		</SettingsContent>
	)
}
