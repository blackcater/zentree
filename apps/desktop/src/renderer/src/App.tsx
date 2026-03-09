import { Button } from '@acme/ui/foundation'

function App(): React.JSX.Element {
	const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')

	return (
		<>
			<h1>Acme UI</h1>
			<Button onClick={ipcHandle}>Send IPC</Button>
		</>
	)
}

export default App
