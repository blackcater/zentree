interface PanelHeaderProps {
	/** Icon component from hugeicons */
	icon?: React.ComponentType<{ className?: string }>
	/** Custom icon node — takes precedence over `icon` when provided */
	iconNode?: React.ReactNode
	label: string
	/** Optional content rendered to the right of the label (badges, counts, buttons) */
	children?: React.ReactNode
	/** Show a bottom border separator. Defaults to true */
	separator?: boolean
	/** Additional className for the header container */
	className?: string
	/** Icon color class override */
	iconClass?: string
}

export function PanelHeader({
	icon: Icon,
	iconNode,
	label,
	children,
	separator = true,
	className = 'px-3 py-2',
	iconClass = 'text-muted-foreground',
}: PanelHeaderProps) {
	return (
		<>
			<div className={`flex items-center gap-1.5 ${className}`}>
				{iconNode ??
					(Icon && (
						<Icon className={`h-3 w-3 shrink-0 ${iconClass}`} />
					))}
				<span className="text-muted-foreground/70 text-[10px] font-semibold tracking-wider uppercase">
					{label}
				</span>
				{children && (
					<div className="ms-auto flex items-center gap-1">
						{children}
					</div>
				)}
			</div>
			{separator && (
				<div className="mx-2">
					<div className="bg-foreground/[0.06] h-px" />
				</div>
			)}
		</>
	)
}
