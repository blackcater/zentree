import { createFileRoute, Outlet } from '@tanstack/react-router'

import { AppHeader, AppSidebar } from '@renderer/components/app-shell'

export const Route = createFileRoute('/vault/$vaultId')({
	component: VaultLayout,
})

function VaultLayout() {
	return (
		<>
			<AppHeader />
			<div className="flex flex-1 overflow-hidden">
				<AppSidebar />
				<main className="bg-background flex-1 overflow-auto">
					<Outlet />
				</main>
			</div>
		</>
	)
}
