import * as React from 'react'

import { cn } from '@/lib/utils'

const filledClasses = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning-strong',
  destructive: 'bg-destructive',
} as const

type SegmentedProgressProps = Omit<React.ComponentProps<'div'>, 'children'> & {
  segments?: number
  value: number
  tone?: keyof typeof filledClasses
}

function SegmentedProgress({
  segments = 3,
  value,
  tone = 'primary',
  className,
  ...props
}: SegmentedProgressProps) {
  const total = Math.max(1, Math.floor(segments))
  const current = Math.min(
    total,
    Math.max(0, Number.isFinite(value) ? value : 0),
  )

  return (
    <div
      data-slot="segmented-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current}
      className={cn('flex w-full gap-1', className)}
      {...props}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 flex-1 rounded-full transition-colors',
            i < current ? filledClasses[tone] : 'bg-primary-soft',
          )}
        />
      ))}
    </div>
  )
}

export { SegmentedProgress }
export type { SegmentedProgressProps }
