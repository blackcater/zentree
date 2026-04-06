import { createFileRoute, Outlet } from '@tanstack/react-router'

import { SettingsNav } from '@renderer/components/settings/SettingsNav'

export const Route = createFileRoute('/vault/settings')({
	component: SettingsLayout,
})

function SettingsLayout() {
	return (
		<div className="flex h-full w-full">
			<SettingsNav />
			<div className="flex h-full w-full flex-1 flex-col overflow-hidden py-1 pr-1">
				<main className="bg-background h-full w-full rounded-lg">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
