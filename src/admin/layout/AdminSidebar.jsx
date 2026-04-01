// src/admin/layout/AdminSidebar.jsx
// ============================================================
// Collapsible sidebar navigation for admin panel.
// Uses shadcn/ui Sidebar components and lucide-react icons.
//
// Navigation is organized into three collapsible sections:
//   Analytics  — Overview, Scores (with sub-views)
//   Manage     — Jurors, Projects, Semesters
//   System     — Entry Control, Audit Log, Export, Settings
// ============================================================

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  FolderKanban,
  Calendar,
  Shield,
  ScrollText,
  Download,
  Settings,
  ChevronDown,
  ChevronsUpDown,
  Building2,
  Sun,
  Moon,
} from "lucide-react";
import veraLogo from "../../assets/vera_logo.png";
import { useTheme } from "../../shared/theme/ThemeProvider";
import SidebarProfileMenu from "../components/SidebarProfileMenu";

// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------

const SCORES_SUB_VIEWS = [
  { id: "rankings", label: "Rankings" },
  { id: "analytics", label: "Analytics" },
  { id: "grid", label: "Grid" },
  { id: "details", label: "Details" },
];

const NAV_SECTIONS = [
  {
    label: "Analytics",
    collapsible: true,
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "scores", label: "Scores", icon: BarChart3, hasSubItems: true },
    ],
  },
  {
    label: "Manage",
    collapsible: true,
    items: [
      { id: "jurors", label: "Jurors", icon: Users },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "semesters", label: "Periods", icon: Calendar },
    ],
  },
  {
    label: "System",
    collapsible: true,
    items: [
      { id: "entry-control", label: "Entry Control", icon: Shield },
      { id: "audit-log", label: "Audit Log", icon: ScrollText },
      { id: "export", label: "Export", icon: Download },
      { id: "settings", label: "Settings", icon: Settings },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SidebarBrand() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1">
      <img src={veraLogo} alt="" className="size-7 shrink-0" aria-hidden="true" />
      <span className="text-base font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
        VERA
      </span>
    </div>
  );
}

function SidebarTenantSwitcher({ activeTenant, tenants, onTenantSwitch, isSuper }) {
  const tenantLabel = activeTenant?.short_label || activeTenant?.name || "No organization";

  if (!isSuper || !tenants || tenants.length <= 1) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Building2 className="size-4 shrink-0 text-sidebar-foreground/60" />
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {tenantLabel}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground/80 ring-sidebar-ring outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Building2 className="size-4 shrink-0 text-sidebar-foreground/60" />
        <span className="flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
          {tenantLabel}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants
            .filter((t) => t.id != null)
            .map((t) => (
              <DropdownMenuItem
                key={t.id}
                className={cn(activeTenant?.id === t.id && "bg-accent font-medium")}
                onClick={() => onTenantSwitch(t)}
              >
                {t.name}
              </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Collapsible Scores menu item with sub-views (no icons on sub-items). */
function ScoresCollapsible({ adminTab, scoresView, onNavigate, onScoresViewChange }) {
  const isScoresActive = adminTab === "scores";
  const [isOpen, setIsOpen] = useState(isScoresActive);
  const open = isOpen || isScoresActive;

  return (
    <Collapsible open={open} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger className="w-full">
          <SidebarMenuButton
            isActive={isScoresActive}
            onClick={() => {
              onNavigate("scores");
              if (!isScoresActive) setIsOpen(true);
            }}
            tooltip="Scores"
          >
            <BarChart3 />
            <span>Scores</span>
            <ChevronDown
              className={cn(
                "ml-auto size-4 shrink-0 transition-transform duration-200",
                open && "rotate-180"
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {SCORES_SUB_VIEWS.map((view) => (
              <SidebarMenuSubItem key={view.id}>
                <SidebarMenuSubButton
                  isActive={isScoresActive && scoresView === view.id}
                  onClick={() => {
                    if (adminTab !== "scores") onNavigate("scores");
                    onScoresViewChange(view.id);
                  }}
                >
                  <span>{view.label}</span>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

/** Collapsible section group with animated chevron trigger. */
function CollapsibleNavSection({ section, adminTab, scoresView, onNavigate, onScoresViewChange }) {
  const sectionItemIds = section.items.map((i) => i.id);
  const isSectionActive = sectionItemIds.includes(adminTab);
  const [isOpen, setIsOpen] = useState(isSectionActive);
  const open = isOpen || isSectionActive;

  return (
    <SidebarGroup>
      <Collapsible open={open} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex h-8 w-full shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 transition-[margin,opacity] duration-200 ease-linear hover:text-sidebar-foreground group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0">
          <span className="flex-1 text-left">{section.label}</span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenu>
            {section.items.map((item) => {
              if (item.hasSubItems) {
                return (
                  <ScoresCollapsible
                    key={item.id}
                    adminTab={adminTab}
                    scoresView={scoresView}
                    onNavigate={onNavigate}
                    onScoresViewChange={onScoresViewChange}
                  />
                );
              }

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={adminTab === item.id}
                    onClick={() => onNavigate(item.id)}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

function SidebarUserFooter({ user, displayName, activeTenant, isSuper, onLogout }) {
  const { theme, setTheme } = useTheme();

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            tooltip={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        <SidebarMenuItem>
          <SidebarProfileMenu
            user={user}
            displayName={displayName}
            activeTenant={activeTenant}
            isSuper={isSuper}
            onLogout={onLogout}
          />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminSidebar({
  adminTab,
  scoresView,
  onNavigate,
  onScoresViewChange,
  activeTenant,
  tenants,
  onTenantSwitch,
  isSuper,
  user,
  displayName,
  onLogout,
}) {
  const sections = useMemo(() => NAV_SECTIONS, []);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader>
        <SidebarBrand />
        <SidebarSeparator />
        <SidebarTenantSwitcher
          activeTenant={activeTenant}
          tenants={tenants}
          onTenantSwitch={onTenantSwitch}
          isSuper={isSuper}
        />
      </SidebarHeader>

      <SidebarContent>
        {sections.map((section) => (
          <CollapsibleNavSection
            key={section.label}
            section={section}
            adminTab={adminTab}
            scoresView={scoresView}
            onNavigate={onNavigate}
            onScoresViewChange={onScoresViewChange}
          />
        ))}
      </SidebarContent>

      <SidebarUserFooter
        user={user}
        displayName={displayName}
        activeTenant={activeTenant}
        isSuper={isSuper}
        onLogout={onLogout}
      />

      <SidebarRail />
    </Sidebar>
  );
}
