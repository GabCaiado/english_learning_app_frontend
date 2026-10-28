import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

type PageContainerProps = ComponentProps<"div"> & {
  size?: "default" | "narrow"
}

export function PageContainer({ size = "default", className, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 py-6 lg:px-10",
        size === "narrow" ? "max-w-5xl" : "max-w-[1400px]",
        className,
      )}
      {...props}
    />
  )
}
