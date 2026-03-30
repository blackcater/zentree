import type { FC } from 'react'

interface Props {
  onNext: () => void
}

export const WelcomeStep: FC<Props> = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-3xl font-bold mb-4">Welcome to Acme</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Your AI-powered development environment. Let's get you set up in a few steps.
      </p>
      <button
        onClick={onNext}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
      >
        Get Started
      </button>
    </div>
  )
}
