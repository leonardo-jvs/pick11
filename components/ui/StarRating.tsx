import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  max = 5,
  size = "md",
  className,
}: {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizePx = { sm: 12, md: 16, lg: 20 }[size];
  return (
    <div className={cn("flex items-center gap-0.5", className)} aria-label={`Compatibilidade ${value} de ${max} estrelas`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={sizePx}
          className={i < value ? "fill-gold text-gold" : "fill-transparent text-border-strong"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}
