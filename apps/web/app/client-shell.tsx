"use client";

import { MotionConfig } from "framer-motion";
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import CommandPalette from "./command-palette";

export default function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            className="route-transition"
            key={pathname}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.16 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        <CommandPalette />
      </div>
    </MotionConfig>
  );
}