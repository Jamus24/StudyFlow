"use client";

import { useEffect, useRef, useCallback } from "react";
import { useUI } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import {
  ArrowRight, LayoutDashboard, X, CalendarRange, Brain, Repeat,
  Timer, TrendingUp, GraduationCap, Search,
} from "lucide-react";
import { LayersIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Home", view: "home" as const, icon: GraduationCap },
  { label: "Features", view: "features" as const, icon: LayersIcon },
  { label: "Pricing", view: "pricing" as const, icon: CalendarRange },
  { label: "FAQ", view: "home" as const, icon: Brain, hash: "faq" },
  { label: "Contact", view: "contact" as const, icon: Repeat },
  { label: "Testimonials", view: "home" as const, icon: TrendingUp, hash: "testimonials" },
];

export function MobileDrawer() {
  const { view, setView, mobileNavOpen, setMobileNav, openAuth, commandOpen, setCommandOpen } = useUI();
  const { user } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const close = useCallback(() => setMobileNav(false), [setMobileNav]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'button, [tabindex], input, textarea, [role="button"]'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    if (isFirstRender.current) {
      isFirstRender.current = false;
      requestAnimationFrame(() => first.focus());
      return;
    }
  }, [mobileNavOpen]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [close]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const drawer = drawerRef.current;
      if (!drawer || !mobileNavOpen) return;
      if (!drawer.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileNavOpen, close]);

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        aria-hidden={!mobileNavOpen}
      />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-[70] w-[280px] max-w-[80vw] h-full bg-card border-r border-border shadow-float transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Logo showWord={false} size={22} />
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
            {NAV.map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  setView(item.view);
                  if (item.hash) {
                    setTimeout(() => {
                      document.getElementById(item.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }
                  close();
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 hover:bg-muted",
                  view === item.view && !item.hash && "bg-brand/10 text-brand"
                )}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
              </button>
            ))}
          </nav>

          <div className="mt-auto border-t border-border p-4">
            <button
              onClick={() => { setCommandOpen(true); close(); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground mb-2"
            >
              <Search className="h-4 w-4" />
              <span>Quick search</span>
              <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            <div className="flex items-center gap-2 px-1 pb-3">
              <ThemeToggle compact />
              <span className="text-[10px] text-muted-foreground">Theme</span>
            </div>

            {user ? (
              <Button
                className="w-full gap-1.5 mt-1"
                onClick={() => { setView("app"); close(); }}
              >
                <LayoutDashboard className="h-4 w-4" />
                Open app
              </Button>
            ) : (
              <div className="flex gap-2 mt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { openAuth("login"); close(); }}
                >
                  Sign in
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => { openAuth("register"); close(); }}
                >
                  Start free
                </Button>
              </div>
            )}

            <div className="mt-3 flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono">Esc</kbd>
              <span>Close drawer</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
