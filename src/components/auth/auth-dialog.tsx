"use client";

import { useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/logo";
import { useUI, useAuthStore } from "@/lib/store";
import { api } from "@/lib/fetch";
import { useAuth } from "@/lib/use-auth";
import { Loader2, Mail, Lock, User, ArrowRight, CheckCircle2, Sparkles, Eye, EyeOff, AlertTriangle, Check as CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";


type Mode = "login" | "register" | "forgot";

const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '123456', '12345678', '123456789', '1234567890',
  'qwerty', 'abc123', 'monkey', 'master', 'dragon', '111111', 'baseball', 'iloveyou',
  'trustno1', 'sunshine', 'princess', 'football', 'shadow', 'superman', 'michael',
  'letmein', 'welcome', 'admin', 'login', 'passw0rd', 'hello', 'charlie',
  'donald', 'qwerty123', 'student', 'lumina', 'lumina123',
]);

function getPasswordStrength(password: string): { score: number; label: string; color: string; isCommon: boolean } {
  let score = 0;
  const isCommon = COMMON_PASSWORDS.has(password.toLowerCase());
  if (isCommon) return { score: 0, label: 'Too common', color: 'bg-destructive', isCommon: true };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-destructive', isCommon: false };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500', isCommon: false };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-500', isCommon: false };
  return { score, label: 'Strong', color: 'bg-blue-500', isCommon: false };
}

