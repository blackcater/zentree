import { useEffect } from 'react'

import { useAtom } from 'jotai'

import { panelAtom } from '@renderer/atoms/panel'
import { Chat } from '@renderer/components/chat/Chat'
import { useHeader } from '@renderer/contexts/HeaderContext'

import { Route } from './$threadId'

export function ThreadPage(): React.JSX.Element | null {
	const { threadId } = Route.useParams()
	const [panel, setPanel] = useAtom(panelAtom)
	const { setContent } = useHeader()

	useEffect(() => {
		setContent({
			title: `Thread: ${threadId}`,
			actions: [
				<button
					key="panel-toggle"
					type="button"
					onClick={() =>
						setPanel((prev) => ({
							...prev,
							collapsed: !prev.collapsed,
						}))
					}
					className="px-2 py-1 text-sm"
				>
					{panel.collapsed ? '展开' : '折叠'}
				</button>,
			],
		})
		return () => setContent({})
	}, [threadId, panel.collapsed, setPanel, setContent])

	if (!threadId) {
		return null
	}

	return <Chat threadId={threadId} />
}
