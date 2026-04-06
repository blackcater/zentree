import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vault/$vaultId/extensions')({
	component: ExtensionsPage,
})

function ExtensionsPage() {
	return (
		<div className="flex h-full items-center justify-center">
			Extensions (Placeholder)
		</div>
	)
}
