"use client";
// The five winning numbers pop in one by one; a small confetti burst plays if the user won.
import { motion, useReducedMotion } from "framer-motion";

const STEP = 0.25; // seconds between balls

export function RevealBalls({ numbers, matched = [], celebrate = false }: { numbers: number[]; matched?: number[]; celebrate?: boolean }) {
  const reduce = useReducedMotion();
  const hit = new Set(matched);
  return (
    <div className="relative flex gap-2">
      {numbers.map((n, i) => (
        <motion.span
          key={n}
          initial={reduce ? false : { scale: 0, rotate: -90, opacity: 0 }}
          whileInView={{ scale: 1, rotate: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 260, damping: 18, delay: i * STEP }}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${hit.has(n) ? "bg-emerald-500 text-zinc-950 ring-2 ring-amber-300" : "bg-emerald-500/15 text-emerald-300"}`}
        >
          {n}
        </motion.span>
      ))}
      {celebrate && !reduce && (
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
          {Array.from({ length: 18 }, (_, i) => {
            const angle = (i * 360) / 18;
            const dist = 60 + (i % 3) * 28;
            return (
              <motion.span
                key={i}
                className={`absolute h-2 w-2 rounded-full ${i % 2 ? "bg-amber-300" : "bg-emerald-400"}`}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                whileInView={{
                  x: Math.cos((angle * Math.PI) / 180) * dist,
                  y: Math.sin((angle * Math.PI) / 180) * dist,
                  opacity: [0, 1, 0],
                  scale: [0.4, 1, 0.6],
                }}
                viewport={{ once: true }}
                transition={{ duration: 1.1, delay: numbers.length * STEP + 0.1, ease: "easeOut" }}
              />
            );
          })}
        </span>
      )}
    </div>
  );
}
