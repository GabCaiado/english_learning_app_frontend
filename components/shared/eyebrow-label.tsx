import * as React from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

type EyebrowLabelProps = React.HTMLAttributes<HTMLElement> & {
  as?: 'p' | 'span' | 'div' | 'h2' | 'h3'
  tone?: 'muted' | 'primary'
  icon?: LucideIcon
}

function EyebrowLabel({
  as: Comp = 'p',
  tone = 'muted',
  icon: Icon,
  className,
  children,
  ...props
}: EyebrowLabelProps) {
  return (
    <Comp
      data-slot="eyebrow-label"
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em]',
        tone === 'primary' ? 'text-primary' : 'text-muted-foreground',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {children}
    </Comp>
  )
}

export { EyebrowLabel }
export type { EyebrowLabelProps }
