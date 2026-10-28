"use client"

import { useCallback, useRef, useState, type ReactNode } from "react"
import { AlertTriangle, Flag, Trash2, type LucideIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ConfirmTone = "default" | "destructive" | "warning"

export interface ConfirmOptions {
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  icon?: LucideIcon
}

const toneStyles: Record<ConfirmTone, { icon: LucideIcon; badge: string; button: "default" | "destructive" }> = {
  default: { icon: AlertTriangle, badge: "bg-primary-soft text-primary", button: "default" },
  destructive: { icon: Trash2, badge: "bg-destructive-soft text-destructive", button: "destructive" },
  warning: { icon: Flag, badge: "bg-warning-soft text-warning", button: "default" },
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

/** Controlled confirmation modal (delete, report translation as wrong, etc). */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "default",
  icon,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const style = toneStyles[tone]
  const Icon = icon ?? style.icon

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialogContent className="max-w-md rounded-panel p-6">
        <AlertDialogHeader className="items-center gap-3 text-center sm:text-center">
          <span className={cn("flex size-12 items-center justify-center rounded-full", style.badge)}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
          <AlertDialogTitle className="text-lg font-bold">{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2 gap-2 sm:justify-center">
          <AlertDialogCancel disabled={loading} className="sm:min-w-28">
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            variant={style.button}
            disabled={loading}
            onClick={onConfirm}
            className="sm:min-w-28"
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * Promise-based replacement for window.confirm.
 *   const { confirm, dialog } = useConfirm()
 *   if (!(await confirm({ title: "Excluir?", tone: "destructive" }))) return
 *   ...render {dialog} once in the component tree
 */
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const settle = useCallback((value: boolean) => {
    resolver.current?.(value)
    resolver.current = null
    setOptions(null)
  }, [])

  const confirm = useCallback((opts: ConfirmOptions) => {
    resolver.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
      setOptions(opts)
    })
  }, [])

  const dialog = (
    <ConfirmDialog
      {...(options ?? { title: "" })}
      open={options !== null}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  )

  return { confirm, dialog }
}
