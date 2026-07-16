import { cn } from "@/lib/utils";

export function Screen({
  children,
  className,
  withField = false,
  center = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Aplica a textura de "quadro tático" no fundo */
  withField?: boolean;
  /** Centraliza o conteúdo vertical e horizontalmente */
  center?: boolean;
}) {
  return (
    <main
      className={cn(
        "min-h-dvh w-full bg-base px-5 py-8 sm:px-8",
        withField && "tactics-field",
        center && "flex flex-col items-center justify-center",
        className
      )}
    >
      <div className="mx-auto w-full max-w-md sm:max-w-lg">{children}</div>
    </main>
  );
}
