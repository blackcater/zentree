import { createContext, useContext, useState, type ReactNode } from 'react'

interface HeaderContent {
	title?: ReactNode
	actions?: ReactNode[]
}

interface HeaderContextValue {
	content: HeaderContent
	setContent: (content: HeaderContent) => void
}

const HeaderContext = createContext<HeaderContextValue>({
	content: {},
	setContent: () => {},
})

export function HeaderProvider({ children }: { children: ReactNode }) {
	const [content, setContent] = useState<HeaderContent>({})

	return (
		<HeaderContext.Provider value={{ content, setContent }}>
			{children}
		</HeaderContext.Provider>
	)
}

export function useHeader(): HeaderContextValue {
	return useContext(HeaderContext)
}
