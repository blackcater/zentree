import { createFileRoute } from '@tanstack/react-router'

import { WelcomePage } from './-WelcomePage'

export const Route = createFileRoute('/welcome/')({
	component: WelcomePage,
})
