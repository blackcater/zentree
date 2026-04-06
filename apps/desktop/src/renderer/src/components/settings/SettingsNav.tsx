import {
	Settings01Icon,
	PaintBrush01Icon,
	BellDotIcon,
	KeyboardIcon,
	CpuIcon,
	AiBrain01Icon,
	FolderGitIcon,
	ArchiveIcon,
	InformationCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useMatchRoute } from '@tanstack/react-router'

interface NavItem {
	id: string
	label: string
	icon: React.ReactNode
}

interface NavGroup {
	label: string
	items: NavItem[]
}

// Static navigation groups (Personal, Workspace, System)
const STATIC_GROUPS: NavGroup[] = [
	{
		label: 'Personal',
		items: [
			{
				id: '/vault/$vaultId/settings/general',
				label: 'General',
				icon: (
					<HugeiconsIcon icon={Settings01Icon} className="size-4" />
				),
			},
			{
				id: '/vault/$vaultId/settings/appearance',
				label: 'Appearance',
				icon: (
					<HugeiconsIcon icon={PaintBrush01Icon} className="size-4" />
				),
			},
			{
				id: '/vault/$vaultId/settings/notifications',
				label: 'Notifications',
				icon: <HugeiconsIcon icon={BellDotIcon} className="size-4" />,
			},
			{
				id: '/vault/$vaultId/settings/keyboard',
				label: 'Keyboard',
				icon: <HugeiconsIcon icon={KeyboardIcon} className="size-4" />,
			},
		],
	},
	{
		label: 'Workspace',
		items: [
			{
				id: '/vault/$vaultId/settings/agents',
				label: 'Agents',
				icon: <HugeiconsIcon icon={CpuIcon} className="size-4" />,
			},
			{
				id: '/vault/$vaultId/settings/providers',
				label: 'Providers',
				icon: <HugeiconsIcon icon={AiBrain01Icon} className="size-4" />,
			},
			{
				id: '/vault/$vaultId/settings/git',
				label: 'Git',
				icon: <HugeiconsIcon icon={FolderGitIcon} className="size-4" />,
			},
			{
				id: '/vault/$vaultId/settings/archive',
				label: 'Archive',
				icon: <HugeiconsIcon icon={ArchiveIcon} className="size-4" />,
			},
		],
	},
	{
		label: 'System',
		items: [
			{
				id: '/vault/$vaultId/settings/about',
				label: 'About',
				icon: (
					<HugeiconsIcon
						icon={InformationCircleIcon}
						className="size-4"
					/>
				),
			},
		],
	},
]

export function SettingsNav() {
	const matchRoute = useMatchRoute()

	return (
		<nav className="bg-sidebar flex w-56 shrink-0 flex-col border-r p-3">
			<h1 className="mb-4 px-3 text-lg font-semibold">Settings</h1>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{STATIC_GROUPS.map((group, groupIndex) => (
					<div
						key={group.label}
						className={groupIndex > 0 ? 'mt-4' : ''}
					>
						<h2 className="text-muted-foreground/60 mb-1 px-3 text-[10px] font-medium tracking-[0.1em] uppercase">
							{group.label}
						</h2>
						<div className="flex flex-col">
							{group.items.map((item) => {
								const isActive = !!matchRoute({ to: item.id })
								return (
									<Link
										key={item.id}
										to={item.id}
										className={`flex h-8 items-center gap-3 rounded-md px-3 text-xs transition-colors ${
											isActive
												? 'bg-accent text-accent-foreground'
												: 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
										} `}
									>
										{item.icon}
										<span>{item.label}</span>
									</Link>
								)
							})}
						</div>
					</div>
				))}

				{/* Dynamic Projects group - placeholder for now */}
				<div className="mt-4">
					<h2 className="text-muted-foreground/60 mb-1 px-3 text-[10px] font-medium tracking-[0.1em] uppercase">
						Projects
					</h2>
					<div className="flex flex-col">
						{/* TODO: Dynamic project items will be added later */}
					</div>
				</div>
			</div>
		</nav>
	)
}
