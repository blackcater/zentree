import {
	Group,
	Panel,
	Separator,
	useDefaultLayout,
	type PanelSize,
} from 'react-resizable-panels'

import { useAtom } from 'jotai'

import { panelAtom } from '@renderer/atoms'

import { PanelRouter } from './panel'

export interface ChatProps {
	threadId?: string
}

export function Chat({ threadId }: Readonly<ChatProps>) {
	const { defaultLayout, onLayoutChanged } = useDefaultLayout({
		id: 'layout-thread',
		storage: localStorage,
	})
	const [panelState, setPanelState] = useAtom(panelAtom)

	function handlePanelResize(size: PanelSize) {
		setPanelState((prev) => ({ ...prev, width: size.inPixels }))
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
					minSize={300}
					maxSize={500}
					onResize={handlePanelResize}
				>
					<PanelRouter type={panelState.type} />
				</Panel>
			)}
		</Group>
	)
}
