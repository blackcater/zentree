import { NavigationButtons } from './NavigationButtons'

export function AppHeader(): React.JSX.Element {
	return (
		<div className="border-border flex h-10 w-full shrink-0 items-center gap-2 border-b px-4">
			<NavigationButtons />
		</div>
	)
}
