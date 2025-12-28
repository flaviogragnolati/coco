"use client";

import type * as React from "react";
import { Layers, SquareTerminal } from "lucide-react";

import { NavMain } from "~/ui/nav-main";
import { NavUser } from "~/ui/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "~/ui/sidebar";

const data = {
  user: {
    name: "Panel administrativo",
    email: "Gestiona el marketplace",
    avatar: "/favicon.ico",
  },
  navMain: [
    {
      title: "Operaciones",
      url: "/admin",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Dashboard",
          url: "/admin",
        },
        {
          title: "Carritos",
          url: "/admin/carritos",
        },
        {
          title: "Lotes",
          url: "/admin/lotes",
        },
        {
          title: "Paquetes",
          url: "/admin/paquetes",
        },
        {
          title: "Envíos",
          url: "/admin/envios",
        },
      ],
    },
    {
      title: "Catálogo",
      url: "/admin",
      icon: Layers,
      items: [
        {
          title: "Proveedores",
          url: "/admin/suppliers",
        },
        {
          title: "Productos",
          url: "/admin/products",
        },
        {
          title: "Categorías",
          url: "/admin/categories",
        },
        {
          title: "Transportistas",
          url: "/admin/carriers",
        },
        {
          title: "Direcciones",
          url: "/admin/addresses",
        },
        {
          title: "Canales",
          url: "/admin/channels",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavUser user={data.user} />
        {/* <TeamSwitcher teams={data.teams} /> */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {/* <NavProjects projects={data.projects} /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
