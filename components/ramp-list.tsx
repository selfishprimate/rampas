"use client";

import { useRef, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { buildSwatches, slug, type Ramp } from "@/lib/ramp";

interface Props {
  ramps: Ramp[];
  onReorder: (from: number, to: number) => void;
  onEdit: (ramp: Ramp) => void;
  onDelete: (rampId: string) => void;
}

export function RampList({ ramps, onReorder, onEdit, onDelete }: Props) {
  const dragIndexRef = useRef<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (ramps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No ramps yet. Add one to start building this project's set.
      </p>
    );
  }

  const reset = () => {
    dragIndexRef.current = null;
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <ul className="flex flex-col gap-1.5">
      {ramps.map((r, i) => {
        const swatches = buildSwatches(r.params);
        const dragging = dragIndex === i;
        const over = overIndex === i && dragIndex !== null && dragIndex !== i;
        return (
          <li
            key={r.id}
            draggable
            onDragStart={() => {
              dragIndexRef.current = i;
              setDragIndex(i);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragIndexRef.current;
              if (from !== null) onReorder(from, i);
              reset();
            }}
            onDragEnd={reset}
            className={
              "group flex items-center gap-3 rounded-lg border p-2 transition-colors " +
              (dragging
                ? "border-border opacity-40"
                : over
                  ? "border-foreground/40 bg-accent/40"
                  : "border-transparent hover:bg-accent/40")
            }
          >
            <span
              className="flex cursor-grab items-center text-muted-foreground active:cursor-grabbing"
              aria-hidden
            >
              <GripVertical className="size-4" />
            </span>

            <span className="flex h-7 shrink-0 overflow-hidden rounded-md border">
              {swatches.map((s) => (
                <span
                  key={s.label}
                  className="w-2"
                  style={{ backgroundColor: s.hex }}
                />
              ))}
            </span>

            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{r.name}</span>
              <span className="truncate text-[10px] text-muted-foreground">
                --{slug(r.name)} · H {Math.round(r.params.hue)} ·{" "}
                {r.params.stops.length} stops
              </span>
            </span>

            <button
              onClick={() => onEdit(r)}
              aria-label={`Edit ${r.name}`}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={() => onDelete(r.id)}
              aria-label={`Delete ${r.name}`}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
