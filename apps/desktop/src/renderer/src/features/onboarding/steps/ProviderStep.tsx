import { useTranslation } from 'react-i18next'

interface Props {
	onNext: () => void
}

export function ProviderStep({ onNext }: Readonly<Props>) {
	const { t } = useTranslation('welcome')

	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<h1 className="mb-4 text-3xl font-bold">
				{t('providerStep.title')}
			</h1>
			<p className="text-muted-foreground mb-8 max-w-md">
				{t('providerStep.description')}
			</p>
			<button
				onClick={onNext}
				className="bg-primary text-primary-foreground rounded-lg px-6 py-3 font-medium"
			>
				{t('providerStep.next')}
			</button>
		</div>
	)
}
