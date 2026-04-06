import {
	Panel,
	Group,
	Separator,
	useDefaultLayout,
	type PanelSize,
} from 'react-resizable-panels'

import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useAtom } from 'jotai'

import { sidebarAtom } from '@renderer/atoms/sidebar'
import { AppHeader, AppSidebar } from '@renderer/components/app-shell'
import { HeaderProvider } from '@renderer/contexts/HeaderContext'

export const Route = createFileRoute('/vault/$vaultId')({
	component: VaultLayout,
})

function VaultLayout() {
	const [sidebar, setSidebar] = useAtom(sidebarAtom)
	const {
		defaultLayout: sidebarLayout,
		onLayoutChanged: onSidebarLayoutChanged,
	} = useDefaultLayout({
		id: 'layout-sidebar',
		panelIds: ['sidebar'],
		storage: localStorage,
	})

	function handleSidebarToggle() {
		setSidebar((prev) => ({ ...prev, collapsed: !prev.collapsed }))
	}

	function handleSidebarResize(size: PanelSize) {
		setSidebar((prev) => ({ ...prev, width: size.inPixels }))
	}

	return (
		<HeaderProvider>
			<div className="relative z-1 flex h-full w-full flex-1 flex-col">
				<AppHeader onSidebarToggle={handleSidebarToggle} />
				<Group
					orientation="horizontal"
					defaultLayout={sidebarLayout}
					onLayoutChanged={onSidebarLayoutChanged}
				>
					{!sidebar.collapsed && (
						<Panel
							id="sidebar"
							minSize={250}
							maxSize={350}
							onResize={handleSidebarResize}
						>
							<AppSidebar />
						</Panel>
					)}

					<Separator className="hover:bg-primary/20 my-4 w-0.5 bg-transparent transition-colors" />

					<Panel id="main">
						<div className="flex h-full w-full flex-1 flex-col overflow-hidden py-1 pr-1">
							<main className="bg-background h-full w-full rounded-lg">
								<Outlet />
							</main>
						</div>
					</Panel>
				</Group>
			</div>
		</HeaderProvider>
	)
}
