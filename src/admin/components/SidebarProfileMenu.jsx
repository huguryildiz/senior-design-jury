import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronUp,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import AlertCard from "../../shared/AlertCard";
import { useProfileEdit } from "../hooks/useProfileEdit";

const AVATAR_SWATCHES = [
  "bg-indigo-500 text-white",
  "bg-blue-500 text-white",
  "bg-emerald-500 text-white",
  "bg-orange-500 text-white",
  "bg-pink-500 text-white",
  "bg-cyan-600 text-white",
  "bg-violet-500 text-white",
];

const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

function getInitials(displayName, email) {
  const source = displayName || email || "";
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function getAvatarSwatch(displayName, email) {
  const source = displayName || email || "?";
  const seed = source.charCodeAt(0) || 0;
  return AVATAR_SWATCHES[seed % AVATAR_SWATCHES.length];
}

function roleLabel(isSuper) {
  return isSuper ? "Super Admin" : "Admin";
}

function MenuOptionIcon({ children }) {
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl border border-[#3659b8] bg-[#eef4ff] text-[#2550c8] shadow-[0_2px_8px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.7)]"
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function IdentityBlock({ initials, avatarClass, displayName, email, tenantLabel, roleText }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/35 p-3">
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          avatarClass,
        )}
        aria-hidden="true"
      >
        {initials}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{displayName || "Admin"}</p>
        {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {tenantLabel} · {roleText}
        </p>
      </div>
    </div>
  );
}

function AccountDialog({ open, onOpenChange, profile, identity, activeTenant, isSuper }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const roleText = roleLabel(isSuper);
  const tenantLabel = activeTenant?.name || "No organization";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-xl" showCloseButton>
        <DialogHeader className="border-b px-5 pt-5 pb-4">
          <DialogTitle>Account</DialogTitle>
          <DialogDescription>Manage your profile and security preferences.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b px-5 py-3">
          <Button
            type="button"
            size="sm"
            variant={profile.modalView === "profile" ? "secondary" : "ghost"}
            onClick={() => profile.setModalView("profile")}
          >
            <UserRound />
            Profile
          </Button>
          <Button
            type="button"
            size="sm"
            variant={profile.modalView === "password" ? "secondary" : "ghost"}
            onClick={() => profile.setModalView("password")}
          >
            <KeyRound />
            Security
          </Button>
        </div>

        {profile.modalView === "profile" ? (
          <form
            className="space-y-4 px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              profile.handleSave();
            }}
          >
            <IdentityBlock
              initials={identity.initials}
              avatarClass={identity.avatarClass}
              displayName={identity.displayName}
              email={identity.email}
              tenantLabel={tenantLabel}
              roleText={roleText}
            />

            {profile.errors._general ? (
              <AlertCard variant="error">{profile.errors._general}</AlertCard>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="profile-display-name">Full Name</Label>
              <Input
                id="profile-display-name"
                value={profile.form.displayName}
                onChange={(e) => profile.setField("displayName", e.target.value)}
                placeholder="Your full name"
                disabled={profile.saving}
                aria-invalid={Boolean(profile.errors.displayName)}
              />
              {profile.errors.displayName ? (
                <p className="text-xs text-destructive">{profile.errors.displayName}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profile.form.email}
                onChange={(e) => profile.setField("email", e.target.value)}
                placeholder="you@institution.edu"
                disabled={profile.saving}
                aria-invalid={Boolean(profile.errors.email)}
              />
              {profile.errors.email ? (
                <p className="text-xs text-destructive">{profile.errors.email}</p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <p>{tenantLabel}</p>
              <p>{roleText}</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={profile.saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={!profile.isDirty || profile.saving}>
                {profile.saving ? <Loader2 className="animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="space-y-4 px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              profile.handlePasswordSave();
            }}
          >
            {profile.passwordErrors._general ? (
              <AlertCard variant="error">{profile.passwordErrors._general}</AlertCard>
            ) : null}

            {isDemoMode ? (
              <AlertCard variant="warning">
                Password updates are disabled in demo mode.
              </AlertCard>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="security-password">New Password</Label>
              <div className="relative">
                <Input
                  id="security-password"
                  type={showPassword ? "text" : "password"}
                  value={profile.passwordForm.password}
                  onChange={(e) => profile.setPasswordField("password", e.target.value)}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  disabled={profile.passwordSaving}
                  aria-invalid={Boolean(profile.passwordErrors.password)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {profile.passwordErrors.password ? (
                <p className="text-xs text-destructive">{profile.passwordErrors.password}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="security-confirm-password">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="security-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={profile.passwordForm.confirmPassword}
                  onChange={(e) => profile.setPasswordField("confirmPassword", e.target.value)}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  disabled={profile.passwordSaving}
                  aria-invalid={Boolean(profile.passwordErrors.confirmPassword)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  aria-label={showConfirmPassword ? "Hide password confirmation" : "Show password confirmation"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {profile.passwordErrors.confirmPassword ? (
                <p className="text-xs text-destructive">{profile.passwordErrors.confirmPassword}</p>
              ) : null}
            </div>

            <p className="text-xs text-muted-foreground">
              Use at least 10 characters including uppercase, lowercase, number, and symbol.
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => profile.setModalView("profile")}
                disabled={profile.passwordSaving}
              >
                Back
              </Button>
              <Button type="submit" disabled={profile.passwordSaving || isDemoMode}>
                {profile.passwordSaving ? <Loader2 className="animate-spin" /> : null}
                Update password
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SidebarProfileMenu({
  user,
  displayName,
  activeTenant,
  isSuper,
  onLogout,
}) {
  const { isMobile } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const profile = useProfileEdit();

  const identity = useMemo(() => {
    const email = user?.email || "";
    return {
      initials: getInitials(displayName, email),
      avatarClass: getAvatarSwatch(displayName, email),
      displayName: displayName || "Admin",
      email,
    };
  }, [displayName, user?.email]);

  const roleText = roleLabel(isSuper);
  const tenantLabel = activeTenant?.name || "No organization";

  const openAccount = () => {
    setMenuOpen(false);
    profile.openModal("profile");
  };

  const openSecurity = () => {
    setMenuOpen(false);
    profile.openModal("password");
  };

  const openChanged = (nextOpen) => {
    setMenuOpen(nextOpen);
  };

  const handleDialogOpenChange = (nextOpen) => {
    if (!nextOpen) profile.closeModal();
  };

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={openChanged}>
        <DropdownMenuTrigger
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/20 px-2.5 py-2 text-left ring-sidebar-ring outline-hidden transition-colors",
            "hover:bg-sidebar-accent/40 active:bg-sidebar-accent/55 focus-visible:ring-2",
            "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5",
          )}
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={identity.displayName}
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
              identity.avatarClass,
            )}
            aria-hidden="true"
          >
            {identity.initials}
          </span>
          <span className="flex min-w-0 flex-1 flex-col group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-medium leading-tight text-sidebar-foreground">
              {identity.displayName}
            </span>
            <span className="truncate text-xs leading-tight text-sidebar-foreground/65">
              {tenantLabel} · {roleText}
            </span>
          </span>
          <ChevronUp
            className={cn(
              "size-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
              menuOpen ? "rotate-0" : "rotate-180",
            )}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side={isMobile ? "top" : "right"}
          align="end"
          sideOffset={10}
          className="w-72 rounded-xl border-border/70 p-2"
        >
          <DropdownMenuLabel className="p-0">
            <IdentityBlock
              initials={identity.initials}
              avatarClass={identity.avatarClass}
              displayName={identity.displayName}
              email={identity.email}
              tenantLabel={tenantLabel}
              roleText={roleText}
            />
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={openAccount}
            className="gap-2.5 rounded-xl border border-[#22386f] bg-[#0f1d43] px-2 py-1.5 text-slate-100 hover:bg-[#132654] focus:bg-[#132654] focus:text-slate-100"
          >
            <MenuOptionIcon>
              <UserRound className="size-5" />
            </MenuOptionIcon>
            <span className="text-[15px] font-medium text-slate-200">Account</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={openSecurity}
            className="gap-2.5 rounded-xl border border-[#22386f] bg-[#0f1d43] px-2 py-1.5 text-slate-100 hover:bg-[#132654] focus:bg-[#132654] focus:text-slate-100"
          >
            <MenuOptionIcon>
              <ShieldCheck className="size-5" />
            </MenuOptionIcon>
            <span className="text-[15px] font-medium text-slate-200">Security</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={onLogout}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AccountDialog
        open={profile.modalOpen}
        onOpenChange={handleDialogOpenChange}
        profile={profile}
        identity={identity}
        activeTenant={activeTenant}
        isSuper={isSuper}
      />
    </>
  );
}
