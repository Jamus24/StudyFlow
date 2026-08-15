"use client";

import { useUI } from "@/lib/store";
import { CheckCircle2, Info, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastHost() {
  const toasts = useUI((s) => s.toasts);
  const dismissToast = useUI((s) => s.dismissToast);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card p-3.5 shadow-float",
            "animate-in slide-in-from-bottom-2 fade-in duration-300"
          )}
        >
          <div className="mt-0.5">
            {t.variant === "success" ? (
              <CheckCircle2 className="h-4.5 w-4.5 text-blue-500" />
            ) : t.variant === "destructive" ? (
              <AlertCircle className="h-4.5 w-4.5 text-destructive" />
            ) : (
              <Info className="h-4.5 w-4.5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight">{t.title}</p>
            {t.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => dismissToast(t.id)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
