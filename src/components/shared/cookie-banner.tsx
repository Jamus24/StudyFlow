"use client";

import { useEffect, useState } from "react";
import { useUI } from "@/lib/store";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CookieBanner() {
  const cookieConsent = useUI((s) => s.cookieConsent);
  const setCookieConsent = useUI((s) => s.setCookieConsent);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (cookieConsent) return;
    const t = setTimeout(() => setVisible(true), 2200);
    return () => clearTimeout(t);
  }, [cookieConsent]);

  function dismiss(consent: string) {
    setExiting(true);
    setTimeout(() => {
      setCookieConsent(consent);
      setExiting(false);
    }, 200);
  }

  if (cookieConsent || !visible) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-[60] w-[min(380px,calc(100vw-2rem))] transition-all duration-200 ${exiting ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}>
      <div className="glass-strong shadow-float rounded-2xl border p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Cookies</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              We use essential cookies to keep you signed in.{" "}
              <button
                onClick={() => useUI.getState().setView("cookies")}
                className="font-medium text-foreground underline underline-offset-2 hover:text-brand transition-colors"
              >
                Policy
              </button>
            </p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                onClick={() => dismiss("denied")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
              <Button size="sm" className="h-7 px-3 text-xs tap-scale" onClick={() => dismiss("granted")}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
