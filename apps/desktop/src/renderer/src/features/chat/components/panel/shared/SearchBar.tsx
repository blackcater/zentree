import { useCallback, useEffect, useRef, useState } from 'react'

import { SearchIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

interface SearchBarProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	debounceMs?: number
}

export function SearchBar({
	value,
	onChange,
	placeholder = 'Search...',
	debounceMs = 200,
}: SearchBarProps) {
	const [localValue, setLocalValue] = useState(value)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined
	)

	// Sync localValue with external value prop (controlled component)
	useEffect(() => {
		setLocalValue(value)
	}, [value])

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value
			setLocalValue(newValue)
			clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(() => {
				onChange(newValue)
			}, debounceMs)
		},
		[onChange, debounceMs]
	)

	return (
		<div className="flex items-center gap-1.5 px-3 py-1">
			<HugeiconsIcon
				icon={SearchIcon}
				className="text-foreground/25 h-3 w-3 shrink-0"
			/>
			<input
				type="text"
				value={localValue}
				onChange={handleChange}
				placeholder={placeholder}
				className="text-foreground/75 placeholder:text-foreground/25 w-full bg-transparent text-[11px] outline-none"
			/>
		</div>
	)
}
