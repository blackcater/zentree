import { useAtomValue } from 'jotai'
import { ScrollArea } from '@acme-ai/ui/foundation'

import { SidebarFooter } from './sidebar/SidebarFooter'
import { SidebarHeader } from './sidebar/SidebarHeader'
import { PinnedSection } from './sidebar/PinnedSection'
import { FolderView } from './sidebar/FolderView'
import { FlatView } from './sidebar/FlatView'
import { viewModeAtom } from './atoms/thread-atoms'

export function AppSidebar(): React.JSX.Element {
	const viewMode = useAtomValue(viewModeAtom)

	return (
		<aside className="text-secondary-foreground relative flex w-[256px] shrink-0 flex-col">
			<SidebarHeader />
			{/* Sidebar Content */}
			<ScrollArea className="flex-1">
				{/* Pinned Section */}
				<PinnedSection />
				{/* Thread Section - switches between FolderView and FlatView */}
				{viewMode === 'folder' ? <FolderView /> : <FlatView />}
			</ScrollArea>
			{/* Sidebar Footer */}
			<SidebarFooter />
		</aside>
	)
}
