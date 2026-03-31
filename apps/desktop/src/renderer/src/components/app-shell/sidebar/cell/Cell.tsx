import React from 'react'

import { cn } from '@acme-ai/ui/lib/utils'

export interface CellProps {
	className?: string
	children: React.ReactNode
	onClick?: (e: React.MouseEvent) => void
	onMouseEnter?: (e: React.MouseEvent) => void
	onMouseLeave?: (e: React.MouseEvent) => void
}

export function Cell({
	className,
	children,
	onClick,
	onMouseEnter,
	onMouseLeave,
}: Readonly<CellProps>) {
	return (
		<div
			className={cn(
				'group text-secondary-foreground flex h-8 items-center gap-1 rounded-md px-2.5 text-sm transition-colors',
				className
			)}
			onClick={onClick}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
		>
			{children}
		</div>
	)
}

export interface CellIconProps extends CellProps {
	onClick?: (e: React.MouseEvent) => void
}

export function CellIcon({
	className,
	children,
	onClick,
}: Readonly<CellIconProps>) {
	return (
		<button
			className={cn(
				'mr-1.5 flex shrink-0 items-center justify-start',
				className
			)}
			onClick={onClick}
		>
			{children}
		</button>
	)
}

export function CellName({ className, children }: Readonly<CellProps>) {
	return (
		<span className={cn('flex-1 truncate text-xs', className)}>
			{children}
		</span>
	)
}

export function CellActions({ className, children }: Readonly<CellProps>) {
	return (
		<div
			className={cn(
				'flex items-center gap-1 transition-opacity',
				className
			)}
		>
			{children}
		</div>
	)
}
