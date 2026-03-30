import { createRootRoute, createRoute } from '@tanstack/react-router'

import { RootComponent } from './routes/__root'
import { RpcDebugPage } from './routes/rpc-debug'
import { WelcomePage } from './routes/welcome'

// Root route
export const rootRoute = createRootRoute({
	component: RootComponent,
})

// RPC Debug route
export const rpcDebugRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/rpc-debug',
	component: RpcDebugPage,
})

// Welcome route
export const welcomeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/welcome',
	component: WelcomePage,
})

// Create route tree
export const routeTree = rootRoute.addChildren([rpcDebugRoute, welcomeRoute])
