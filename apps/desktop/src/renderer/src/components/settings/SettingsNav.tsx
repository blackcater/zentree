import { cn } from '@acme-ai/ui'
import { Button } from '@acme-ai/ui/foundation'
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
	ArrowLeft01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useLocation, useRouter } from '@tanstack/react-router'

import { is } from '@renderer/lib/electron'

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
				id: '/vault/settings/general',
				label: 'General',
				icon: (
					<HugeiconsIcon icon={Settings01Icon} className="size-4" />
				),
			},
			{
				id: '/vault/settings/appearance',
				label: 'Appearance',
				icon: (
					<HugeiconsIcon icon={PaintBrush01Icon} className="size-4" />
				),
			},
			{
				id: '/vault/settings/notifications',
				label: 'Notifications',
				icon: <HugeiconsIcon icon={BellDotIcon} className="size-4" />,
			},
			{
				id: '/vault/settings/keyboard',
				label: 'Keyboard',
				icon: <HugeiconsIcon icon={KeyboardIcon} className="size-4" />,
			},
		],
	},
	{
		label: 'Workspace',
		items: [
			{
				id: '/vault/settings/agents',
				label: 'Agents',
				icon: <HugeiconsIcon icon={CpuIcon} className="size-4" />,
			},
			{
				id: '/vault/settings/providers',
				label: 'Providers',
				icon: <HugeiconsIcon icon={AiBrain01Icon} className="size-4" />,
			},
			{
				id: '/vault/settings/git',
				label: 'Git',
				icon: <HugeiconsIcon icon={FolderGitIcon} className="size-4" />,
			},
			{
				id: '/vault/settings/archive',
				label: 'Archive',
				icon: <HugeiconsIcon icon={ArchiveIcon} className="size-4" />,
			},
		],
	},
	{
		label: 'System',
		items: [
			{
				id: '/vault/settings/about',
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
	const location = useLocation()
	const router = useRouter()
	const currentPath = location.pathname

	return (
		<nav
			className={cn(
				'flex w-56 shrink-0 flex-col p-3',
				is.macOS && 'pt-10'
			)}
		>
			<div>
				<Button
					className="mb-2"
					variant="pure"
					onClick={() => router.history.back()}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
					<span>Back</span>
				</Button>
			</div>

			<h1 className="mb-4 px-3 text-lg font-semibold">Settings</h1>

			<div className="min-h-0 flex-1 overflow-y-auto">
				{STATIC_GROUPS.map((group, groupIndex) => (
					<div
						key={group.label}
						className={groupIndex > 0 ? 'mt-4' : ''}
					>
						<h2 className="text-muted-foreground/60 mb-1 px-3 text-[10px] font-medium tracking-widest uppercase">
							{group.label}
						</h2>
						<div className="flex flex-col">
							{group.items.map((item) => {
								const isActive = currentPath === item.id
								return (
									<Link
										key={item.id}
										to={item.id}
										className={`flex h-8 items-center gap-3 rounded-md px-3 text-xs transition-colors ${
											isActive
												? 'bg-hover text-accent-foreground'
												: 'text-muted-foreground hover:text-accent-foreground'
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
					<h2 className="text-muted-foreground/60 mb-1 px-3 text-[10px] font-medium tracking-widest uppercase">
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
