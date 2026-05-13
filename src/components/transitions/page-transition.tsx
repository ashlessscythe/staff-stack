"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Wraps the app shell with a pure-opacity cross-fade keyed on the current pathname.
 * We intentionally avoid translating the wrapper because any Y movement can briefly
 * overflow the viewport and cause the scrollbar to appear/disappear during the swap.
 *
 * Honors `prefers-reduced-motion` by collapsing the animation to a no-op.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { duration: reduce ? 0 : 0.18, delay: reduce ? 0 : 0.1, ease: "easeOut" },
        }}
        exit={{
          opacity: 0,
          transition: { duration: reduce ? 0 : 0.1, delay: reduce ? 0 : 0.1, ease: "easeIn" },
        }}
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
