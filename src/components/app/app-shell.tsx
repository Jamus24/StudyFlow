"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useUI, useAuthStore } from "@/lib/store";
import { useHotkey, useMediaQuery, useSequenceShortcut } from "@/lib/hooks";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  LayoutDashboard, CheckSquare, FolderKanban, CalendarRange, Brain, StickyNote,
  BarChart3, Settings, CreditCard, Bell, Search, LogOut, ChevronLeft, ChevronRight,
  Menu, Sparkles, Clock, FlaskConical, BookOpen, PanelLeftClose, PanelLeft, UserCog, Shield,
  Plus, Flame, X, Timer, Trophy, FileText, Users, UsersRound, GraduationCap, HelpCircle,
  Lock, Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LayersIcon } from "@/components/shared/icons";
import { ROUTE_TIERS, tierSatisfies } from "@/lib/tier";

import { PaywallBanner } from "@/components/shared/paywall-banner";
import { useFeatureGate } from "@/hooks/use-feature-gate";

// Lazy-load every panel so only the active one compiles at a time.
const panelLoader = (p: string) =>
  dynamic(() => import(`./panels/${p}`).then((m) => m.default as any), {
    loading: () => <PanelSkeleton />,
    ssr: false,
  });

const DashboardPanel = panelLoader("dashboard");
const TasksPanel = panelLoader("tasks");
const SubjectsPanel = panelLoader("subjects");
const PlansPanel = panelLoader("plans");
const TutorPanel = panelLoader("tutor");
const FlashcardsPanel = panelLoader("flashcards");
const NotesPanel = panelLoader("notes");
const CalendarPanel = panelLoader("calendar");
const AnalyticsPanel = panelLoader("analytics");
const SettingsPanel = panelLoader("settings");
const BillingPanel = panelLoader("billing");
const NotificationsPanel = panelLoader("notifications");
const ActivityPanel = panelLoader("activity");
const AchievementsPanel = panelLoader("achievements");
const WeeklyReviewPanel = panelLoader("weekly-review");
const LeaderboardPanel = panelLoader("leaderboard");
const GroupsPanel = panelLoader("groups");
const ExamPrepPanel = panelLoader("exam-prep");
const QuizPanel = panelLoader("quiz");
const FocusPanel = panelLoader("focus");
import { NotificationsMenu } from "./notifications-menu";

const NAV: { group: string; items: { id: any; label: string; icon: any }[] }[] = [
  {
    group: "Plan",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "focus", label: "Focus Timer", icon: Timer },
      { id: "tasks", label: "Tasks", icon: CheckSquare },
      { id: "calendar", label: "Calendar", icon: CalendarRange },
      { id: "plans", label: "AI Plans", icon: Sparkles },
    ],
  },
  {
    group: "Learn",
    items: [
      { id: "tutor", label: "AI Tutor", icon: Brain },
      { id: "flashcards", label: "Flashcards", icon: LayersIcon },
      { id: "notes", label: "Notes", icon: StickyNote },
      { id: "subjects", label: "Subjects", icon: FolderKanban },
      { id: "exam-prep", label: "Exam Prep", icon: GraduationCap },
      { id: "quiz", label: "Mock Quiz", icon: HelpCircle },
    ],
  },
  {
    group: "Track",
    items: [
      { id: "weekly-review", label: "Weekly Review", icon: FileText },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "leaderboard", label: "Leaderboard", icon: Users },
      { id: "groups", label: "Study Groups", icon: UsersRound },
      { id: "achievements", label: "Achievements", icon: Trophy },
      { id: "activity", label: "Activity", icon: Clock },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    group: "Account",
    items: [
      { id: "settings", label: "Settings", icon: Settings },
      { id: "billing", label: "Billing", icon: CreditCard },
    ],
  },
];

