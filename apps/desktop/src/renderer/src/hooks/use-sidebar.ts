// apps/desktop/src/renderer/src/hooks/use-sidebar.ts
import { useState, useCallback } from 'react'

export interface SidebarState {
  isOpen: boolean
  isHovering: boolean
  width: number
  setOpen: (open: boolean) => void
  setHovering: (hovering: boolean) => void
  setWidth: (width: number) => void
  toggle: () => void
}

const DEFAULT_WIDTH = 256 // px (w-64)
const MIN_WIDTH = 248
const MAX_WIDTH = 480

export function useSidebar(): SidebarState {
  const [isOpen, setIsOpen] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [width, setWidthState] = useState(DEFAULT_WIDTH)

  const setOpen = useCallback((open: boolean) => {
    setIsOpen(open)
  }, [])

  const setHovering = useCallback((hovering: boolean) => {
    setIsHovering(hovering)
  }, [])

  const setWidth = useCallback((newWidth: number) => {
    const clampedWidth = Math.min(Math.max(newWidth, MIN_WIDTH), MAX_WIDTH)
    setWidthState(clampedWidth)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    isHovering,
    width,
    setOpen,
    setHovering,
    setWidth,
    toggle,
  }
}

export { MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH }
