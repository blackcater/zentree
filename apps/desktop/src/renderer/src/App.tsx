import { useState } from 'react'

import { Button } from '@acme/ui/foundation'
import { ClaudeCode } from '@acme/ui/icons/agent'
import { Warp } from '@acme/ui/icons/app'

import { orpc } from './utils'

function App(): React.JSX.Element {
	const ipcHandle = (): void => window.electron.ipcRenderer.send('ping')
	const [result, setResult] = useState<string>('')

	const orpcHandle = async (): Promise<void> => {
		const response = await orpc.ping()
		setResult(response)
	}

	return (
		<>
			<h1>Acme UI</h1>
			<Button onClick={ipcHandle}>Send IPC</Button>
			<Button onClick={orpcHandle}>Test oRPC</Button>
			<p>Result: {result}</p>
			<ClaudeCode.Color size={32} />
			<Warp width={32} height={32} />
		</>
	)
}

export default App
