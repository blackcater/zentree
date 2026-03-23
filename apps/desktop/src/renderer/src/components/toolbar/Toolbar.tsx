interface ToolbarProps {
	activePanel:
		| 'files'
		| 'git'
		| 'browser'
		| 'preview'
		| 'settings'
		| undefined
	onPanelChange: (
		panel: 'files' | 'git' | 'browser' | 'preview' | 'settings'
	) => void
}

const toolbarButtons = [
	{
		id: 'files' as const,
		label: 'Files',
		icon: (
			<svg
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				className="h-5 w-5"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
				/>
			</svg>
		),
	},
	{
		id: 'git' as const,
		label: 'Git',
		icon: (
			<svg
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				className="h-5 w-5"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"
				/>
			</svg>
		),
	},
	{
		id: 'browser' as const,
		label: 'Browser',
		icon: (
			<svg
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				className="h-5 w-5"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
				/>
			</svg>
		),
	},
	{
		id: 'preview' as const,
		label: 'Preview',
		icon: (
			<svg
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				className="h-5 w-5"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
				/>
			</svg>
		),
	},
	{
		id: 'settings' as const,
		label: 'Settings',
		icon: (
			<svg
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				className="h-5 w-5"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
				/>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
		),
	},
]

export function Toolbar({
	activePanel,
	onPanelChange,
}: Readonly<ToolbarProps>): React.JSX.Element {
	return (
		<div className="border-border flex h-full w-12 flex-col items-center border-l bg-gray-800 py-4">
			{toolbarButtons.map((button) => (
				<button
					key={button.id}
					type="button"
					onClick={() => onPanelChange(button.id)}
					title={button.label}
					className={`mb-2 flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
						activePanel === button.id
							? 'bg-primary text-primary-foreground'
							: 'text-gray-400 hover:bg-gray-700 hover:text-white'
					}`}
				>
					{button.icon}
				</button>
			))}
		</div>
	)
}
