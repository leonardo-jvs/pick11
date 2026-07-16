"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastItem } from "@/store/toastStore";

const ICONS: Record<ToastItem["variant"], React.ReactNode> = {
  info: <Info size={18} className="text-teal-bright" />,
  success: <CheckCircle2 size={18} className="text-teal-bright" />,
  urgent: <AlertTriangle size={18} className="text-gold" />,
};

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const t = setTimeout(() => dismiss(item.id), item.duration);
    return () => clearTimeout(t);
  }, [item, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "flex items-center gap-2.5 rounded-pill border border-border-subtle bg-surface-elevated px-4 py-2.5 shadow-card"
      )}
    >
      {ICONS[item.variant]}
      <span className="font-sans text-sm text-text-primary">{item.message}</span>
    </motion.div>
  );
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard item={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
