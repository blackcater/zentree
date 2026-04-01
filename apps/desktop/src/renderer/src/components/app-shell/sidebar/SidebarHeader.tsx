import { cn } from '@acme-ai/ui'
import { Button } from '@acme-ai/ui/foundation'
import {
	ChatAddIcon,
	Clock01Icon,
	DashboardSquare01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export function SidebarHeader() {
	return (
		<div className="mb-2 flex w-full flex-col items-start gap-2">
			<section className="w-full px-2">
				<Button
					className="w-full justify-start"
					variant="pure"
					size="lg"
				>
					<HugeiconsIcon icon={ChatAddIcon} className="mr-1" />
					New Thread
				</Button>
				<Button
					className={cn(
						'w-full justify-start',
						'bg-black/10 dark:bg-white/10'
					)}
					variant="pure"
					size="lg"
				>
					<HugeiconsIcon
						icon={DashboardSquare01Icon}
						className="mr-1"
					/>
					Extensions
				</Button>
				<Button
					className="w-full justify-start"
					variant="pure"
					size="lg"
				>
					<HugeiconsIcon icon={Clock01Icon} className="mr-1" />
					Automation
				</Button>
			</section>
		</div>
	)
}
