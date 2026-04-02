import { cn } from '@acme-ai/ui'
import { Button } from '@acme-ai/ui/foundation'
import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
	LayoutRightIcon,
	SidebarLeftIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { is } from '@renderer/lib/electron'

export function AppHeader(): React.JSX.Element {
	return (
		<div className="absolute inset-x-0 top-0 z-1 flex h-10 w-full flex-row overflow-hidden py-1 pr-2">
			<div
				className={cn(
					'flex h-full flex-row items-center',
					is.macOS && 'pl-20'
				)}
			>
				<Button variant="ghost" size="icon" aria-label="Sidebar">
					<HugeiconsIcon icon={SidebarLeftIcon} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Go Back"
					disabled
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					aria-label="Go Next"
					disabled
				>
					<HugeiconsIcon icon={ArrowRight01Icon} />
				</Button>
			</div>
			<div className="app-region-drag flex h-full flex-1 flex-row"></div>
			<div className="flex h-full flex-row items-center">
				<Button variant="ghost" size="icon" aria-label="Right Panel">
					<HugeiconsIcon icon={LayoutRightIcon} />
				</Button>
			</div>
		</div>
	)
}
