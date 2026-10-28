"use client"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

const navLinkClass =
  "h-8 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground shadow-none hover:bg-muted"

function getPageWindow(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1
  const range: (number | "ellipsis")[] = [1]
  const left = Math.max(2, current - delta)
  const right = Math.min(total - 1, current + delta)

  if (left > 2) range.push("ellipsis")
  for (let i = left; i <= right; i++) range.push(i)
  if (right < total - 1) range.push("ellipsis")
  if (total > 1) range.push(total)

  return range
}

export function PaginationControls({
  page,
  pageSize,
  total,
  pageSizeOptions = [25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemLabel = "itens",
}: {
  page: number
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  itemLabel?: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeEnd = Math.min(total, page * pageSize)
  const pageWindow = getPageWindow(page, totalPages)

  return (
    <div className="flex flex-col items-center justify-between gap-3 py-2 sm:flex-row">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>
          Mostrando{" "}
          <span className="font-bold text-foreground">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          de <span className="font-bold text-foreground">{total}</span> {itemLabel}
        </span>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
        <span className="text-xs">Exibir:</span>
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger
            size="sm"
            className="h-8 w-auto min-w-[110px] rounded-lg border-border bg-card text-xs font-semibold text-foreground shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt} por página
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {totalPages > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                aria-disabled={page <= 1}
                className={cn(navLinkClass, page <= 1 ? "pointer-events-none opacity-50" : "")}
                onClick={(e) => {
                  e.preventDefault()
                  if (page > 1) onPageChange(page - 1)
                }}
              />
            </PaginationItem>

            {pageWindow.map((entry, idx) =>
              entry === "ellipsis" ? (
                <PaginationItem key={`ellipsis-${idx}`}>
                  <PaginationEllipsis className="size-8 text-muted-foreground" />
                </PaginationItem>
              ) : (
                <PaginationItem key={entry}>
                  <PaginationLink
                    href="#"
                    isActive={entry === page}
                    className={cn(
                      "size-8 rounded-lg text-sm font-semibold",
                      entry === page
                        ? "border-transparent bg-primary text-primary-foreground shadow-none hover:bg-primary hover:text-primary-foreground"
                        : "text-muted-foreground hover:bg-primary-soft hover:text-primary",
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      onPageChange(entry)
                    }}
                  >
                    {entry}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}

            <PaginationItem>
              <PaginationNext
                href="#"
                aria-disabled={page >= totalPages}
                className={cn(navLinkClass, page >= totalPages ? "pointer-events-none opacity-50" : "")}
                onClick={(e) => {
                  e.preventDefault()
                  if (page < totalPages) onPageChange(page + 1)
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}
