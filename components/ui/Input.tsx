"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="font-sans text-xs font-medium text-text-secondary">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-12 rounded-card border border-border-subtle bg-surface px-4 font-sans text-[15px] text-text-primary placeholder:text-text-tertiary",
            "transition-colors duration-200 outline-none",
            "focus:border-gold focus:ring-1 focus:ring-gold/40",
            error && "border-danger focus:border-danger focus:ring-danger/40",
            props.disabled && "cursor-not-allowed opacity-60",
            className
          )}
          {...props}
        />
        {error && <span className="font-sans text-xs text-danger">{error}</span>}
        {hint && !error && <span className="font-sans text-xs text-text-tertiary">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
