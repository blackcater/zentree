import { StrictMode } from 'react'

import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'

import { Providers } from './components/providers'
import { createRouter } from './router'
import '@acme-ai/ui/styles/globals.css'

const router = createRouter()

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<Providers>
			<RouterProvider router={router} />
		</Providers>
	</StrictMode>
)
