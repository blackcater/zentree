import { StrictMode } from 'react'

import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'

import { Providers } from './components/providers'
import { createRouter } from './router'
import { initRendererI18n } from './i18n/client'
import '@acme-ai/ui/styles/globals.css'

const router = createRouter()

// Initialize i18n before rendering
async function bootstrap() {
	// Get stored locale from main process via RPC
	const storedLocale = await window.api.store.getLocale()
	await initRendererI18n(storedLocale || 'en')

	createRoot(document.getElementById('root')!).render(
		<StrictMode>
			<Providers>
				<RouterProvider router={router} />
			</Providers>
		</StrictMode>
	)
}

bootstrap()
