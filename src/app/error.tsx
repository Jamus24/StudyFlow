"use client";

import { useEffect } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-md">
        <Logo size={48} />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-3 text-muted-foreground">
            An unexpected error occurred. This has been logged and we will look into it.
          </p>
          {error.message && (
            <p className="mt-3 font-mono text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 text-left break-all">
              {error.message}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button onClick={reset} className="gap-2 shadow-soft">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
