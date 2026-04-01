import { ScrollArea } from '@acme-ai/ui/foundation'

import { PinnedSection } from './sidebar/PinnedSection'
import { ProjectSection } from './sidebar/ProjectSection'
import { SidebarFooter } from './sidebar/SidebarFooter'
import { SidebarHeader } from './sidebar/SidebarHeader'

export function AppSidebar(): React.JSX.Element {
	return (
		<aside className="text-secondary-foreground relative flex w-[256px] shrink-0 flex-col">
			<SidebarHeader />
			<PinnedSection />
			<ScrollArea className="flex-1">
				<ProjectSection />
			</ScrollArea>
			<SidebarFooter />
		</aside>
	)
}
