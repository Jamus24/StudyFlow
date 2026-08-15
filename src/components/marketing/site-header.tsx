"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useUI } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { Menu, X, LayoutDashboard, Search } from "lucide-react";

const NAV = [
  { label: "Features", view: "features" as const, hash: "#features", section: "features" },
  { label: "Pricing", view: "pricing" as const, hash: "#pricing", section: "pricing" },
  { label: "Testimonials", view: "home" as const, hash: "#testimonials", section: "testimonials" },
  { label: "FAQ", view: "home" as const, hash: "#faq", section: "faq" },
  { label: "Contact", view: "contact" as const, hash: "#contact", section: undefined },
];

export function SiteHeader() {
  const { setView, openAuth, mobileNavOpen, setMobileNav, setCommandOpen } = useUI();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    let raf = 0;
    function handleScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        setScrolled(scrollY > 8);

        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        setScrollProgress(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);

        const sections = ["features", "pricing", "testimonials", "faq"];
        for (const id of sections) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 160) {
              setActiveSection(id);
            }
          }
        }
      });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "py-2.5" : "py-4"
      )}
    >
      {/* scroll progress bar */}
      {scrolled && (
        <div className="absolute inset-x-0 top-0 h-[2px] bg-border">
          <div
            className="h-full bg-brand transition-[width] duration-100"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className={cn(
            "flex items-center justify-between gap-4 rounded-2xl px-4 transition-all duration-300 sm:px-5",
            scrolled
              ? "glass-strong h-14 shadow-soft"
              : "h-14 border border-transparent"
          )}
        >
          <button
            onClick={() => setView("home")}
            className="ring-focus rounded-lg"
            aria-label="Study Flow home"
          >
            <Logo />
          </button>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <button
                key={n.label}
                onClick={() => {
                  setView(n.view);
                  if (n.hash !== "#contact") {
                    setTimeout(() => {
                      document.getElementById(n.section)?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }
                }}
                className={cn(
                  "ring-focus relative rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground",
                  activeSection === n.section
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {n.label}
                {activeSection === n.section && (
                  <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCommandOpen(true)}
              className="ring-focus hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
              aria-label="Open command palette"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search...</span>
              <kbd className="rounded border border-border/60 bg-background px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
            </button>
            <div className="hidden sm:block">
              <ThemeToggle compact />
            </div>
            {user ? (
              <Button size="sm" className="gap-1.5" onClick={() => setView("app")}>
                <LayoutDashboard className="h-4 w-4" />
                Open app
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={() => openAuth("login")}
                >
                  Sign in
                </Button>
                <Button size="sm" onClick={() => openAuth("register")} className="shadow-soft">
                  Start free
                </Button>
              </>
            )}
            <button
              className="ring-focus rounded-lg p-2 md:hidden"
              onClick={() => setMobileNav(!mobileNavOpen)}
              aria-label="Menu"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="mt-2 md:hidden">
            <div className="glass-strong rounded-2xl border p-2 shadow-soft">
              {NAV.map((n) => (
                <button
                  key={n.label}
                  onClick={() => {
                    setView(n.view);
                    setMobileNav(false);
                  }}
                  className={cn(
                    "block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-muted",
                    activeSection === n.section ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {n.label}
                </button>
              ))}
              <div className="mt-1 border-t border-border/50 pt-2">
                <div className="flex items-center justify-between px-2 pb-2">
                  <span className="text-xs text-muted-foreground">Theme</span>
                  <ThemeToggle compact />
                </div>
                {!user && (
                  <div className="flex gap-2 px-2 pb-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => { openAuth("login"); setMobileNav(false); }}
                    >
                      Sign in
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => { openAuth("register"); setMobileNav(false); }}
                    >
                      Start free
                    </Button>
                  </div>
                )}
                {user && (
                  <div className="px-2 pb-1">
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => { setView("app"); setMobileNav(false); }}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Open app
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
