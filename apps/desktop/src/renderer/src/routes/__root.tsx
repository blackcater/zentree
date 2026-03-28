import { Outlet } from '@tanstack/react-router'

export function RootComponent(): React.JSX.Element {
	return (
		<div className="bg-noise flex h-screen">
			<main className="flex flex-1 flex-col">
				<Outlet />
			</main>
		</div>
	)
}
