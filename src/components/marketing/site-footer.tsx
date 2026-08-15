"use client";

import { Logo } from "@/components/brand/logo";
import { useUI } from "@/lib/store";
import { Github, Twitter, Linkedin, Keyboard } from "lucide-react";

const COLS: { title: string; links: { label: string; view?: "features" | "pricing" | "contact" | "privacy" | "terms" | "cookies"; hash?: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Features", view: "features" },
      { label: "Pricing", view: "pricing" },
      { label: "AI Tutor", view: "features" },
      { label: "Flashcards", view: "features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", view: "contact" },
      { label: "Testimonials", hash: "#testimonials" },
      { label: "Privacy Policy", view: "privacy" },
      { label: "Terms of Service", view: "terms" },
      { label: "Cookie Policy", view: "cookies" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help centre", view: "contact" },
      { label: "Report a bug", view: "contact" },
      { label: "Feature request", view: "contact" },
      { label: "Status page", view: "contact" },
    ],
  },
];

const SOCIALS = [
  { icon: Github, label: "GitHub", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
];

export function SiteFooter() {
  const { setView } = useUI();
  return (
    <footer className="mt-auto border-t border-border bg-card/40 relative">
      {/* gradient line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The study planner that thinks with you. Turn a syllabus into a focused week
              of work, then keep the momentum with spaced repetition and an AI tutor.
            </p>
            <a href="mailto:hello@studyflow.app" className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
              hello@studyflow.app
            </a>
            {/* social links */}
            <div className="mt-5 flex items-center gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-all duration-200 hover:border-foreground/15 hover:bg-accent hover:text-foreground hover:-translate-y-0.5 hover:shadow-soft"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            {/* keyboard shortcut hint */}
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Keyboard className="h-3.5 w-3.5" />
              <span>Press <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd> to open quick actions</span>
            </div>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground section-heading">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => {
                        if (l.hash) {
                          setView('home');
                          setTimeout(() => document.getElementById(l.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100);
                        } else if (l.view) {
                          setView(l.view);
                        }
                      }}
                      className="text-sm text-muted-foreground link-underline transition-colors hover:text-brand"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Study Flow Labs. Made for students.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setView("privacy")} className="transition-colors hover:text-foreground">
              Privacy
            </button>
            <button onClick={() => setView("terms")} className="transition-colors hover:text-foreground">
              Terms
            </button>
            <button onClick={() => setView("cookies")} className="transition-colors hover:text-foreground">
              Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}