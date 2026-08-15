"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useAuthStore, useUI } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Search,
  LayoutDashboard,
  Target,
  CheckSquare,
  BookOpen,
  CalendarDays,
  Bot,
  StickyNote,
  Calendar,
  BarChart3,
  Trophy,
  RotateCcw,
  Users,
  UserPlus,
  GraduationCap,
  HelpCircle,
  Settings,
  CreditCard,
  Bell,
  Activity,
  Home,
  Sparkles,
  DollarSign,
  Mail,
  LogIn,
} from "lucide-react";
import { LayersIcon } from "@/components/shared/icons";
import type { LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  action: () => void;
}

/* ------------------------------------------------------------------ */
/*  Command definitions                                                */
/* ------------------------------------------------------------------ */

function useCommands(): CommandItem[] {
  const user = useAuthStore((s) => s.user);
  const setView = useUI((s) => s.setView);
  const setAppRoute = useUI((s) => s.setAppRoute);
  const openAuth = useUI((s) => s.openAuth);

  return useMemo(() => {
    if (user) {
      return [
        // Navigation
        {
          id: "dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          group: "Navigation",
          action: () => setAppRoute("dashboard"),
        },
        {
          id: "focus",
          label: "Focus",
          icon: Target,
          group: "Navigation",
          action: () => setAppRoute("focus"),
        },
        {
          id: "tasks",
          label: "Tasks",
          icon: CheckSquare,
          group: "Navigation",
          action: () => setAppRoute("tasks"),
        },
        {
          id: "subjects",
          label: "Subjects",
          icon: BookOpen,
          group: "Navigation",
          action: () => setAppRoute("subjects"),
        },
        {
          id: "plans",
          label: "Plans",
          icon: CalendarDays,
          group: "Navigation",
          action: () => setAppRoute("plans"),
        },
        // App Panels
        {
          id: "tutor",
          label: "Tutor",
          icon: Bot,
          group: "App Panels",
          action: () => setAppRoute("tutor"),
        },
        {
          id: "flashcards",
          label: "Flashcards",
          icon: LayersIcon,
          group: "App Panels",
          action: () => setAppRoute("flashcards"),
        },
        {
          id: "notes",
          label: "Notes",
          icon: StickyNote,
          group: "App Panels",
          action: () => setAppRoute("notes"),
        },
        {
          id: "calendar",
          label: "Calendar",
          icon: Calendar,
          group: "App Panels",
          action: () => setAppRoute("calendar"),
        },
        {
          id: "analytics",
          label: "Analytics",
          icon: BarChart3,
          group: "App Panels",
          action: () => setAppRoute("analytics"),
        },
        {
          id: "achievements",
          label: "Achievements",
          icon: Trophy,
          group: "App Panels",
          action: () => setAppRoute("achievements"),
        },
        {
          id: "weekly-review",
          label: "Weekly Review",
          icon: RotateCcw,
          group: "App Panels",
          action: () => setAppRoute("weekly-review"),
        },
        {
          id: "leaderboard",
          label: "Leaderboard",
          icon: Users,
          group: "App Panels",
          action: () => setAppRoute("leaderboard"),
        },
        {
          id: "groups",
          label: "Groups",
          icon: UserPlus,
          group: "App Panels",
          action: () => setAppRoute("groups"),
        },
        {
          id: "exam-prep",
          label: "Exam Prep",
          icon: GraduationCap,
          group: "App Panels",
          action: () => setAppRoute("exam-prep"),
        },
        {
          id: "quiz",
          label: "Quiz",
          icon: HelpCircle,
          group: "App Panels",
          action: () => setAppRoute("quiz"),
        },
        // Account
        {
          id: "settings",
          label: "Settings",
          icon: Settings,
          group: "Account",
          action: () => setAppRoute("settings"),
        },
        {
          id: "billing",
          label: "Billing",
          icon: CreditCard,
          group: "Account",
          action: () => setAppRoute("billing"),
        },
        {
          id: "notifications",
          label: "Notifications",
          icon: Bell,
          group: "Account",
          action: () => setAppRoute("notifications"),
        },
        {
          id: "activity",
          label: "Activity",
          icon: Activity,
          group: "Account",
          action: () => setAppRoute("activity"),
        },
      ];
    }

    // Not logged in
    return [
      {
        id: "home",
        label: "Home",
        icon: Home,
        group: "Navigation",
        action: () => setView("home"),
      },
      {
        id: "features",
        label: "Features",
        icon: Sparkles,
        group: "Navigation",
        action: () => setView("features"),
      },
      {
        id: "pricing",
        label: "Pricing",
        icon: DollarSign,
        group: "Navigation",
        action: () => setView("pricing"),
      },
      {
        id: "contact",
        label: "Contact",
        icon: Mail,
        group: "Navigation",
        action: () => setView("contact"),
      },
      // Account
      {
        id: "sign-in",
        label: "Sign In",
        icon: LogIn,
        group: "Account",
        action: () => openAuth("login"),
      },
      {
        id: "create-account",
        label: "Create Account",
        icon: UserPlus,
        group: "Account",
        action: () => openAuth("register"),
      },
    ];
  }, [user, setView, setAppRoute, openAuth]);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CommandPalette() {
  const commandOpen = useUI((s) => s.commandOpen);
  const setCommandOpen = useUI((s) => s.setCommandOpen);
  const commands = useCommands();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Filter commands */
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  /* Group filtered commands preserving order */
  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const cmd of filtered) {
      const arr = map.get(cmd.group) ?? [];
      arr.push(cmd);
      map.set(cmd.group, arr);
    }
    return map;
  }, [filtered]);

  /* Reset state when opening (event handler, not effect) */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        setQuery("");
        setActiveIndex(0);
      }
      setCommandOpen(open);
    },
    [setCommandOpen],
  );

  /* Auto-focus input when dialog opens */
  useEffect(() => {
    if (commandOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [commandOpen]);

  /* Clamp active index to valid range */
  const clampedIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  /* Keyboard navigation */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered[clampedIndex]) {
        e.preventDefault();
        filtered[clampedIndex].action();
        setCommandOpen(false);
      }
    },
    [filtered, clampedIndex, setCommandOpen],
  );

  /* Scroll active item into view */
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector("[data-active='true']");
    active?.scrollIntoView({ block: "nearest" });
  }, [clampedIndex]);

  return (
    <Dialog
      open={commandOpen}
      onOpenChange={handleOpenChange}
    >
      <DialogContent
        showCloseButton={false}
        className="glass shadow-soft rounded-xl border-border/50 sm:max-w-lg p-0 gap-0 overflow-hidden top-[15%] translate-y-0"
        onOpenAutoFocus={(e) => {
          // Prevent default focus; we handle it via rAF
          e.preventDefault();
        }}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Command list */}
        <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Search className="mb-2 h-6 w-6 opacity-40" />
              <p className="text-sm">No results found</p>
              <p className="mt-1 text-xs opacity-60">Try a different search term</p>
            </div>
          ) : (
            Array.from(groups.entries()).map(([group, items]) => {
              // Calculate the global index offset for this group
              let offset = 0;
              for (const [, prevItems] of groups.entries()) {
                if (prevItems === items) break;
                offset += prevItems.length;
              }
              return (
                <div key={group} className="mb-1">
                  <p className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {group}
                  </p>
                  {items.map((item) => {
                    const globalIndex = offset + items.indexOf(item);
                    const Icon = item.icon;
                    const isActive = globalIndex === clampedIndex;
                    return (
                      <button
                        key={item.id}
                        data-active={isActive}
                        onClick={() => {
                          item.action();
                          setCommandOpen(false);
                        }}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-brand/10 text-brand"
                            : "text-foreground/80 hover:bg-muted/50",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-center gap-4 border-t border-border/50 px-4 py-2.5 text-[11px] text-muted-foreground/60">
          <span>
            <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
              ↑↓
            </kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
              ↵
            </kbd>{" "}
            select
          </span>
          <span>
            <kbd className="rounded border border-border/60 bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
              esc
            </kbd>{" "}
            close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
