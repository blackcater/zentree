import { useTranslation } from 'react-i18next'

import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@/i18n'

export function SettingsPage() {
	const { t, i18n } = useTranslation('settings')

	const handleLocaleChange = async (
		locale: (typeof SUPPORTED_LOCALES)[number]
	) => {
		await i18n.changeLanguage(locale)
		// Persist to store via IPC
		window.api.store.setLocale(locale)
	}

	return (
		<div className="p-4">
			<h1 className="mb-4 text-2xl font-bold">{t('title')}</h1>
			<div className="space-y-4">
				<div className="rounded-lg border p-4">
					<h2 className="mb-2 font-medium">{t('language.title')}</h2>
					<p className="text-muted-foreground mb-2 text-sm">
						{t('language.description')}
					</p>
					<div className="flex gap-2">
						{SUPPORTED_LOCALES.map((locale) => (
							<button
								key={locale}
								onClick={() => handleLocaleChange(locale)}
								className={`rounded-md px-3 py-1.5 text-sm ${
									i18n.language === locale
										? 'bg-primary text-primary-foreground'
										: 'bg-secondary text-secondary-foreground'
								}`}
							>
								{LOCALE_LABELS[locale]}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	)
}
