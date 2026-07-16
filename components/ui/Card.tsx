"use client";

import { HTMLAttributes, forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLMotionProps<"div"> {
  interactive?: boolean;
  selected?: boolean;
  glow?: "none" | "gold" | "teal";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ interactive, selected, glow = "none", className, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.985 } : undefined}
        className={cn(
          "rounded-card border bg-surface p-4 shadow-card transition-colors duration-200",
          selected ? "border-gold" : "border-border-subtle",
          interactive && "cursor-pointer hover:border-border-strong hover:bg-surface-hover",
          glow === "gold" && "shadow-glow-gold",
          glow === "teal" && "shadow-glow-teal",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-sans text-base font-semibold text-text-primary", className)} {...props}>
      {children}
    </h3>
  );
}
