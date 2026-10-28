import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const pillVariants = cva(
  'inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-transparent font-semibold leading-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary-soft text-primary-soft-foreground',
        success: 'bg-success-soft text-success-soft-foreground',
        warning: 'bg-warning-soft text-warning-soft-foreground',
        destructive: 'bg-destructive-soft text-destructive-soft-foreground',
        info: 'bg-info-soft text-info-soft-foreground',
        neutral: 'bg-muted text-muted-foreground',
        solid: 'bg-primary text-primary-foreground',
        outline: 'border-border bg-card text-foreground',
      },
      size: {
        sm: 'h-5 gap-1 px-2 text-[11px] [&_svg]:size-3',
        md: 'h-6 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type PillProps = React.ComponentProps<'span'> &
  VariantProps<typeof pillVariants> & {
    asChild?: boolean
    icon?: LucideIcon
    dot?: boolean
  }

function Pill({
  className,
  variant,
  size,
  asChild = false,
  icon: Icon,
  dot = false,
  children,
  ...props
}: PillProps) {
  const classes = cn(pillVariants({ variant, size }), className)

  // Slot requires a single child element; icon/dot are not injected in asChild mode.
  if (asChild) {
    return (
      <Slot data-slot="pill" className={classes} {...props}>
        {children}
      </Slot>
    )
  }

  return (
    <span data-slot="pill" className={classes} {...props}>
      {dot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {Icon ? <Icon aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

const StatusBadge = Pill

export { Pill, StatusBadge, pillVariants }
export type { PillProps }
