"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  SquareKanban,
  Building2,
  FileStack,
  UsersRound,
  Repeat,
  ChartColumnBig,
  FileSpreadsheet,
  CalendarClock,
  Settings,
  LogOut,
  KeyRound,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SessionUser } from "@/lib/session";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  caOnly?: boolean;
  matchPrefix?: boolean;
};

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tickets", label: "Tickets", icon: Ticket, matchPrefix: true },
  { href: "/tickets/board", label: "Board", icon: SquareKanban },
  { href: "/timesheet", label: "Timesheet", icon: CalendarClock },
  { href: "/clients", label: "Clients", icon: Building2, matchPrefix: true },
  { href: "/templates", label: "Work Templates", icon: FileStack, caOnly: true, matchPrefix: true },
  { href: "/recurring", label: "Recurring", icon: Repeat, caOnly: true },
  { href: "/employees", label: "Employees", icon: UsersRound, caOnly: true },
  { href: "/analytics", label: "Analytics", icon: ChartColumnBig, caOnly: true },
  { href: "/reports", label: "Reporting", icon: FileSpreadsheet, caOnly: true },
  { href: "/settings", label: "Settings", icon: Settings, caOnly: true },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/tickets") {
    // "Tickets" active for /tickets and /tickets/[id] but not /tickets/board
    return pathname === "/tickets" || /^\/tickets\/(?!board$)/.test(pathname);
  }
  if (item.matchPrefix) return pathname === item.href || pathname.startsWith(item.href + "/");
  return pathname === item.href;
}

function initials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavLinks({
  pathname,
  role,
  onNavigate,
}: {
  pathname: string;
  role: SessionUser["role"];
  onNavigate?: () => void;
}) {
  const items = NAV.filter((i) => !i.caOnly || role === "CA");
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ brandName, logoUrl }: { brandName?: string; logoUrl?: string }) {
  const name = brandName || "CA Firm Ops";
  return (
    <div className="flex items-center gap-2.5 px-5 py-4">
      <div className="size-9 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={logoUrl || "/logo-blue.png"}
          alt={name}
          width={36}
          height={36}
          className="size-full object-cover"
          priority
          unoptimized={!!logoUrl}
        />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-semibold text-sidebar-foreground">{name}</p>
        <p className="text-xs text-sidebar-foreground/60">Work Management</p>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
  brandName,
  logoUrl,
}: {
  user: SessionUser;
  children: React.ReactNode;
  brandName?: string;
  logoUrl?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex h-screen overflow-y-auto">
        <Brand brandName={brandName} logoUrl={logoUrl} />
        <NavLinks pathname={pathname} role={user.role} />
        <div className="px-3 pb-4 text-xs text-sidebar-foreground/40">
          {user.role === "CA" ? "Administrator" : user.role === "MANAGER" ? "Manager" : "Employee"}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:px-6">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0 [&>button]:text-sidebar-foreground">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Brand brandName={brandName} logoUrl={logoUrl} />
              <NavLinks
                pathname={pathname}
                role={user.role}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="flex-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="size-7">
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium sm:inline">
                  {user.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs font-normal text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setPwOpen(true);
                }}
                className="cursor-pointer gap-2"
              >
                <KeyRound className="size-4" />
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2"
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </button>
                </form>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex flex-1 flex-col overflow-y-auto overscroll-none px-4 pb-6 lg:px-8 lg:pb-8">
          <div className="mx-auto flex w-full max-w-7xl flex-1 min-h-0 flex-col gap-6">{children}</div>
        </main>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </div>
  );
}
