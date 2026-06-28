"use client";

import { useState } from "react";
import { Check, FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ProjectMeta {
  id: string;
  name: string;
  rampCount: number;
}

interface Props {
  projects: ProjectMeta[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectBar({
  projects,
  activeId,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: Props) {
  const active = projects.find((p) => p.id === activeId);
  const [mode, setMode] = useState<
    "idle" | "new" | "rename" | "confirmDelete"
  >("idle");
  const [draft, setDraft] = useState("");

  const cancel = () => {
    setMode("idle");
    setDraft("");
  };

  const commit = () => {
    const name = draft.trim();
    if (!name) return cancel();
    if (mode === "new") onCreate(name);
    else if (mode === "rename" && active) onRename(active.id, name);
    cancel();
  };

  if (mode === "new" || mode === "rename") {
    return (
      <div className="flex items-center gap-2">
        <span className="pl-1 text-xs text-muted-foreground">
          {mode === "new" ? "New project" : "Rename project"}
        </span>
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          placeholder="Project name"
          spellCheck={false}
          className="h-8 max-w-xs font-mono"
        />
        <Button size="sm" onClick={commit}>
          <Check />
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} aria-label="Cancel">
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2 pl-1">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Project
        </span>
        <select
          value={activeId}
          onChange={(e) => onSwitch(e.target.value)}
          aria-label="Active project"
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-popover">
              {p.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground tabular-nums">
          {active?.rampCount ?? 0} ramps
        </span>
      </div>

      <div className="flex items-center gap-1">
        {mode === "confirmDelete" ? (
          <>
            <span className="px-1 text-xs text-muted-foreground">
              Delete “{active?.name}” and its ramps?
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (active) onDelete(active.id);
                setMode("idle");
              }}
            >
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(active?.name ?? "");
                setMode("rename");
              }}
            >
              <Pencil />
              Rename
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMode("confirmDelete")}
              aria-label="Delete project"
            >
              <Trash2 />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setDraft("");
                setMode("new");
              }}
            >
              <FolderPlus />
              New
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
