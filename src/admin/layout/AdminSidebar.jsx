// src/admin/layout/AdminSidebar.jsx
// ============================================================
// Phase 2A: Collapsible sidebar navigation for admin panel.
// Replaces the old top tab bar with a structured sidebar using
// shadcn/ui Sidebar components and lucide-react icons.
//
// Navigation is organized into three sections:
//   Analytics  — Overview, Scores (with sub-views)
//   Manage     — Jurors, Projects, Semesters
//   System     — Entry Control, Audit Log, Export, Settings
//
// Phase 2A scope: Overview, Scores, and Settings are fully
// navigable. Manage and remaining System items render as
// disabled with a "Coming soon" tooltip.
// ============================================================

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Trophy,
  PieChart,
  Grid3x3,
  Table2,
  ChevronDown,
  ChevronsUpDown,
  LogOut,
  Building2,
  Sun,
  Moon,
} from "lucide-react";
import veraLogo from "../../assets/vera_logo.png";
import { useTheme } from "../../shared/theme/ThemeProvider";

// ---------------------------------------------------------------------------
// Navigation configuration
// ---------------------------------------------------------------------------

const SCORES_SUB_VIEWS = [
  { id: "rankings", label: "Rankings", icon: Trophy },
  { id: "analytics", label: "Analytics", icon: PieChart },
  { id: "grid", label: "Grid", icon: Grid3x3 },
  { id: "details", label: "Details", icon: Table2 },
];

const NAV_SECTIONS = [
  {
    label: "Analytics",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "scores", label: "Scores", icon: BarChart3, hasSubItems: true },
    ],
  },
  {
    label: "Manage",
    items: [
      { id: "jurors", label: "Jurors", icon: Users },
      { id: "projects", label: "Projects", icon: FolderKanban },
      { id: "semesters", label: "Semesters", icon: Calendar },
    ],
  },
  {
    label: "System",
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

/** Extract initials (up to 2 characters) from a display name or email. */
function getInitials(displayName, email) {
  const source = displayName || email || "";
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Brand header with VERA logo. */
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

/** Tenant switcher: dropdown for super-admins, static label for tenant-admins. */
function SidebarTenantSwitcher({ activeTenant, tenants, onTenantSwitch, isSuper }) {
  const tenantLabel = activeTenant?.short_label || activeTenant?.name || "No tenant";

  // Non-super users or single-tenant: static display
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

  // Super-admin with multiple tenants: dropdown
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
        <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Wraps disabled nav items with a "Coming soon" tooltip. */
function DisabledTooltipWrapper({ disabled, children }) {
  if (!disabled) return children;

  return (
    <Tooltip>
      <TooltipTrigger className="w-full">{children}</TooltipTrigger>
      <TooltipContent side="right">Coming soon</TooltipContent>
    </Tooltip>
  );
}

/** Collapsible Scores menu item with sub-views. */
function ScoresCollapsible({ adminTab, scoresView, onNavigate, onScoresViewChange }) {
  const isScoresActive = adminTab === "scores";
  const [isOpen, setIsOpen] = useState(isScoresActive);

  // Keep the collapsible open when the scores tab is active
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
                  <view.icon />
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

/** User profile footer with avatar, name, theme toggle, and logout. */
function SidebarUserFooter({ user, displayName, onLogout }) {
  const email = user?.email || "";
  const initials = getInitials(displayName, email);
  const { theme, setTheme } = useTheme();

  return (
    <SidebarFooter>
      <SidebarMenu>
        {/* Theme toggle */}
        <SidebarMenuItem>
          <SidebarMenuButton
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            tooltip={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>

        {/* User menu */}
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-2 text-sm ring-sidebar-ring outline-hidden transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-medium text-sidebar-primary-foreground"
                aria-hidden="true"
              >
                {initials}
              </span>
              <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-medium leading-tight text-sidebar-foreground">
                  {displayName || "User"}
                </span>
                {displayName && email && (
                  <span className="truncate text-xs leading-tight text-sidebar-foreground/60">
                    {email}
                  </span>
                )}
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={8} className="min-w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{displayName || "User"}</span>
                  {email && (
                    <span className="text-xs text-muted-foreground">{email}</span>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout}>
                <LogOut className="mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * AdminSidebar - collapsible sidebar navigation for the admin panel.
 *
 * @param {object}   props
 * @param {string}   props.adminTab            - Current active tab id
 * @param {string}   props.scoresView          - Current scores sub-view id
 * @param {function} props.onNavigate          - Called with tab id on nav click
 * @param {function} props.onScoresViewChange  - Called with view id for scores sub-items
 * @param {object}   props.activeTenant        - { id, name, short_label }
 * @param {array}    props.tenants             - Array of tenant objects for switcher
 * @param {function} props.onTenantSwitch      - Called with tenant object on switch
 * @param {boolean}  props.isSuper             - Whether user is a super-admin
 * @param {object}   props.user                - { email }
 * @param {string}   props.displayName         - User display name
 * @param {function} props.onLogout            - Called on logout action
 */
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
  // Memoize nav sections to avoid rebuilding on every render
  const sections = useMemo(() => NAV_SECTIONS, []);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* ---- Header: Brand + Tenant ---- */}
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

      {/* ---- Navigation ---- */}
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => {
                // Scores has a collapsible sub-menu
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

                const isActive = adminTab === item.id;

                // Disabled items get a tooltip wrapper
                if (item.disabled) {
                  return (
                    <SidebarMenuItem key={item.id}>
                      <DisabledTooltipWrapper disabled>
                        <SidebarMenuButton
                          isActive={false}
                          disabled
                          tooltip={item.label}
                        >
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </DisabledTooltipWrapper>
                    </SidebarMenuItem>
                  );
                }

                // Standard clickable nav item
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={isActive}
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
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ---- Footer: User profile ---- */}
      <SidebarUserFooter
        user={user}
        displayName={displayName}
        onLogout={onLogout}
      />

      {/* Drag rail for collapse/expand */}
      <SidebarRail />
    </Sidebar>
  );
}
