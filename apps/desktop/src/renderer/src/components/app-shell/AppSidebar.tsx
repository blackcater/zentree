import { ScrollArea } from '@acme-ai/ui/foundation'
import { DragDropProvider } from '@dnd-kit/react'

import { PinnedSection } from './sidebar/PinnedSection'
import { ProjectSection } from './sidebar/ProjectSection'
import { SidebarFooter } from './sidebar/SidebarFooter'
import { SidebarHeader } from './sidebar/SidebarHeader'

export function AppSidebar(): React.JSX.Element {
	return (
		<aside className="text-secondary-foreground relative flex w-[256px] shrink-0 flex-col">
			<SidebarHeader />
			<ScrollArea className="flex-1">
				<DragDropProvider>
					<PinnedSection />
					<ProjectSection />
				</DragDropProvider>
			</ScrollArea>
			<SidebarFooter />
		</aside>
	)
}
