import { ShieldIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAtomValue } from 'jotai'

import { pendingPermissionAtom } from '@renderer/atoms/chat-atoms'
import { useChatSession } from '@renderer/hooks/useChatSession'

export function PermissionDialog() {
	const pendingPermission = useAtomValue(pendingPermissionAtom)
	const { respondPermission } = useChatSession()

	if (!pendingPermission) return null

	const handleApprove = () => {
		respondPermission(pendingPermission.id, true)
	}

	const handleDeny = () => {
		respondPermission(pendingPermission.id, false)
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-background w-full max-w-md rounded-lg p-6 shadow-lg">
				<div className="mb-4 flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
						<HugeiconsIcon
							icon={ShieldIcon}
							className="h-5 w-5 text-amber-600"
						/>
					</div>
					<div>
						<h2 className="text-lg font-semibold">
							Permission Required
						</h2>
						<p className="text-muted-foreground text-sm">
							{pendingPermission.type.replace('_', ' ')}
						</p>
					</div>
				</div>

				<div className="bg-muted/50 mb-4 rounded-lg p-3">
					<p className="font-mono text-sm">
						{pendingPermission.resource}
					</p>
				</div>

				{pendingPermission.reason && (
					<p className="text-muted-foreground mb-4 text-sm">
						{pendingPermission.reason}
					</p>
				)}

				<div className="flex gap-3">
					<button
						onClick={handleDeny}
						className="border-border hover:bg-muted/50 flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
					>
						Deny
					</button>
					<button
						onClick={handleApprove}
						className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
					>
						Allow
					</button>
				</div>
			</div>
		</div>
	)
}
