import { cn } from '@acme-ai/ui'
import { Button } from '@acme-ai/ui/foundation'
import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
	LayoutRightIcon,
	SidebarLeftIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from '@tanstack/react-router'

import { is } from '@renderer/lib/electron'

interface AppHeaderProps {
	onSidebarToggle?: () => void
}

export function AppHeader({ onSidebarToggle }: Readonly<AppHeaderProps>) {
	const router = useRouter()

	return (
		<div className="absolute inset-x-0 top-0 z-1 flex h-10 w-full flex-row overflow-hidden py-1 pr-2">
			{/* Left section - navigation buttons */}
			<div
				className={cn(
					'flex h-full flex-row items-center',
					is.macOS && 'pl-20'
				)}
			>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Sidebar"
					onClick={onSidebarToggle}
				>
					<HugeiconsIcon icon={SidebarLeftIcon} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Go Back"
					disabled={router.history.canGoBack()}
					onClick={() => router.history.back()}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Go Next"
					disabled={
						window.history.state?.index >= window.history.length - 1
					}
					onClick={() => router.history.forward()}
				>
					<HugeiconsIcon icon={ArrowRight01Icon} />
				</Button>
			</div>

			{/* Center - title from props or context */}
			<div className="app-region-drag flex h-full flex-1 flex-row items-center justify-center"></div>

			{/* Right section - actions */}
			<div className="flex h-full flex-row items-center">
				<Button variant="ghost" size="icon" aria-label="Right Panel">
					<HugeiconsIcon icon={LayoutRightIcon} />
				</Button>
			</div>
		</div>
	)
}
