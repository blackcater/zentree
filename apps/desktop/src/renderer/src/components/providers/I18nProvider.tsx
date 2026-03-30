import type { FC } from 'react'
import { I18nextProvider } from 'react-i18next'

import { i18n } from '../../i18n/client'

export interface I18nProviderProps {
	children: React.ReactNode
}

export const I18nProvider: FC<I18nProviderProps> = ({ children }) => {
	return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
