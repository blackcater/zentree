import {
  Folder01Icon,
  FolderOpenIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  MoreHorizontalIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@acme-ai/ui/foundation'

import { Cell, CellIcon, CellName, CellActions } from './Cell'
import { cn } from '@acme-ai/ui/lib/utils'

export interface FolderCellProps {
  id: string
  title: string
  isExpanded: boolean
  onToggle: (id: string) => void
  onAddThread?: (folderId: string) => void
  onRename?: (folderId: string) => void
  onDelete?: (folderId: string) => void
  className?: string
}

export function FolderCell({
  id,
  title,
  isExpanded,
  onToggle,
  onAddThread,
  onRename,
  onDelete,
  className,
}: FolderCellProps) {
  return (
    <Cell className={cn('font-medium text-foreground', className)}>
      {/* 左侧图标 */}
      <CellIcon
        className="cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(id)
        }}
      >
        {/* hover 展开/折叠图标 */}
        <HugeiconsIcon
          icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
          className="absolute h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
        />
        {/* 实际的 folder 图标 */}
        <HugeiconsIcon
          icon={isExpanded ? FolderOpenIcon : Folder01Icon}
          className="h-4 w-4 text-foreground"
        />
      </CellIcon>

      {/* 名称 */}
      <CellName>{title}</CellName>

      {/* 操作区 */}
      <CellActions>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-6 w-6">
              <HugeiconsIcon icon={MoreHorizontalIcon} className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRename?.(id)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete?.(id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation()
            onAddThread?.(id)
          }}
          className="h-6 w-6"
        >
          <HugeiconsIcon icon={PlusSignIcon} className="h-3 w-3" />
        </Button>
      </CellActions>
    </Cell>
  )
}