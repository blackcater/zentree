import { AppStore } from './lib/store'
import { initI18n, changeLanguage } from '../i18n'

export async function initMainI18n(): Promise<void> {
	const appStore = new AppStore()
	const storedLocale = appStore.locale

	await initI18n(storedLocale)
}

export async function setMainLocale(locale: string): Promise<void> {
	const appStore = new AppStore()
	appStore.locale = locale
	await changeLanguage(locale)
}

export { changeLanguage, getCurrentLocale } from '../i18n'
