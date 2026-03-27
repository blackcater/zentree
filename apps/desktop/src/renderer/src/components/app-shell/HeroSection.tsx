import { cn } from '@acme-ai/ui/lib/utils'
import { Brain, ChevronDown } from 'lucide-react'

interface HeroSectionProps {
	className?: string
	projectName?: string // default: 'typed'
}

export function HeroSection({ className, projectName = 'typed' }: HeroSectionProps) {
	return (
		<section
			className={cn(
				'flex flex-col items-center justify-center h-full gap-4',
				className
			)}
		>
			{/* Brain icon */}
			<Brain className="h-12 w-12 text-foreground" />

			{/* Main title */}
			<h1 className="text-3xl font-bold text-foreground">开始构建</h1>

			{/* Subtitle with project context */}
			<button
				type="button"
				className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<span>{projectName}</span>
				<ChevronDown className="h-4 w-4" />
			</button>
		</section>
	)
}
