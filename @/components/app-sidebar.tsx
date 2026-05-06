import * as React from "react"
import {
  BookOpen,
  Bot,
  Building2,
  Frame,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import useTeams from "hooks/useTeams"

// This is sample data.
const data = {
  navMain: [
    {
      title: "DASHBOARD",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "DASHBOARD",
          url: "/dashboard",
        },
        {
          title: "Playground",
          url: "/pg",
        },
      ],
    },
    {
      title: "RANKINGS",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "TOTAL RANKINGS",
          url: "#",
        },
        {
          title: "MACHINE RANKINGS",
          url: "#",
        },
        {
          title: "PLAYGROUND RANKINGS",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  projects: [
    {
      title: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      title: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      title: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { teams, isLoading } = useTeams()

  // teams 데이터를 TeamSwitcher가 기대하는 형식으로 변환
  const teamsData = teams && teams.length > 0
    ? teams.map((team) => ({
        name: team.name,
        logo: Building2, // 기본 아이콘 사용
        plan: "Team", // 기본 플랜
      }))
    : [
        {
          name: "Default Team",
          logo: Building2,
          plan: "Team",
        },
      ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teamsData} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavProjects projects={data.projects} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
