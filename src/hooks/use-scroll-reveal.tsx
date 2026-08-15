"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

interface UseScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Returns a ref and `revealed` boolean.
 * The element starts invisible (opacity-0 translate-y-4)
 * and gets `animate-slide-up-fade` class once it enters the viewport.
 */
export function useScrollReveal<T extends HTMLElement>({
  threshold = 0.12,
  rootMargin = "0px 0px -40px 0px",
  once = true,
}: UseScrollRevealOptions = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setRevealed(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, revealed];
}

/**
 * Reusable component that wraps children and reveals them on scroll.
 */
export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, revealed] = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms, transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
