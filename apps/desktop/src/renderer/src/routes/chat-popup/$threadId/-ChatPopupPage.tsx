import { Route } from './index'

export function ChatPopupPage() {
	const { threadId } = Route.useParams()

	return <div>Popup Thread View: {threadId}</div>
}
