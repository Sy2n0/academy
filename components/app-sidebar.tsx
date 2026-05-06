import * as React from "react"
import {
  Building2,
  ChartNoAxesCombined,
  ChefHat,
  Cloud,
  GalleryVertical,
  LandPlot,
  LayoutDashboard,
  Satellite,
  Server,
  Swords,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavTools } from "@/components/nav-tools"
import { NavKucis } from "@/components/nav-kucis"
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
      title: "CONTENTS",
      url: "#",
      icon: LayoutDashboard,
      isActive: true,
      items: [
        {
          title: "DASHBOARD",
          url: "/dashboard",
        },
        {
          title: "PLAYGROUND",
          url: "/playground",
        },
      ],
    },
    {
      title: "RANKINGS",
      url: "#",
      icon: ChartNoAxesCombined,
      items: [
        {
          title: "TOTAL RANKINGS",
          url: "/rankings",
        },
        {
          title: "MACHINE RANKINGS",
          url: "/rankings/machine",
        },
        {
          title: "PLAYGROUND RANKINGS",
          url: "/rankings/playground",
        },
      ],
    },
  ],
  practice: [
    {
      title: "ARENA",
      url: "#",
      icon: LandPlot,
      items: [
        {
          title: "MACHINES",
          url: "/arena/machine",
        },
        {
          title: "SANDBOX",
          url: "/arena/sandbox",
        },
        // {
        //   title: "CVE MACHINES",
        //   url: "#",
        // },
        // {
        //   title: "PLAYGROUND MACHINES",
        //   url: "/playground-machine",
        // },
      ],
    },
    {
      title: "LEARN",
      url: "#",
      icon: GalleryVertical,
      items: [
        {
          title: "MODULES",
          url: "/learn/modules",
        },
        {
          title: "TRACKS",
          url: "/learn/tracks",
        },
        // {
        //   title: "SANDBOX",
        //   url: "/sandbox"
        // },
        {
          title: "ATTACHMENNTS",
          url: "/learn/attachments",
        },
      ],
    },
  ],
  tools: [
    {
      title: "ATTACK BOX",
      url: "/attackbox",
      icon: Swords,
    },
    {
      title: "CLOUD IDE",
      url: "/cloud-ide",
      icon: Cloud,
    },
    {
      title: "CYBER CHEF",
      url: "/cyber-chef",
      icon: ChefHat,
    }
  ],
  kucis: [
    {
      title: "2026 KUCIS",
      url: "#",
      icon: Satellite,
      items: [
        {
          title: "PROJECT",
          url: "/26-kucis",
        },
        {
          title: "DASHBOARD",
          url: "/26-kucis/dashboard",
        },
        // {
        //   title: "IMAGES",
        //   url: "/26-kucis/images",
        // },
        // {
        //   title: "REPORTS",
        //   url: "/26-kucis/reports",
        // },
      ],
    },
  ]
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
        <NavProjects projects={data.practice} />
        <NavTools tools={data.tools} />
        <NavKucis items={data.kucis} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
