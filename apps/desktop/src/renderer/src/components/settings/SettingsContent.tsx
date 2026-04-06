import { Separator } from '@acme-ai/ui/foundation'

interface SettingsContentProps {
	children: React.ReactNode
}

export function SettingsContent({
	children,
}: SettingsContentProps): React.JSX.Element {
	return (
		<div className="flex h-full flex-col overflow-hidden p-6">
			<div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto">
				{children}
			</div>
		</div>
	)
}

interface SettingsSectionProps {
	title: string
	description?: string
	children: React.ReactNode
}

export function SettingsSection({
	title,
	description,
	children,
}: SettingsSectionProps): React.JSX.Element {
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
