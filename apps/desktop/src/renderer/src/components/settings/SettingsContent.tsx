interface SettingsContentProps {
	children: React.ReactNode
}

export function SettingsContent({ children }: Readonly<SettingsContentProps>) {
	return (
		<div className="flex h-full flex-col overflow-hidden p-6">
			<div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto">
				{children}
			</div>
		</div>
	)
}