export function AppShell() {
  const appRoute = useUI((s) => s.appRoute);
  const setAppRoute = useUI((s) => s.setAppRoute);
  const sidebarCollapsed = useUI((s) => s.sidebarCollapsed);
  const toggleSidebar = useUI((s) => s.toggleSidebar);
  const setView = useUI((s) => s.setView);
  const commandOpen = useUI((s) => s.commandOpen);
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const mobileNavOpen = useUI((s) => s.mobileNavOpen);
  const setMobileNav = useUI((s) => s.setMobileNav);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const collapsed = sidebarCollapsed && isDesktop;

  useHotkey("meta+k", () => setCommandOpen(true));
  useHotkey("?", () => setShortcutsOpen((v) => !v));
  useHotkey("meta+b", () => useUI.getState().toggleSidebar());
  useHotkey("meta+,", () => setAppRoute("settings"));
  useSequenceShortcut("g", "d", () => setAppRoute("dashboard"));
  useSequenceShortcut("g", "f", () => setAppRoute("focus"));
  useSequenceShortcut("g", "t", () => setAppRoute("tasks"));
  useSequenceShortcut("g", "c", () => setAppRoute("calendar"));
  useSequenceShortcut("g", "p", () => setAppRoute("plans"));
  useSequenceShortcut("g", "u", () => setAppRoute("tutor"));
  useSequenceShortcut("g", "l", () => setAppRoute("flashcards"));
  useSequenceShortcut("g", "n", () => setAppRoute("notes"));
  useSequenceShortcut("g", "s", () => setAppRoute("subjects"));
  useSequenceShortcut("g", "a", () => setAppRoute("analytics"));
  useSequenceShortcut("g", "v", () => setAppRoute("achievements"));
  useSequenceShortcut("g", "r", () => setAppRoute("weekly-review"));
  useSequenceShortcut("g", "b", () => setAppRoute("leaderboard"));
  useSequenceShortcut("g", "g", () => setAppRoute("groups"));
  useSequenceShortcut("g", "e", () => setAppRoute("exam-prep"));
  useSequenceShortcut("g", "q", () => setAppRoute("quiz"));

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-float focus:border focus:border-border"
      >
        Skip to content
      </a>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-300 lg:sticky lg:top-0 lg:h-screen",
          collapsed ? "w-[68px]" : "w-[244px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <button onClick={() => setView("home")} className="ring-focus rounded-lg">
            {collapsed ? <Logo showWord={false} /> : <Logo />}
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
                  const active = appRoute === item.id;
                  const gate = ROUTE_TIERS[item.id as keyof typeof ROUTE_TIERS];
                  const locked = gate ? !tierSatisfies(user?.planTier ?? "free", gate.tier) : false;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setAppRoute(item.id);
                        setMobileNav(false);
                      }}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        locked && !active && "opacity-70",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? (locked ? `${item.label} (${gate.tier})` : item.label) : undefined}
                    >
                      {active && !collapsed && (
                        <motion.span layoutId="nav-active" className="absolute left-0 h-5 w-1 rounded-r-full bg-brand" />
                      )}
                      <item.icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "")} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {locked && (
                            <span className={cn(
                              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                              gate.tier === "pro" ? "bg-brand/10 text-brand" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            )}>
                              <Lock className="h-2.5 w-2.5" />
                              {gate.tier}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && locked && (
                        <span className={cn(
                          "absolute right-1 top-1 h-1.5 w-1.5 rounded-full",
                          gate.tier === "pro" ? "bg-brand" : "bg-amber-500"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* collapse toggle (desktop) */}
        <div className="hidden border-t border-sidebar-border p-2.5 lg:block">
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
          </button>
        </div>
      </aside>

      {/* mobile overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileNav(false)} />
      )}

      {/* Main */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setMobileNav(true)} />
        <main id="main-content" className="flex-1 min-h-0 px-4 py-5 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={appRoute}
              className="h-full"
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
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );

  function TopBar({ onMenu }: { onMenu: () => void }) {
    const pushToast = useUI((s) => s.pushToast);
    return (
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
        <button onClick={onMenu} className="ring-focus rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>

        <button
          onClick={() => setCommandOpen(true)}
          className="group flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/20 w-full max-w-xs"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search or jump…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono sm:inline">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" className="hidden gap-2 sm:flex" onClick={() => setAppRoute("plans")}>
            <Sparkles className="h-4 w-4 text-brand" /> New plan
          </Button>
          <button
            onClick={() => setShortcutsOpen(true)}
            className="ring-focus hidden rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground lg:block"
            aria-label="Keyboard shortcuts"
            title="Press ? for shortcuts"
          >
            <kbd className="font-mono">?</kbd>
          </button>
          <NotificationsMenu />
          <div className="hidden sm:block"><ThemeToggle compact /></div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ring-focus flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-muted">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-accent text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">{user?.name?.split(" ")[0]}</span>
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
              <DropdownMenuItem onClick={() => setAppRoute("settings")}>
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAppRoute("billing")}>
                <CreditCard className="mr-2 h-4 w-4" /> Billing
                <Badge variant="secondary" className="ml-auto rounded-md text-[10px] capitalize">{user?.planTier}</Badge>
              </DropdownMenuItem>
              {user?.role === "admin" && (
                <DropdownMenuItem onClick={() => setView("admin")}>
                  <Shield className="mr-2 h-4 w-4" /> Admin console
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView("home")}>
                <BookOpen className="mr-2 h-4 w-4" /> Back to site
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={async () => { await logout(); }}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  }

  function PanelRouter() {
    const gate = useFeatureGate(appRoute);
    if (!gate.allowed) {
      return (
        <PaywallBanner
          featureLabel={gate.featureLabel}
          requiredTier={gate.requiredTier!}
        />
      );
    }
    switch (appRoute) {
      case "dashboard": return <DashboardPanel />;
      case "focus": return <FocusPanel />;
      case "tasks": return <TasksPanel />;
      case "subjects": return <SubjectsPanel />;
      case "plans": return <PlansPanel />;
      case "tutor": return <TutorPanel />;
      case "flashcards": return <FlashcardsPanel />;
      case "notes": return <NotesPanel />;
      case "calendar": return <CalendarPanel />;
      case "analytics": return <AnalyticsPanel />;
      case "achievements": return <AchievementsPanel />;
      case "weekly-review": return <WeeklyReviewPanel />;
      case "leaderboard": return <LeaderboardPanel />;
      case "groups": return <GroupsPanel />;
      case "exam-prep": return <ExamPrepPanel />;
      case "quiz": return <QuizPanel />;
      case "settings": return <SettingsPanel />;
      case "billing": return <BillingPanel />;
      case "notifications": return <NotificationsPanel />;
      case "activity": return <ActivityPanel />;
      default: return <DashboardPanel />;
    }
  }
}

function PanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="relative h-16 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 bg-muted/30 animate-pulse" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="relative h-28 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="absolute inset-0 bg-muted/30 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="relative h-72 overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 bg-muted/30 animate-pulse" />
      </div>
    </div>
  );
}

function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const setAppRoute = useUI((s) => s.setAppRoute);
  const user = useAuthStore((s) => s.user);
  const go = (route: any) => { setAppRoute(route); onOpenChange(false); };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {NAV.flatMap((s) => s.items).map((item) => {
            const gate = ROUTE_TIERS[item.id as keyof typeof ROUTE_TIERS];
            const locked = gate ? !tierSatisfies(user?.planTier ?? "free", gate.tier) : false;
            return (
              <CommandItem key={item.id} onSelect={() => go(item.id)}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
                {locked && (
                  <span className={cn(
                    "ml-auto flex items-center gap-1 text-[10px] font-semibold",
                    gate.tier === "pro" ? "text-brand" : "text-amber-500"
                  )}>
                    <Lock className="h-3 w-3" />
                    {gate.tier}
                  </span>
                )}
              </CommandItem>
              );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("plans")}>
            <Sparkles className="mr-2 h-4 w-4" /> Generate a study plan
          </CommandItem>
          <CommandItem onSelect={() => go("tasks")}>
            <Plus className="mr-2 h-4 w-4" /> Add a task
          </CommandItem>
          <CommandItem onSelect={() => go("tutor")}>
            <Brain className="mr-2 h-4 w-4" /> Ask the tutor
          </CommandItem>
          <CommandItem onSelect={() => go("flashcards")}>
            <LayersIcon className="mr-2 h-4 w-4" /> Review flashcards
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const setAppRoute = useUI((s) => s.setAppRoute);
  const setView = useUI((s) => s.setView);
  const groups: { title: string; items: { keys: string; label: string; action?: () => void }[] }[] = [
    {
      title: "Navigate",
      items: [
        { keys: "⌘ K", label: "Open command palette", action: () => useUI.getState().setCommandOpen(true) },
        { keys: "G D", label: "Go to Dashboard", action: () => setAppRoute("dashboard") },
        { keys: "G F", label: "Go to Focus Timer", action: () => setAppRoute("focus") },
        { keys: "G T", label: "Go to Tasks", action: () => setAppRoute("tasks") },
        { keys: "G P", label: "Go to AI Plans", action: () => setAppRoute("plans") },
        { keys: "G U", label: "Go to AI Tutor", action: () => setAppRoute("tutor") },
        { keys: "G R", label: "Go to Weekly Review", action: () => setAppRoute("weekly-review") },
        { keys: "G B", label: "Go to Leaderboard", action: () => setAppRoute("leaderboard") },
        { keys: "G G", label: "Go to Study Groups", action: () => setAppRoute("groups") },
        { keys: "G E", label: "Go to Exam Prep", action: () => setAppRoute("exam-prep") },
        { keys: "G Q", label: "Go to Mock Quiz", action: () => setAppRoute("quiz") },
        { keys: "G V", label: "Go to Achievements", action: () => setAppRoute("achievements") },
      ],
    },
    {
      title: "Actions",
      items: [
        { keys: "?", label: "Show this help" },
        { keys: "Esc", label: "Close dialog" },
        { keys: "⌘ B", label: "Toggle sidebar", action: () => useUI.getState().toggleSidebar() },
        { keys: "⌘ ,", label: "Open Settings", action: () => setAppRoute("settings") },
      ],
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <DialogTitle className="font-display text-lg font-semibold">Keyboard shortcuts</DialogTitle>
        <p className="text-sm text-muted-foreground">Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> anywhere in the app to open this.</p>
        <div className="mt-4 space-y-5">
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{g.title}</h3>
              <div className="space-y-1">
                {g.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { item.action?.(); onOpenChange(false); }}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span className="text-foreground/90">{item.label}</span>
                    <span className="flex gap-1">
                      {item.keys.split(" ").map((k, i) => (
                        <kbd key={i} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          Tip: use <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">⌘ K</kbd> to jump to any page or action.
        </p>
      </DialogContent>
    </Dialog>
  );
}
