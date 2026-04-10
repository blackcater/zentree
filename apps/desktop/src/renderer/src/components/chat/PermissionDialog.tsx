import { ShieldIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useAtomValue } from 'jotai'

import { pendingPermissionAtom } from '@renderer/atoms'
import { useChatSession } from '@renderer/hooks'

export function PermissionDialog() {
	const pendingPermission = useAtomValue(pendingPermissionAtom)
	const { respondPermission } = useChatSession()

	if (!pendingPermission) return null

	const handleApprove = () => {
		respondPermission(pendingPermission.requestId, true)
	}

	const handleDeny = () => {
		respondPermission(pendingPermission.requestId, false)
	}

	const handleAlwaysAllow = () => {
		respondPermission(
			pendingPermission.requestId,
			true,
			pendingPermission.alwaysPatterns[0]
		)
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
							{pendingPermission.tool}
						</p>
					</div>
				</div>

				<div className="mb-4 space-y-3">
					<div className="bg-muted/50 rounded-lg p-3">
						<p className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
							Parameters
						</p>
						<pre className="font-mono text-sm">
							{JSON.stringify(pendingPermission.params, null, 2)}
						</pre>
					</div>

					{pendingPermission.patterns.length > 0 && (
						<div className="bg-muted/50 rounded-lg p-3">
							<p className="text-muted-foreground mb-1 text-xs tracking-wider uppercase">
								Affected Patterns
							</p>
							<div className="flex flex-wrap gap-1">
								{pendingPermission.patterns.map((pattern) => (
									<span
										key={pattern}
										className="bg-muted rounded px-2 py-0.5 text-xs"
									>
										{pattern}
									</span>
								))}
							</div>
						</div>
					)}
				</div>

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
					<button
						onClick={handleAlwaysAllow}
						className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600/90"
					>
						Always Allow
					</button>
				</div>
			</div>
		</div>
	)
}
