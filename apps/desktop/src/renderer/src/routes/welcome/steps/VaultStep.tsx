import type { FC } from 'react'

interface Props {
  onNext: () => void
}

export const VaultStep: FC<Props> = ({ onNext }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-3xl font-bold mb-4">Set Up Vault</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Configure your vault storage. This step is under construction.
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
