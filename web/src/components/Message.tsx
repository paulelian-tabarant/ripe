import type { ReactElement, ReactNode } from 'react'

type MessageVariant = 'info' | 'warning' | 'error'

interface MessageProps {
  variant: MessageVariant
  children: ReactNode
}

const VARIANT_CLASSES: Record<MessageVariant, string> = {
  info: 'border-zinc-800 bg-zinc-900 text-zinc-400',
  warning: 'border-amber-900 bg-amber-950 text-amber-400',
  error: 'border-red-900 bg-red-950 text-red-400',
}

export function Message({ variant, children }: MessageProps): ReactElement {
  return (
    <p
      role={variant === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-sm ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </p>
  )
}
