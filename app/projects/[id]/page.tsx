"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { PageShell } from "@/components/page-shell";
import { RampList } from "@/components/ramp-list";
import { RampEditModal } from "@/components/ramp-edit-modal";
import { ExportPanel } from "@/components/export-panel";
import { useProjects } from "@/lib/use-projects";
import { useTheme } from "@/lib/use-theme";
import type { Ramp } from "@/lib/ramp";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { theme, toggle } = useTheme();
  const {
    hydrated,
    getProject,
    renameProject,
    deleteProject,
    addRamp,
    updateRamp,
    deleteRamp,
    reorderRamps,
  } = useProjects();

  const project = getProject(id);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRamp, setEditingRamp] = useState<Ramp | null>(null);

  const header = <SiteHeader theme={theme} onToggleTheme={toggle} />;

  if (hydrated && !project) {
    return (
      <PageShell header={header}>
        <div className="flex flex-col items-start gap-4 px-6 py-16">
          <p className="text-sm text-muted-foreground">
            This project doesn&apos;t exist (it may have been deleted).
          </p>
          <Button variant="outline" asChild>
            <Link href="/projects">
              <ArrowLeft /> Back to projects
            </Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const ramps = project?.ramps ?? [];

  const openNew = () => {
    setEditingRamp(null);
    setModalOpen(true);
  };
  const openEdit = (r: Ramp) => {
    setEditingRamp(r);
    setModalOpen(true);
  };
  const onSaveRamp = (ramp: Ramp) => {
    if (!project) return;
    if (project.ramps.some((r) => r.id === ramp.id)) {
      updateRamp(project.id, ramp);
    } else {
      addRamp(project.id, ramp);
    }
  };

  const commitRename = () => {
    const n = nameDraft.trim();
    if (n && project) renameProject(project.id, n);
    setRenaming(false);
  };

  return (
    <PageShell header={header}>
      {/* Project title bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Back to projects">
            <Link href="/projects">
              <ArrowLeft />
            </Link>
          </Button>
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                className="h-10 w-64 font-mono"
                spellCheck={false}
              />
              <Button size="icon" onClick={commitRename} aria-label="Save name">
                <Check />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setRenaming(false)}
                aria-label="Cancel"
              >
                <X />
              </Button>
            </div>
          ) : (
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight">
              {project?.name ?? "…"}
            </h1>
          )}
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {ramps.length} ramp{ramps.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!renaming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNameDraft(project?.name ?? "");
                setRenaming(true);
              }}
            >
              <Pencil /> Rename
            </Button>
          )}
          {confirmDelete ? (
            <>
              <span className="text-xs text-muted-foreground">Delete project?</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (project) deleteProject(project.id);
                  router.push("/projects");
                }}
              >
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete project"
            >
              <Trash2 />
            </Button>
          )}
          <Button size="sm" onClick={openNew}>
            <Plus /> New Ramp
          </Button>
        </div>
      </div>

      {/* Ramp list */}
      <Card className="gap-4 border-b border-border py-6">
        <CardHeader className="flex-row items-center justify-between px-6">
          <h2 className="font-display text-sm font-medium leading-none">
            Ramps
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Drag to reorder — export follows this order.
          </span>
        </CardHeader>
        <CardContent className="px-6">
          {hydrated && project ? (
            <RampList
              ramps={ramps}
              onReorder={(from, to) => reorderRamps(project.id, from, to)}
              onEdit={openEdit}
              onDelete={(rampId) => deleteRamp(project.id, rampId)}
            />
          ) : (
            <div className="h-24 w-full animate-pulse rounded-lg bg-muted/20" />
          )}
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="gap-4 border-b border-border py-6">
        <CardHeader className="px-6">
          <h2 className="font-display text-sm font-medium leading-none">
            Export
          </h2>
        </CardHeader>
        <CardContent className="px-6">
          {ramps.length > 0 ? (
            <ExportPanel current={ramps[0]} saved={ramps} defaultScope="all" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Add a ramp to export this project.
            </p>
          )}
        </CardContent>
      </Card>

      <RampEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        ramp={editingRamp}
        onSave={onSaveRamp}
      />
    </PageShell>
  );
}
