"use client";

import { useEffect, useRef } from "react";

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: "circle" | "square" | "triangle";
}

const COLORS = ["#2563eb", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#06b6d4"];

interface ConfettiProps {
  fire: boolean;
  duration?: number;
  count?: number;
  onComplete?: () => void;
}

export function Confetti({ fire, duration = 3000, count = 80, onComplete }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!fire) return;
    completedRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const shapes: ConfettiPiece["shape"][] = ["circle", "square", "triangle"];
    const pieces: ConfettiPiece[] = Array.from({ length: count }).map(() => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight / 3 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -8 - 4,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));

    const gravity = 0.3;
    const friction = 0.99;

    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of pieces) {
        p.vy += gravity;
        p.vx *= friction;
        p.vy *= friction;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (p.y < canvas.height + 50) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, 1 - (p.y / canvas.height) * 0.5);
          if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.shape === "square") {
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          } else {
            ctx.beginPath();
            ctx.moveTo(0, -p.size / 2);
            ctx.lineTo(p.size / 2, p.size / 2);
            ctx.lineTo(-p.size / 2, p.size / 2);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        }
      }
      if (alive) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    const timeout = setTimeout(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }, duration);

    return () => {
      window.removeEventListener("resize", resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(timeout);
    };
  }, [fire, duration, count, onComplete]);

  if (!fire) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[100]"
      style={{ width: "100vw", height: "100vh" }}
      aria-hidden="true"
    />
  );
}
