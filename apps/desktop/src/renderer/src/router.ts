import {
	createRouter as createTanStackRouter,
	createHashHistory,
} from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export function createRouter() {
	return createTanStackRouter({
		routeTree,
		defaultPreload: 'intent',
		history: createHashHistory(),
	})
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof createRouter>
	}
}
