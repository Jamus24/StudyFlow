"use client";

import { useUI } from "@/lib/store";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Shield, Cookie, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { privacy: Shield, terms: Scale, cookies: Cookie } as const;

export function LegalPage({ kind }: { kind: "privacy" | "terms" | "cookies" }) {
  const { setView } = useUI();
  const content = LEGAL[kind];
  const Icon = ICONS[kind];
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-32 sm:px-6">
        {/* breadcrumb */}
        <button
          onClick={() => setView("home")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back home
        </button>

        {/* header */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{content.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Last updated {content.updated}</p>
          </div>
        </div>

        {/* sections */}
        <div className="mt-10 space-y-8">
          {content.sections.map((s, i) => (
            <section key={i} className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-foreground/10">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-lg font-semibold">{s.h}</h2>
              </div>
              <p className="mt-3 pl-10 text-sm leading-relaxed text-muted-foreground">{s.p}</p>
            </section>
          ))}
        </div>

        {/* footer CTA */}
        <div className="mt-12 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <FileText className="h-5 w-5 text-brand shrink-0" />
          <p className="text-sm text-muted-foreground">
            Questions about this?{" "}
            <button onClick={() => setView("contact")} className="font-medium text-foreground transition-colors hover:text-brand">
              Contact us
            </button>
            {" or "}
            <button onClick={() => setView("contact")} className="font-medium text-foreground transition-colors hover:text-brand">
              email privacy@lumina.study
            </button>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

const LEGAL = {
  privacy: {
    title: "Privacy Policy",
    updated: "June 2025",
    sections: [
      { h: "What we collect", p: "Account details you give us (name, email, password hash), and study content you create (subjects, tasks, notes, plans, flashcards, tutor chats). We also collect limited usage data: page views, feature usage and error logs to keep the service running and secure. We do not track you across other websites." },
      { h: "How we use it", p: "To provide the study-planning features, generate AI responses, and improve product reliability. We use aggregated, anonymised data to identify bugs and understand feature usage. We never sell your data, and we never share it with third parties for advertising." },
      { h: "AI processing", p: "When you generate a plan, flashcards or a tutor reply, your input is sent to our AI provider to produce the response. We minimise what is sent and do not store prompts beyond what is needed to show your conversation history. AI providers are bound by their own data-processing agreements." },
      { h: "Data retention", p: "Your data is kept for as long as your account is active. If you delete your account, all associated data is permanently removed within 24 hours, including backups. Inactive accounts older than 12 months may be notified before scheduled deletion." },
      { h: "Your rights", p: "You can export or delete your data at any time from Settings > Data. Export produces a JSON file of all your content. Deletion is permanent and cascades to all associated records. You may also request a copy of your data by emailing privacy@lumina.study." },
      { h: "Security", p: "Passwords are hashed with bcrypt. Sessions use signed HTTP-only cookies. The database is access-controlled and backups are encrypted at rest. We conduct regular security reviews and respond to reported vulnerabilities." },
      { h: "Contact", p: "Email privacy@lumina.study with questions or data requests. We respond within 30 days as required by POPIA." },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "June 2025",
    sections: [
      { h: "Using Study Flow", p: "Study Flow is a study-planning tool. You agree to use it lawfully and not to abuse, reverse-engineer, or disrupt the service. Accounts are personal and may not be shared or transferred." },
      { h: "Your content", p: "You retain ownership of content you create. You grant us a limited licence to process it to deliver the features, including AI generation you request. This licence ends when you delete the content or your account." },
      { h: "Subscriptions", p: "Paid plans renew automatically until canceled. You can cancel anytime from Billing; access continues until the end of the current billing cycle. Refunds for unused time are handled case by case. Price changes are communicated 30 days in advance." },
      { h: "Acceptable AI use", p: "AI output is a study aid, not a source of truth. You are responsible for verifying answers before relying on them in exams or coursework. Study Flow does not guarantee accuracy of AI-generated content." },
      { h: "Intellectual property", p: "The Study Flow name, logo, and interface design are our intellectual property. You may not copy, modify, or create derivative works from the service. User-generated content remains yours." },
      { h: "Limitation of liability", p: "Study Flow is provided \"as is\". We are not liable for indirect or consequential damages, or for academic outcomes resulting from use of the tool. Our total liability is limited to amounts paid in the past 12 months." },
      { h: "Changes", p: "We may update these terms with 30 days' notice via email and in-app notification. Continued use after changes constitutes acceptance. Material changes to data practices require explicit consent." },
      { h: "Governing law", p: "These terms are governed by the laws of South Africa. Any disputes shall be resolved in the courts of Cape Town." },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: "June 2025",
    sections: [
      { h: "Essential cookies", p: "We use HTTP-only session cookies to keep you signed in. We also store a preference cookie for your theme and sidebar state. These are required for the app to function and cannot be disabled." },
      { h: "Analytics", p: "We use privacy-respecting, aggregated analytics to understand reliability and performance. We do not use cross-site tracking cookies. Analytics data is not linked to your account." },
      { h: "AI session data", p: "When you interact with the AI tutor or generate plans, temporary session data is processed. This is not stored in cookies and is cleared when your session ends." },
      { h: "Your choices", p: "You can decline non-essential cookies from the cookie banner. Essential cookies remain because without them the app cannot keep you signed in. You can clear cookies in your browser settings at any time." },
      { h: "Managing cookies", p: "Clearing cookies in your browser will sign you out. Your study data is unaffected because it lives in your account on our servers, not in your browser. Re-accepting cookies will restore your preference settings." },
      { h: "Third-party services", p: "We may embed content from trusted services (e.g. fonts, icons). These services may set their own cookies. We do not control third-party cookies and recommend reviewing their policies." },
      { h: "Updates to this policy", p: "We may update this cookie policy. Changes will be communicated via the cookie banner or in-app notification. Continued use constitutes acceptance." },
    ],
  },
};
