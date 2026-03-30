import type { FC } from 'react'

interface Props {
  onNext: () => void
}

export const AgentStep: FC<Props> = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-3xl font-bold mb-4">Configure Your Agent</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Set up your AI agent preferences. This step is under construction.
      </p>
      <button
        onClick={onNext}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
      >
        Next
      </button>
    </div>
  )
}
