"use client";

import { useState } from "react";
import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { PageShell } from "@/components/page-shell";
import { useProjects } from "@/lib/use-projects";
import { useTheme } from "@/lib/use-theme";
import { buildSwatches } from "@/lib/ramp";

export default function ProjectsPage() {
  const { theme, toggle } = useTheme();
  const { projects, hydrated, createProject } = useProjects();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const name = draft.trim();
    if (name) createProject(name);
    setDraft("");
    setCreating(false);
  };

  return (
    <PageShell header={<SiteHeader theme={theme} onToggleTheme={toggle} />}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            My Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Each project is a set of ramps you can reorder and export together.
          </p>
        </div>
        {creating ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setCreating(false);
                  setDraft("");
                }
              }}
              placeholder="Project name"
              spellCheck={false}
              className="h-10 w-56 font-mono"
            />
            <Button size="lg" onClick={commit}>
              Create
            </Button>
          </div>
        ) : (
          <Button size="lg" variant="outline" onClick={() => setCreating(true)}>
            <FolderPlus />
            New Project
          </Button>
        )}
      </div>

      <div className="px-6 py-6">
        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-muted/30"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group flex flex-col gap-4 rounded-2xl border border-border p-5 outline-none transition-colors hover:border-foreground/30 hover:bg-accent/30 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate font-display text-lg font-semibold tracking-tight">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {p.ramps.length} ramp{p.ramps.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {p.ramps.length === 0 ? (
                    <span className="text-xs text-muted-foreground">
                      No ramps yet.
                    </span>
                  ) : (
                    p.ramps.slice(0, 4).map((r) => (
                      <span
                        key={r.id}
                        className="flex h-5 overflow-hidden rounded-md border"
                      >
                        {buildSwatches(r.params).map((s) => (
                          <span
                            key={s.label}
                            className="flex-1"
                            style={{ backgroundColor: s.hex }}
                          />
                        ))}
                      </span>
                    ))
                  )}
                  {p.ramps.length > 4 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{p.ramps.length - 4} more
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
