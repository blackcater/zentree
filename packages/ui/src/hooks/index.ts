import { useState } from 'react'

export function useDemo() {
	const [count, setCount] = useState(0)
	return {
		count,
		setCount,
	}
}
