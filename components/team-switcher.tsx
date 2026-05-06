import * as React from "react"
import { Shield } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const [activeTeam] = React.useState(teams[0])
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          tooltip="Highest Unique Batch · ACADEMY DASHBOARD"
          className={cn(
            "data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <Shield className="size-5 shrink-0" />
          ) : (
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                Highest Unique Batch
              </span>
              <span className="truncate text-xs">ACADEMY DASHBOARD</span>
            </div>
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
