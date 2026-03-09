import { Button } from '@acme/ui/foundation'
import { ClaudeCode } from '@acme/ui/icons/agent'
import { Warp } from '@acme/ui/icons/app'

function App(): React.JSX.Element {
	const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

	return (
		<>
			<h1>Acme UI</h1>
			<Button onClick={ipcHandle}>Send IPC</Button>
			<ClaudeCode.Color size={32} />
			<Warp width={32} height={32} />
		</>
	)
}

export default App
