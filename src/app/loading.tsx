import { Logo } from "@/components/brand/logo";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* header skeleton */}
      <div className="fixed inset-x-0 top-0 z-50 py-4">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="flex gap-4">
            <div className="hidden h-4 w-16 animate-pulse rounded bg-muted sm:block" />
            <div className="hidden h-4 w-16 animate-pulse rounded bg-muted sm:block" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <Logo size={40} />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading Study Flow...</p>
      </div>
    </div>
  );
}