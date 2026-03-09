import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/message-port'

import type { ORPCClient } from '@/main/orpc/router'

function createClient(): ORPCClient {
	// Create MessageChannel for IPC communication
	const { port1: clientPort, port2: serverPort } = new MessageChannel()

	// Send server port to main process via preload
	window.postMessage('start-orpc-client', '*', [serverPort])

	// Create RPC link with the client port
	const link = new RPCLink({
		port: clientPort,
	})

	// Start the port
	clientPort.start()

	return createORPCClient(link)
}

// Create type-safe client
export const orpc = createClient()
