import { forwardRef } from 'react'

export interface Tab {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onSelectTab: (tabId: string) => void
  headerIcon?: React.ComponentType<{ className?: string }>
  headerLabel?: string
  headerActions?: React.ReactNode
  tabMaxWidth?: string
  activeClass?: string
  inactiveClass?: string
}

export const TabBar = forwardRef<HTMLDivElement, TabBarProps>(
  function TabBar(
    {
      tabs,
      activeTabId,
      onSelectTab,
      headerIcon: HeaderIcon,
      headerLabel,
      headerActions,
      tabMaxWidth = 'max-w-24',
      activeClass = 'bg-foreground/[0.08] text-foreground/80',
      inactiveClass = 'text-foreground/35 hover:text-foreground/55 hover:bg-foreground/[0.04]',
    },
    ref
  ) {
    return (
      <div ref={ref} className="flex flex-col">
        {/* Tab header with optional icon/label/actions */}
        {(HeaderIcon || headerLabel || headerActions) && (
          <div className="flex items-center gap-1.5 px-3 py-2">
            {HeaderIcon && <HeaderIcon className="h-3 w-3 shrink-0" />}
            {headerLabel && (
              <span className="text-[10px] font-semibold tracking-wider uppercase">
                {headerLabel}
              </span>
            )}
            {headerActions && (
              <div className="ms-auto flex items-center gap-1">
                {headerActions}
              </div>
            )}
          </div>
        )}

        {/* Tab list */}
        <div className="flex items-center gap-0.5 px-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`
                  flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium
                  transition-colors duration-75
                  ${isActive ? activeClass : inactiveClass}
                `}
                style={{ maxWidth: tabMaxWidth }}
                title={tab.label}
              >
                {tab.icon && <tab.icon className="h-3 w-3 shrink-0" />}
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Separator */}
        <div className="mx-2 mt-1">
          <div className="h-px bg-foreground/[0.06]" />
        </div>
      </div>
    )
  }
)
