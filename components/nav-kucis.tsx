"use client"

import Link from "next/link"
import { ChevronRight, type LucideIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface NavKucisProps {
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    items?: {
      title: string
      url: string
    }[]
  }[]
}

export function NavKucis({ items }: NavKucisProps) {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <SidebarGroup>
      <SidebarGroupLabel>KUCIS</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasSubItems = item.items && item.items.length > 0

          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem
                className="relative"
                onMouseEnter={(e) => {
                  if (isCollapsed && hasSubItems) {
                    const menuItem = e.currentTarget
                    const hoverMenu = menuItem.querySelector('.hover-submenu') as HTMLElement
                    if (hoverMenu) {
                      hoverMenu.style.display = 'block'
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (isCollapsed && hasSubItems) {
                    const menuItem = e.currentTarget
                    const hoverMenu = menuItem.querySelector('.hover-submenu') as HTMLElement
                    if (hoverMenu) {
                      hoverMenu.style.display = 'none'
                    }
                  }
                }}
              >
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          {subItem.url === "#" ? (
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          ) : (
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          )}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
                {isCollapsed && hasSubItems && (
                  <div
                    className="hover-submenu absolute left-full ml-2 top-0 z-50 hidden min-w-[200px] rounded-md border border-border bg-background p-1 shadow-lg"
                    style={{ display: 'none' }}
                  >
                    {item.items?.map((subItem) => (
                      <div key={subItem.title}>
                        {subItem.url === "#" ? (
                          <a
                            href={subItem.url}
                            className="block text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2"
                          >
                            {subItem.title}
                          </a>
                        ) : (
                          <Link
                            href={subItem.url}
                            className="block text-sm text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-3 py-2"
                          >
                            {subItem.title}
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
