import { useState } from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { AgentStep } from './steps/AgentStep'
import { ProviderStep } from './steps/ProviderStep'
import { ReadyStep } from './steps/ReadyStep'
import { VaultStep } from './steps/VaultStep'
import { WelcomeStep } from './steps/WelcomeStep'

const steps = [
	{ Component: WelcomeStep, props: {} },
	{ Component: AgentStep, props: {} },
	{ Component: ProviderStep, props: {} },
	{ Component: VaultStep, props: {} },
	{ Component: ReadyStep, props: {} },
]

export function Wizard() {
	const [step, setStep] = useState(0)

	const handleNext = () => {
		if (step < steps.length - 1) {
			setStep((s) => s + 1)
		}
	}

	const handleFinish = async () => {
		console.log('Finish wizard', window.api)

		try {
			await window.api.store.set('firstLaunchDone', true)
			await window.api.rpc.call(
				'/system/window/create-vault',
				'default-vault'
			)
			await window.api.rpc.call('/system/window/close', 'welcome')
		} catch (error) {
			console.error('Failed to finish wizard:', error)
		}
	}

	const { Component } = steps[step]

	return (
		<div className="h-full">
			<AnimatePresence mode="wait">
				<motion.div
					key={step}
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.2 }}
					className="h-full"
				>
					<Component onNext={handleNext} onFinish={handleFinish} />
				</motion.div>
			</AnimatePresence>
		</div>
	)
}
