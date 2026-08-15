"use client";

import { useState } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Loader2, CheckCircle2, MapPin, Clock, Send, Bug, Lightbulb, CreditCard, HelpCircle } from "lucide-react";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";

const SUBJECT_PRESETS = [
  { label: 'Bug report', value: 'Bug report', icon: Bug },
  { label: 'Feature request', value: 'Feature request', icon: Lightbulb },
  { label: 'Billing question', value: 'Billing question', icon: CreditCard },
  { label: 'General question', value: 'General question', icon: HelpCircle },
];

const CONTACT_INFO = [
  { icon: Mail, t: "Email", d: "hello@lumina.study" },
  { icon: Clock, t: "Support hours", d: "Mon–Fri, 09:00–18:00 SAST" },
  { icon: MapPin, t: "Based in", d: "Cape Town, South Africa" },
];

export function ContactPage() {
  const { pushToast } = useUI();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      await api("/api/contact", {
        method: "POST",
        json: {
          subject: (formData.get("subject") as string) || "Contact",
          name: formData.get("name") as string,
          email: formData.get("email") as string,
          message: formData.get("message") as string,
        },
      });
      setSent(true);
      pushToast({ title: "Message sent", description: "We'll reply within one business day.", variant: "success" });
    } catch {
      pushToast({ title: "Could not send", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-32 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <Badge variant="outline" className="mb-4 rounded-full">Contact</Badge>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Questions, bugs, or feedback – we read everything.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Most replies come within one business day. For billing or account issues, sign in first
              so we can find your account.
            </p>
            <div className="mt-8 space-y-3">
              {CONTACT_INFO.map((item) => (
                <div key={item.t} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/10">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.t}</p>
                    <p className="text-sm text-muted-foreground">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            {sent ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center py-10 text-center animate-fade-in-up">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/15 text-blue-500 animate-bounce-in">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h2 className="mt-4 font-display text-xl font-semibold">Thanks, message received</h2>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  We’ll reply to your email shortly. In the meantime, the FAQ may have what you need.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => useUI.getState().setView("home")}
                >
                  Back to FAQ
                </Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {/* subject presets */}
                <div>
                  <Label className="mb-1.5 text-xs font-medium text-foreground/80">Quick pick</Label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECT_PRESETS.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => {
                          const input = document.querySelector('input[name="subject"]') as HTMLInputElement;
                          if (input) input.value = p.value;
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-200 hover:border-foreground/15 hover:bg-accent hover:text-foreground tag-hover"
                      >
                        <p.icon className="h-3 w-3" />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label className={cn("mb-1.5 text-xs font-medium transition-colors", focusedField === 'name' ? 'text-brand' : 'text-foreground/80')}>Name</Label>
                    <Input
                      name="name"
                      required
                      placeholder="Your name"
                      className="h-11 transition-all duration-200"
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                  <div>
                    <Label className={cn("mb-1.5 text-xs font-medium transition-colors", focusedField === 'email' ? 'text-brand' : 'text-foreground/80')}>Email</Label>
                    <Input
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="h-11 transition-all duration-200"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>
                <div>
                  <Label className={cn("mb-1.5 text-xs font-medium transition-colors", focusedField === 'subject' ? 'text-brand' : 'text-foreground/80')}>Subject</Label>
                  <Input
                    name="subject"
                    required
                    placeholder="How can we help?"
                    className="h-11 transition-all duration-200"
                    onFocus={() => setFocusedField('subject')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                <div>
                  <Label className={cn("mb-1.5 text-xs font-medium transition-colors", focusedField === 'message' ? 'text-brand' : 'text-foreground/80')}>Message</Label>
                  <Textarea
                    name="message"
                    required
                    rows={6}
                    placeholder="Tell us what's going on..."
                    className="resize-none transition-all duration-200"
                    onFocus={() => setFocusedField('message')}
                    onBlur={() => setFocusedField(null)}
                  />
                </div>
                <Button type="submit" disabled={loading} className="h-11 w-full gap-2 tap-scale">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? 'Sending...' : 'Send message'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  We typically respond within one business day.
                </p>
              </form>
            )}
          </div>
        </div>

        <section className="mt-16 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-brand" />
            <h2 className="font-display text-xl font-semibold">Before you write, check these</h2>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              { q: "How do I reset my password?", a: "Use the \"Forgot password\" link on the sign-in dialog." },
              { q: "How do I cancel my subscription?", a: "Open Billing in the app sidebar and click \"Cancel plan\"." },
              { q: "Can I export my data?", a: "Yes. Go to Settings > Data > Export. You get a JSON file of everything." },
              { q: "Is there a free plan?", a: "Yes. The free plan includes 1 AI plan per week, 4 subjects, and manual flashcards." },
            ].map((item) => (
              <div key={item.q} className="rounded-xl border border-border p-4 transition-colors hover:border-foreground/10">
                <p className="text-sm font-medium">{item.q}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            More questions?{" "}
            <button onClick={() => useUI.getState().setView("home")} className="font-medium text-brand hover:underline">
              See the full FAQ
            </button>
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}


