"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ComputerIcon,
  Moon02Icon,
  Sun01Icon,
} from "@hugeicons/core-free-icons";

const themes = [
  { value: "light", label: "Light", icon: Sun01Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
  { value: "system", label: "System", icon: ComputerIcon },
] as const;

type ThemeValue = (typeof themes)[number]["value"];

function getThemeIcon(theme: string | undefined) {
  if (theme === "dark") return Moon02Icon;
  if (theme === "system") return ComputerIcon;
  return Sun01Icon;
}

function getThemeLabel(theme: string | undefined) {
  return themes.find((t) => t.value === theme)?.label ?? "Theme";
}

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function SidebarThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const current = (theme ?? "system") as ThemeValue;
  const TriggerIcon = getThemeIcon(mounted ? current : "system");
  const label = getThemeLabel(mounted ? current : "system");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip="Theme"
              className="data-[state=open]:bg-sidebar-accent"
            >
              <HugeiconsIcon icon={TriggerIcon} strokeWidth={2} />
              <span>{label}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="min-w-36">
            <DropdownMenuRadioGroup
              value={mounted ? current : "system"}
              onValueChange={(value) => setTheme(value)}
            >
              {themes.map((item) => (
                <DropdownMenuRadioItem key={item.value} value={item.value}>
                  <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                  {item.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
