import { memo } from 'react'

interface TreeNodeIndentProps {
	depth: number
	indentSize?: number
}

export const TreeNodeIndent = memo(function TreeNodeIndent({
	depth,
	indentSize = 16,
}: TreeNodeIndentProps) {
	if (depth === 0) return null

	return (
		<span
			className="inline-block"
			style={{ width: depth * indentSize, height: '16px' }}
		/>
	)
})
