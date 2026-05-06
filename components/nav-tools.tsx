"use client"

import * as React from "react"
import { type LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavToolsProps {
  tools: {
    title: string
    url: string
    icon?: LucideIcon
  }[]
}

export function NavTools({ tools }: NavToolsProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>TOOLS</SidebarGroupLabel>
      <SidebarMenu>
        {tools.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <a href={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
