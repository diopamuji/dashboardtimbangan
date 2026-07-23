import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Archive, Award } from "lucide-react";
import plnLogo from "@/assets/pln-logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Data Historis", url: "/history", icon: Archive },
  { title: "Sertifikat COA & COW", url: "/certificates", icon: Award },
];


export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-elevated overflow-hidden">
            <img src={plnLogo} alt="PLN Indonesia Power" width={40} height={40} className="h-9 w-9 object-contain" />
          </div>

          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold text-sidebar-foreground">PLTU Ombilin</span>
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
              PLN Indonesia Power
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Logistik & Jembatan Timbang</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-2 py-2 text-[10px] text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
          Sinkron otomatis tiap 10 detik
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
