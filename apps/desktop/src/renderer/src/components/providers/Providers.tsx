import { TooltipProvider } from '@acme-ai/ui/foundation'
import { Provider as JotaiProvider } from 'jotai/react'

import { ThemeProvider } from './ThemeProvider'

export interface ProvidersProps {
	children: React.ReactNode
}

export function Providers({ children }: Readonly<ProvidersProps>) {
	return (
		<JotaiProvider>
			<ThemeProvider>
				<TooltipProvider>{children}</TooltipProvider>
			</ThemeProvider>
		</JotaiProvider>
	)
}
