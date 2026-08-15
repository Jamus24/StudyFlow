import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo size={48} />
        <div>
          <h1 className="font-display text-6xl font-bold text-foreground tabular-nums">404</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            This page does not exist or has been moved.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/">
            <Button size="lg" className="gap-2 shadow-soft">
              Go home
            </Button>
          </Link>
          <Link href="/?view=contact">
            <Button size="lg" variant="outline">
              Contact us
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          If you think this is a mistake, please let us know.
        </p>
      </div>
    </div>
  );
}
