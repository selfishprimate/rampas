"use client";

import Link from "next/link";
import { Github, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Theme } from "@/lib/use-theme";

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
  /** Show the tagline paragraph (home page only). */
  showTagline?: boolean;
}

export function SiteHeader({ theme, onToggleTheme, showTagline = false }: Props) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-6">
      <div className="flex flex-col gap-1.5">
        <Link
          href="/"
          className="font-display text-2xl font-semibold tracking-tight outline-none transition-opacity hover:opacity-80"
        >
          Rampas
        </Link>
        {showTagline && (
          <p className="max-w-2xl text-sm text-muted-foreground">
            Perceptual primitive ramps with bell-curve chroma. One ramp feeds
            both light and dark — dense at both ends, no muddiness at the
            extremes. Export to Tailwind{" "}
            <code className="text-foreground/80">@theme</code>, CSS variables, or
            DTCG.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="lg" asChild>
          <Link href="/projects">My Projects</Link>
        </Button>
        <Button variant="default" size="lg">
          Sign In
        </Button>
        <button
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light" : "Switch to dark"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {theme === "dark" ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </button>
        <a
          href="https://github.com/selfishprimate/rampas"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="View source on GitHub"
          title="GitHub"
          className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Github className="size-5" />
        </a>
      </div>
    </header>
  );
}
