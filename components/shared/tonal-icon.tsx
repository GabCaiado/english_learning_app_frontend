import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { toneSoftClasses, type Tone } from './tones'

const sizeClasses = {
  sm: 'size-8 rounded-lg [&_svg]:size-4',
  md: 'size-10 rounded-lg [&_svg]:size-5',
  lg: 'size-12 rounded-xl [&_svg]:size-6',
} as const

type TonalIconProps = React.ComponentProps<'span'> & {
  icon?: LucideIcon
  tone?: Tone | 'solid'
  size?: keyof typeof sizeClasses
  iconClassName?: string
}

function TonalIcon({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  iconClassName,
  className,
  children,
  ...props
}: TonalIconProps) {
  return (
    <span
      data-slot="tonal-icon"
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        sizeClasses[size],
        tone === 'solid'
          ? 'bg-primary text-primary-foreground'
          : toneSoftClasses[tone],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className={iconClassName} /> : children}
    </span>
  )
}

export { TonalIcon }
export type { TonalIconProps }
