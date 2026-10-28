import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { EyebrowLabel } from './eyebrow-label'
import { TonalIcon } from './tonal-icon'
import { toneTextClasses, type Tone } from './tones'

type StatCardProps = {
  eyebrow: React.ReactNode
  value: React.ReactNode
  unit?: React.ReactNode
  subtitle?: React.ReactNode
  subtitleTone?: Tone | 'foreground'
  icon?: LucideIcon
  iconTone?: Tone | 'solid'
  surface?: 'default' | 'warning'
  size?: 'default' | 'compact'
  divider?: boolean
  valueClassName?: string
  children?: React.ReactNode
} & Omit<React.ComponentProps<'div'>, 'children'>

function StatCard({
  eyebrow,
  value,
  unit,
  subtitle,
  subtitleTone = 'primary',
  icon,
  iconTone = 'primary',
  surface = 'default',
  size = 'default',
  divider = true,
  valueClassName,
  className,
  children,
  ...props
}: StatCardProps) {
  const shell = cn(
    'flex h-full rounded-xl border border-border bg-card text-card-foreground shadow-card',
    surface === 'warning' && 'border-warning-strong/40 bg-warning-soft/40',
  )

  if (size === 'compact') {
    return (
      <div
        data-slot="stat-card"
        data-size="compact"
        className={cn(shell, 'flex-row items-center gap-3 px-4 py-3', className)}
        {...props}
      >
        {icon ? <TonalIcon icon={icon} tone={iconTone} size="md" /> : null}
        <div className="flex min-w-0 flex-col">
          <EyebrowLabel>{eyebrow}</EyebrowLabel>
          <p
            className={cn(
              'mt-1 text-lg font-extrabold leading-none',
              valueClassName,
            )}
          >
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-normal">{unit}</span>
            ) : null}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      data-slot="stat-card"
      className={cn(shell, 'flex-col p-5', className)}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <EyebrowLabel>{eyebrow}</EyebrowLabel>
          <p
            className={cn(
              'mt-2 text-2xl font-extrabold leading-tight tracking-tight',
              valueClassName,
            )}
          >
            {value}
            {unit ? (
              <span className="ml-1 text-lg font-normal">{unit}</span>
            ) : null}
          </p>
          {subtitle ? (
            <div
              className={cn(
                'mt-1.5 flex items-start gap-1 text-xs font-semibold [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0',
                toneTextClasses[subtitleTone],
              )}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
        {icon ? <TonalIcon icon={icon} tone={iconTone} /> : null}
      </div>
      {children ? (
        <div className="mt-auto pt-4">
          <div className={cn(divider && 'border-t border-border pt-4')}>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { StatCard }
export type { StatCardProps }
