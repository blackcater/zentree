import type { FC } from 'react'

interface Props {
  onFinish: () => void
}

export const ReadyStep: FC<Props> = ({ onFinish }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h1 className="text-3xl font-bold mb-4">You're All Set!</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Everything is configured and ready to go. Start building with Acme.
      </p>
      <button
        onClick={onFinish}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
      >
        Finish
      </button>
    </div>
  )
}
