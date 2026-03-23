import { useEffect, useState } from 'react'

import type { Thread } from '@/shared/ipc/types'

interface AgentStatus {
	running: string[]
	available: string[]
}

interface ChatHeaderProps {
	threadId: string | undefined
	onStop: () => void
}

export function ChatHeader({
	threadId,
	onStop,
}: Readonly<ChatHeaderProps>): React.JSX.Element {
	const [thread, setThread] = useState<Thread | null>(null)
	const [isRunning, setIsRunning] = useState(false)

	useEffect(() => {
		if (threadId) {
			loadThread()
		}
	}, [threadId])

	useEffect(() => {
		// Subscribe to agent status updates
		const unsubscribe = window.api.on('agent:status', (data) => {
			if (threadId) {
				setIsRunning((data as AgentStatus).running.includes(threadId))
			}
		})

		// Request initial status
		window.api
			.invoke<AgentStatus>('agent:status')
			.then((status) => {
				if (threadId) {
					setIsRunning(status.running.includes(threadId))
				}
			})
			.catch(console.error)

		return unsubscribe
	}, [threadId])

	async function loadThread(): Promise<void> {
		try {
			const result = await window.api.invoke<Thread>('thread:get', {
				threadId,
			})
			setThread(result)
		} catch (error) {
			console.error('Failed to load thread:', error)
		}
	}

	function getAgentBadge(agentId: string): { label: string; color: string } {
		if (agentId.includes('claude-code')) {
			return { label: 'Claude Code', color: 'bg-orange-500' }
		}
		if (agentId.includes('codex')) {
			return { label: 'Codex', color: 'bg-blue-500' }
		}
		if (agentId.includes('acmex')) {
			return { label: 'Acmex', color: 'bg-green-500' }
		}
		return { label: 'Agent', color: 'bg-gray-500' }
	}

	if (!threadId) {
		return (
			<div className="border-border flex h-14 items-center border-b px-4">
				<span className="text-muted-foreground">
					Select a thread to start chatting
				</span>
			</div>
		)
	}

	const badge = thread ? getAgentBadge(thread.agentId) : null

	return (
		<div className="border-border flex h-14 items-center justify-between border-b px-4">
			<div className="flex items-center gap-3">
				<h2 className="font-semibold">
					{thread?.title ?? 'Loading...'}
				</h2>
				{badge && (
					<span
						className={`rounded px-2 py-0.5 text-xs font-medium text-white ${badge.color}`}
					>
						{badge.label}
					</span>
				)}
				{isRunning && (
					<span className="text-muted-foreground flex items-center gap-1.5 text-sm">
						<span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
						Running
					</span>
				)}
			</div>

			{isRunning && (
				<button
					type="button"
					onClick={onStop}
					className="border-border hover:bg-accent rounded-lg border px-3 py-1.5 text-sm"
				>
					Stop
				</button>
			)}
		</div>
	)
}