export function AuthDialog() {
  const { authOpen, authMode, closeAuth, setAuthMode, pushToast, setView } = useUI();
  const { setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErrs, setFieldErrs] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");

  const passwordStrength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue]);

  // reset errors when switching mode
  useEffect(() => {
    setErr(null);
    setFieldErrs({});
    setShowPassword(false);
    setPasswordValue("");
  }, [authMode]);

  if (!authOpen) return null;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setFieldErrs({});
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries()) as Record<string, string>;
    try {
      if (authMode === "login") {
        const { user } = await api<{ user: any }>("/api/auth/login", { method: "POST", json: { email: payload.email, password: payload.password } });
        setUser(user);
        pushToast({ title: "Welcome back", variant: "success" });
        closeAuth();
        setView("app");
      } else if (authMode === "register") {
        const { user } = await api<{ user: any }>("/api/auth/register", { method: "POST", json: { name: payload.name, email: payload.email, password: payload.password } });
        setUser(user);
        pushToast({ title: "Account created", description: "Welcome to Study Flow.", variant: "success" });
        closeAuth();
        setView("app");
      } else {
        await api("/api/auth/forgot", { method: "POST", json: { email: payload.email } });
        pushToast({ title: "Check your inbox", description: "If an account exists, a reset link is on its way.", variant: "success" });
        setAuthMode("login");
      }
    } catch (e: any) {
      setErr(e.message || "Something went wrong");
      if (e.details && typeof e.details === "object") {
        setFieldErrs(e.details as Record<string, string>);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={(o) => !o && closeAuth()}>
      <DialogContent aria-describedby='auth-desc' className="max-w-[440px] gap-0 overflow-hidden border-border bg-card p-0 sm:rounded-2xl">
        <div className='pointer-events-none absolute inset-x-0 top-0 h-32 -z-10 bg-brand/5' />
        <DialogTitle className="sr-only">{authMode === "login" ? "Sign in" : authMode === "register" ? "Create account" : "Reset password"}</DialogTitle>
        <p id='auth-desc' className='sr-only'>{authMode === 'login' ? 'Enter your email and password to sign in' : authMode === 'register' ? 'Create a new account' : 'Enter your email to reset your password'}</p>

        <div className="p-6 sm:p-7">
          <button onClick={() => { closeAuth(); setView("home"); }} className="ring-focus rounded-lg">
            <Logo />
          </button>

          <div className="mt-5">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {authMode === "login" ? "Welcome back" : authMode === "register" ? "Create your account" : "Reset your password"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {authMode === "login"
                ? "Sign in to pick up where you left off."
                : authMode === "register"
                ? "Your first AI study plan is ready in under a minute."
                : "We'll email you a link to set a new one."}
            </p>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            {authMode === "register" && (
              <Field label="Name" icon={<User className="h-4 w-4" />} error={fieldErrs.name}>
                <Input name="name" placeholder="Mia Chen" autoComplete="name" required className="h-11 pl-10" />
              </Field>
            )}
            <Field label="Email" icon={<Mail className="h-4 w-4" />} error={fieldErrs.email}>
              <Input name="email" type="email" placeholder="you@school.edu" autoComplete="email" required className="h-11 pl-10" />
            </Field>
            {authMode !== "forgot" && (
              <Field label="Password" icon={<Lock className="h-4 w-4" />} error={fieldErrs.password}>
                <div className="relative">
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="8+ characters"
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    required
                    className="h-11 pl-10 pr-10"
                    onChange={(e) => setPasswordValue(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {authMode === "register" && passwordValue && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-0.5">
                        {[1, 2, 3, 4].map((n) => (
                          <div
                            key={n}
                            className={cn(
                              "h-full flex-1 rounded-full transition-all duration-300",
                              n <= passwordStrength.score ? passwordStrength.color : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium transition-colors",
                        passwordStrength.isCommon ? "text-destructive" : "text-muted-foreground"
                      )}>{passwordStrength.label}</span>
                    </div>
                    {passwordStrength.isCommon && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-destructive animate-scale-in">
                        <AlertTriangle className="h-3 w-3" />
                        This password is too common. Try adding numbers or symbols.
                      </div>
                    )}
                    {!passwordStrength.isCommon && passwordStrength.score >= 2 && (
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                        {[
                          { ok: passwordValue.length >= 8, t: '8+ chars' },
                          { ok: /[A-Z]/.test(passwordValue), t: 'Uppercase' },
                          { ok: /[0-9]/.test(passwordValue), t: 'Number' },
                          { ok: /[^A-Za-z0-9]/.test(passwordValue), t: 'Symbol' },
                        ].map((r) => (
                          <span key={r.t} className={cn(
                            'flex items-center gap-1 text-[10px] transition-colors',
                            r.ok ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground/50'
                          )}>
                            <CheckIcon className="h-2.5 w-2.5" />
                            {r.t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Field>
            )}
            {authMode === "register" && (
              <p className="text-xs text-muted-foreground">
                8+ characters. We hash with bcrypt and never store the plain text.
              </p>
            )}
            {authMode === "login" && (
              <div className="flex justify-end">
                <button type="button" onClick={() => setAuthMode("forgot")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            {err && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {err}
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full gap-2 shadow-soft tap-scale">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {authMode === "login" ? "Sign in" : authMode === "register" ? "Create account" : "Send reset link"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {authMode === "register" && (
            <ul className="mt-4 space-y-1.5">
              {["14-day Pro trial, no card", "Export & delete anytime", "Works on mobile"].map((b) => (
                <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" /> {b}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {authMode === "login" ? (
              <>
                New to Study Flow?{" "}
                <button onClick={() => setAuthMode("register")} className="font-medium text-foreground hover:text-brand transition-colors">
                  Create an account
                </button>
              </>
            ) : authMode === "register" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setAuthMode("login")} className="font-medium text-foreground hover:text-brand transition-colors">
                  Sign in
                </button>
              </>
            ) : (
              <>
                Remembered it?{" "}
                <button onClick={() => setAuthMode("login")} className="font-medium text-foreground hover:text-brand transition-colors">
                  Back to sign in
                </button>
              </>
            )}
          </div>

          {authMode !== "forgot" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              Try the demo: {" "}
              <code className="font-mono text-foreground">student@lumina.study / student123</code>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, icon, error, children }: { label: string; icon?: React.ReactNode; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 text-xs font-medium text-foreground/80">{label}</Label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
