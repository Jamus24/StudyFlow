"use client";

import { useEffect, useState, useRef } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    function handleScroll() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        setShow(scrollY > 400);
        setProgress(docHeight > 0 ? Math.min(scrollY / docHeight, 1) : 0);
      });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-5 right-5 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-all duration-300 hover:bg-accent hover:text-foreground hover:shadow-float"
      aria-label="Back to top"
    >
      {/* progress ring */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44" fill="none">
        <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="2" className="text-border" />
        <circle
          cx="22" cy="22" r="20"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`${2 * Math.PI * 20}`}
          strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress)}`}
          strokeLinecap="round"
          className="text-brand transition-[stroke-dashoffset] duration-150"
        />
      </svg>
      <ArrowUp className="relative h-4 w-4" />
    </button>
  );
}
