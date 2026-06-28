import type { ReactNode } from "react";

interface Props {
  header: ReactNode;
  children: ReactNode;
}

/** Framed page: diagonal-striped gutters, centred ≤1560px column, shared footer. */
export function PageShell({ header, children }: Props) {
  return (
    <div className="grid min-h-screen w-full justify-center grid-cols-[56px_minmax(0,1560px)_56px]">
      <div aria-hidden className="page-gutter border-x border-border" />
      <main className="min-w-0">
        {header}
        {children}
        <footer className="border-t border-border px-6 py-8">
          <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="font-medium text-foreground/80">Rampas</span> —
              perceptual primitive colour ramps for design-system tokens.
            </span>
            <span className="font-mono">
              Next.js · Tailwind v4 · shadcn · stored locally
            </span>
          </div>
        </footer>
      </main>
      <div aria-hidden className="page-gutter border-x border-border" />
    </div>
  );
}
