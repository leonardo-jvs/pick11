"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ROUTES } from "@/constants/routes";

const AUTO_ADVANCE_MS = 2200;

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push(ROUTES.menu), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main
      className="tactics-field flex min-h-dvh cursor-pointer flex-col items-center justify-center gap-6 bg-base"
      onClick={() => router.push(ROUTES.menu)}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <div className="relative">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 -z-10 rounded-full bg-gold blur-3xl"
          />
          <h1 className="font-display text-7xl tracking-wide text-gold sm:text-8xl">PICK11</h1>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex items-center gap-2"
        >
          <span className="h-px w-8 bg-border-strong" />
          <p className="font-sans text-xs uppercase tracking-[0.2em] text-text-tertiary">
            Draft. Escale. Vença.
          </p>
          <span className="h-px w-8 bg-border-strong" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 120 }}
        transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: "linear" }}
        className="h-[3px] overflow-hidden rounded-pill bg-teal/70"
      />
    </main>
  );
}
