import { Separator } from '@acme-ai/ui/foundation'

interface SettingsSectionProps {
	title: string
	description?: string
	children: React.ReactNode
}

export function SettingsSection({
	title,
	description,
	children,
}: Readonly<SettingsSectionProps>) {
	return (
		<div className="mb-8">
			<h2 className="text-xl font-semibold">{title}</h2>
			{description && (
				<p className="text-muted-foreground mt-1 text-sm">
					{description}
				</p>
			)}
			<Separator className="mt-4 mb-6" />
			<div className="space-y-6">{children}</div>
		</div>
	)
}
