import { useTranslation } from 'react-i18next'

interface Props {
	onFinish: () => void
}

export function ReadyStep({ onFinish }: Readonly<Props>) {
	const { t } = useTranslation('welcome')

	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<h1 className="mb-4 text-3xl font-bold">{t('readyStep.title')}</h1>
			<p className="text-muted-foreground mb-8 max-w-md">
				{t('readyStep.description')}
			</p>
			<button
				onClick={onFinish}
				className="bg-primary text-primary-foreground rounded-lg px-6 py-3 font-medium"
			>
				{t('readyStep.finish')}
			</button>
		</div>
	)
}
