import { ScrollArea } from '@acme-ai/ui/foundation'
import { useAtomValue } from 'jotai'

import { sidebarAtom } from '@renderer/atoms'

import { PinnedSection } from './sidebar/PinnedSection'
import { ProjectSection } from './sidebar/ProjectSection'
import { SidebarFooter } from './sidebar/SidebarFooter'
import { SidebarHeader } from './sidebar/SidebarHeader'

export function AppSidebar(): React.JSX.Element {
	const sidebar = useAtomValue(sidebarAtom)

	return (
		<aside
			className="text-secondary-foreground relative flex h-full shrink-0 flex-col overflow-hidden pt-10"
			style={{ width: `${sidebar.width}px` }}
		>
			<SidebarHeader />
			<ScrollArea className="flex-1 overflow-hidden" type="scroll">
				<PinnedSection />
				<ProjectSection />
			</ScrollArea>
			<SidebarFooter />
		</aside>
	)
}
