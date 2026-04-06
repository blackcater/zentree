import { Chat } from '@renderer/components/chat/Chat'

import { Route } from './$threadId'

export function ThreadPage(): React.JSX.Element | null {
	const { threadId } = Route.useParams()

	return <Chat threadId={threadId} />
}
