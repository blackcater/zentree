import { useCallback, useEffect, useRef, useState } from 'react'
import { HugeiconsSearch } from '@hugeicons/react'

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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

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
      <HugeiconsSearch className="h-3 w-3 shrink-0 text-foreground/25" />
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full bg-transparent text-[11px] text-foreground/75 outline-none placeholder:text-foreground/25"
      />
    </div>
  )
}
