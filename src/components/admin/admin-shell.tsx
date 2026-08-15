"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useUI, useAuthStore } from "@/lib/store";
import type { AdminRoute } from "@/lib/store";
import { useHotkey, useMediaQuery } from "@/lib/hooks";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Users,
  LifeBuoy,
  Flag,
  ScrollText,
  Search,
  LogOut,
  ArrowLeft,
  PanelLeftClose,
  PanelLeft,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminOverview } from "./panels/overview";
import { AdminUsers } from "./panels/users";
import { AdminSubscriptions } from "./panels/subscriptions";
import { AdminAnalytics } from "./panels/analytics";
import { AdminTickets } from "./panels/tickets";
import { AdminFlags } from "./panels/flags";
import { AdminLogs } from "./panels/logs";

type NavIcon = React.ComponentType<{ className?: string }>;

const NAV: { group: string; items: { id: AdminRoute; label: string; icon: NavIcon; desc: string }[] }[] = [
  {
    group: "Console",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "Platform health & metrics" },
      { id: "analytics", label: "Analytics", icon: BarChart3, desc: "Aggregate product usage" },
      { id: "subscriptions", label: "Subscriptions", icon: CreditCard, desc: "Revenue & plan breakdown" },
    ],
  },
  {
    group: "Manage",
    items: [
      { id: "users", label: "Users", icon: Users, desc: "Accounts & access" },
      { id: "tickets", label: "Support tickets", icon: LifeBuoy, desc: "Help students get unstuck" },
      { id: "flags", label: "Feature flags", icon: Flag, desc: "Roll out features safely" },
      { id: "logs", label: "System logs", icon: ScrollText, desc: "Under the hood" },
    ],
  },
];

export function AdminShell() {
  const {
    adminRoute,
    setAdminRoute,
    sidebarCollapsed,
    toggleSidebar,
    setView,
    commandOpen,
    setCommandOpen,
    mobileNavOpen,
    setMobileNav,
  } = useUI();
  const { user } = useAuthStore();
  const logout = useAuthStore((s) => s.logout);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const collapsed = sidebarCollapsed && isDesktop;

  useHotkey("meta+k", () => setCommandOpen(true));

  const initials = (user?.name || "A")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300 lg:sticky lg:top-0 lg:h-screen",
          collapsed ? "w-[68px]" : "w-[244px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <button
            onClick={() => setAdminRoute("overview")}
            className="ring-focus flex items-center gap-2 rounded-lg"
            title="Admin overview"
          >
            {collapsed ? <Logo showWord={false} /> : <Logo />}
            {!collapsed && (
              <Badge className="rounded-md border border-brand/25 bg-brand/12 text-[10px] font-semibold uppercase tracking-wider text-brand">
                Admin
              </Badge>
            )}
          </button>
          <button
            onClick={() => setMobileNav(false)}
            className="ring-focus rounded-lg p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-2">
          {NAV.map((section) => (
            <div key={section.group} className="mb-4">
              {!collapsed && (
                <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.group}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = adminRoute === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setAdminRoute(item.id);
                        setMobileNav(false);
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {active && !collapsed && (
                        <motion.span
                          layoutId="admin-nav-active"
                          className="absolute left-0 h-5 w-1 rounded-r-full bg-brand"
                        />
                      )}
                      <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-sidebar-border p-2.5 lg:block">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* mobile overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={adminRoute}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <PanelRouter />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  );

  function TopBar() {
    return (
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <button
          onClick={() => setMobileNav(true)}
          className="ring-focus rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setView("app")}
          aria-label="Back to user app"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to app</span>
        </Button>

        <button
          onClick={() => setCommandOpen(true)}
          className="group flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 w-full max-w-xs"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search admin…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono sm:inline">
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <div className="hidden sm:block">
            <ThemeToggle compact />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ring-focus flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-accent text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">{user?.name?.split(" ")[0]}</span>
                <Badge className="rounded border border-brand/25 bg-brand/10 text-[10px] font-semibold uppercase tracking-wider text-brand">
                  Admin
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView("app")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to app
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={async () => await logout()}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  function PanelRouter() {
    switch (adminRoute) {
      case "overview":
        return <AdminOverview />;
      case "users":
        return <AdminUsers />;
      case "subscriptions":
        return <AdminSubscriptions />;
      case "analytics":
        return <AdminAnalytics />;
      case "tickets":
        return <AdminTickets />;
      case "flags":
        return <AdminFlags />;
      case "logs":
        return <AdminLogs />;
      default:
        return <AdminOverview />;
    }
  }
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setAdminRoute, setView } = useUI();
  const go = (route: AdminRoute) => {
    setAdminRoute(route);
    onOpenChange(false);
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Admin command palette" description="Jump to any admin section">
      <CommandInput placeholder="Search admin sections…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV.flatMap((s) => s.items).map((item) => (
            <CommandItem key={item.id} onSelect={() => go(item.id)}>
              <item.icon className="mr-2 h-4 w-4" />
              <div className="flex flex-col">
                <span>{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.desc}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setView("app");
              onOpenChange(false);
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to user app
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
