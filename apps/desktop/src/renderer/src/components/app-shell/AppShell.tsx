import { cn } from '@acme-ai/ui/lib/utils'

import { is } from '@renderer/lib/electron'

import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'

interface AppShellProps {
	enableNoise?: boolean
	children: React.ReactNode
}

export function AppShell({
	enableNoise = true,
	children,
}: Readonly<AppShellProps>) {
	return (
		<div
			className={cn(
				'relative flex h-screen flex-col',
				is.macOS ? 'bg-transparent' : 'bg-sidebar',
				is.electron && enableNoise && 'noise'
			)}
		>
			<AppHeader />
			<div className="flex flex-1 overflow-hidden">
				<AppSidebar />
				<main className="bg-background flex-1 overflow-auto">
					{children}
				</main>
			</div>
		</div>
	)
}
