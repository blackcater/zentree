import { StrictMode } from 'react'

import { RouterProvider } from '@tanstack/react-router'
import { createRoot } from 'react-dom/client'

import { Providers } from './components/providers'
import { initRendererI18n } from './lib/i18n'
import { createRouter } from './router'
import '@acme-ai/ui/styles/globals.css'

const router = createRouter()

// Initialize i18n before rendering
async function bootstrap() {
	// Get stored locale from main process via RPC
	try {
		const storedLocale = await window.api.app.getLocale()
		await initRendererI18n(storedLocale || 'en')
	} catch (err) {
		console.error('Error getting locale:', err)
	}

	createRoot(document.getElementById('root')!).render(
		<StrictMode>
			<Providers>
				<RouterProvider router={router} />
			</Providers>
		</StrictMode>
	)
}

bootstrap()
