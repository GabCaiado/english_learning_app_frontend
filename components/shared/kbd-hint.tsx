import * as React from 'react'

import { Kbd } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

type KbdHintProps = {
  children: React.ReactNode
  label?: React.ReactNode
  className?: string
  kbdClassName?: string
}

function KbdHint({ children, label, className, kbdClassName }: KbdHintProps) {
  const hasLabel = label !== undefined && label !== null && label !== false

  const key = (
    <Kbd
      className={cn(
        'h-5 min-w-5 rounded-md border border-border bg-card px-1.5 font-mono text-[10px] font-medium text-foreground shadow-[0_1px_0_0_var(--border)]',
        kbdClassName,
        !hasLabel && className,
      )}
    >
      {children}
    </Kbd>
  )

  if (!hasLabel) return key

  return (
    <span
      data-slot="kbd-hint"
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className,
      )}
    >
      {key}
      {label}
    </span>
  )
}

export { KbdHint }
export type { KbdHintProps }
