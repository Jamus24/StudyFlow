import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWord = true,
  size = 28,
}: {
  className?: string;
  showWord?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="32" height="32" rx="8" fill="currentColor" className="text-brand" />
        <path
          d="M16 6.5c-3.6 0-6.5 2.9-6.5 6.5 0 2.4 1.3 4.5 3.2 5.6V23a1.5 1.5 0 0 0 1.5 1.5h3.6A1.5 1.5 0 0 0 19.3 23v-4.4c1.9-1.1 3.2-3.2 3.2-5.6 0-3.6-2.9-6.5-6.5-6.5Z"
          className="fill-white dark:fill-black"
        />
        <circle cx="16" cy="13" r="2.1" fill="currentColor" className="dark:fill-blue-300" />
        <rect x="13.4" y="24.6" width="5.2" height="1.6" rx="0.8" fill="white" className="dark:fill-black" />
      </svg>
      {showWord && (
        <span className="font-display text-[1.15rem] font-semibold tracking-tight text-foreground">
          Study Flow
        </span>
      )}
    </span>
  );
}
