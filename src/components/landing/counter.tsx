"use client";
// Number that counts up when it scrolls into view (used for "raised for charity").
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

export function AnimatedCounter({ value, prefix = "" }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) { setN(value); return; }
    const controls = animate(0, value, { duration: 1.6, ease: "easeOut", onUpdate: (v) => setN(v) });
    return () => controls.stop();
  }, [inView, value, reduce]);

  return <span ref={ref}>{prefix}{Math.round(n).toLocaleString("en-IN")}</span>;
}
