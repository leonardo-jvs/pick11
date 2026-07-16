import { cn } from "@/lib/utils";
import { Position } from "@/types/player";

export function Tag({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border border-border-subtle bg-surface-elevated px-2.5 py-1 font-sans text-xs text-text-secondary",
        className
      )}
    >
      {children}
    </span>
  );
}

const POSITION_STYLES: Record<Position, string> = {
  GOL: "bg-gold/15 text-gold border-gold/30",
  ZAG: "bg-teal-dim/20 text-teal-bright border-teal-dim/40",
  LAT: "bg-teal-dim/20 text-teal-bright border-teal-dim/40",
  VOL: "bg-text-tertiary/15 text-text-secondary border-border-strong",
  MEI: "bg-text-tertiary/15 text-text-secondary border-border-strong",
  ATA: "bg-danger/15 text-danger border-danger/30",
};

export function PositionBadge({ position, className }: { position: Position; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide",
        POSITION_STYLES[position],
        className
      )}
    >
      {position}
    </span>
  );
}

/**
 * Mostra o Overall Final com o delta de compatibilidade, ex: "84 (+2)".
 * Nunca exibe o cálculo — só o resultado, conforme regra do produto.
 */
export function OverallBadge({
  overallFinal,
  delta,
  size = "md",
  className,
}: {
  overallFinal: number;
  delta: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const deltaColor = delta > 0 ? "text-teal-bright" : delta < 0 ? "text-danger" : "text-text-tertiary";
  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-3xl",
  };
  return (
    <div className={cn("flex items-baseline gap-1 font-mono", className)}>
      <span className={cn("font-semibold text-text-primary", sizeClasses[size])}>{overallFinal}</span>
      {delta !== 0 && (
        <span className={cn("text-xs font-medium", deltaColor)}>
          ({delta > 0 ? "+" : ""}
          {delta})
        </span>
      )}
    </div>
  );
}

export function StatusDot({ status }: { status: "ready" | "waiting" | "live" }) {
  const styles = {
    ready: "bg-teal shadow-glow-teal",
    waiting: "bg-text-tertiary",
    live: "bg-danger animate-pulse-ring",
  };
  return <span className={cn("inline-block size-2.5 rounded-full", styles[status])} />;
}
