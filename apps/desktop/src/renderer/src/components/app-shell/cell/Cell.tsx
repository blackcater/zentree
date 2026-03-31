import { cn } from '@acme-ai/ui/lib/utils'
import React from 'react'

export interface CellProps {
  className?: string
  children: React.ReactNode
}

export function Cell({ className, children }: CellProps) {
  return (
    <div
      className={cn(
        'group flex h-9 cursor-pointer items-center gap-2 rounded-md px-2',
        'text-sm text-muted-foreground transition-colors',
        'hover:bg-white/5 hover:text-foreground',
        'active:bg-white/10',
        className
      )}
    >
      {children}
    </div>
  )
}

export interface CellIconProps extends CellProps {
  onClick?: (e: React.MouseEvent) => void
}

export function CellIcon({ className, children, onClick }: CellIconProps) {
  return (
    <div
      className={cn('flex h-8 w-8 shrink-0 items-center justify-center', className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function CellName({ className, children }: CellProps) {
  return (
    <span className={cn('flex-1 truncate text-[13px]', className)}>
      {children}
    </span>
  )
}

export function CellActions({ className, children }: CellProps) {
  return (
    <div className={cn('flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity', className)}>
      {children}
    </div>
  )
}
