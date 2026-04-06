import { Outlet } from '@tanstack/react-router'

import { SettingsNav } from '@renderer/components/settings/SettingsNav'

export function SettingsLayout(): React.JSX.Element {
	return (
		<div className="flex h-full w-full">
			<SettingsNav />
			<div className="flex-1 overflow-hidden">
				<Outlet />
			</div>
		</div>
	)
}
