"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { SidebarThemeToggle } from "@/components/layout/sidebar-theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  MASTER_LABELS,
  MASTER_TYPES,
  type MasterType,
} from "@/lib/masters-config";
import {
  designNavIcon,
  MASTER_NAV_ICONS,
  productAddIcon,
  productListIcon,
} from "@/lib/navigation-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const productNav = [
  {
    title: "All products",
    href: "/products",
    icon: productListIcon,
  },
  {
    title: "Add product",
    href: "/products/new",
    icon: productAddIcon,
  },
  {
    title: "Designs",
    href: "/designs",
    icon: designNavIcon,
  },
] as const;

const masterNav = MASTER_TYPES.map((type) => ({
  type,
  title: MASTER_LABELS[type],
  href: `/masters/${type}` as const,
}));

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/products" className="flex flex-col gap-0.5">
          <span className="font-semibold tracking-tight">Fabrix Factory</span>
          <span className="text-muted-foreground text-xs">Admin</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Products</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {productNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (item.href === "/products" &&
                        pathname.startsWith("/products/") &&
                        pathname !== "/products/new") ||
                      (item.href === "/designs" &&
                        pathname.startsWith("/designs"))
                    }
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Masters</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {masterNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isMasterActive(pathname, item.type)}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <HugeiconsIcon
                        icon={MASTER_NAV_ICONS[item.type]}
                        strokeWidth={2}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sign out"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarThemeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function isMasterActive(pathname: string, type: MasterType) {
  return pathname === `/masters/${type}`;
}
