"use client";

import { Trash2 } from "lucide-react";
import { buildSwatches, slug, type Ramp } from "@/lib/ramp";

interface Props {
  saved: Ramp[];
  activeId: string | null;
  onLoad: (r: Ramp) => void;
  onDelete: (id: string) => void;
}

export function SavedRamps({ saved, activeId, onLoad, onDelete }: Props) {
  if (saved.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No saved ramps yet. Tune a ramp and save it to build a set, then export
        them together.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {saved.map((r) => {
        const swatches = buildSwatches(r.params);
        const active = r.id === activeId;
        return (
          <li
            key={r.id}
            className={
              "group flex items-center gap-3 rounded-lg p-2 transition-colors " +
              (active ? "bg-accent/60" : "hover:bg-accent/40")
            }
          >
            <button
              onClick={() => onLoad(r)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
            >
              <span className="flex h-7 shrink-0 overflow-hidden rounded-md border">
                {swatches.map((s) => (
                  <span
                    key={s.label}
                    className="w-2"
                    style={{ backgroundColor: s.hex }}
                  />
                ))}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{r.name}</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  --{slug(r.name)} · H {Math.round(r.params.hue)} ·{" "}
                  {r.params.stops.length} stops
                </span>
              </span>
            </button>
            <button
              onClick={() => onDelete(r.id)}
              aria-label={`Delete ${r.name}`}
              className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
