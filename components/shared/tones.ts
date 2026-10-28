export type Tone =
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'neutral'

/** Soft (tinted) background + matching foreground per semantic tone. */
export const toneSoftClasses: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-soft-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  destructive: 'bg-destructive-soft text-destructive-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  neutral: 'bg-muted text-muted-foreground',
}

/** Plain text color per semantic tone. */
export const toneTextClasses: Record<Tone | 'foreground', string> = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
  info: 'text-info',
  neutral: 'text-muted-foreground',
  foreground: 'text-foreground',
}
