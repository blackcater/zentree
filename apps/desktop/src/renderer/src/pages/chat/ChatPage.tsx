import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
	type PanelSize,
} from 'react-resizable-panels'

import { PanelRouter } from '../../components/chat/panel'
import { useChatPanel } from '@renderer/hooks/chat'

export interface ChatPageProps {
	threadId?: string
}

export function ChatPage({ threadId }: Readonly<ChatPageProps>) {
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'layout-thread',
		storage: localStorage,
	})
	const { panelState, setPanelWidth } = useChatPanel()

	function handlePanelResize(size: PanelSize) {
		setPanelWidth(size.inPixels)
	}

	return (
		<Group
			orientation="horizontal"
			defaultLayout={defaultLayout}
			onLayoutChanged={onLayoutChanged}
		>
			<Panel id="thread" className="bg-background rounded-lg">
				New Thread ({threadId || 'no threadId'})
			</Panel>

			<Separator className="hover:bg-primary/20 mx-px my-3 w-0.5 transition-colors" />

			{!panelState.collapsed && (
				<Panel
					id="panel"
					className="bg-background rounded-lg"
					minSize={250}
					maxSize={500}
					groupResizeBehavior="preserve-pixel-size"
					onResize={handlePanelResize}
				>
					<PanelRouter type={panelState.type} />
				</Panel>
			)}
		</Group>
	)
}
