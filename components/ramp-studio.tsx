"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { PageShell } from "@/components/page-shell";
import { RampEditor } from "@/components/ramp-editor";
import { ExportPanel } from "@/components/export-panel";
import { SavedRamps } from "@/components/saved-ramps";
import { ProjectBar } from "@/components/project-bar";
import { normalizeParams, type Ramp, type RampParams } from "@/lib/ramp";
import { useProjects, uid } from "@/lib/use-projects";
import { useTheme } from "@/lib/use-theme";

const DRAFT_KEY = "oklch-ramp:draft";
const INITIAL_PARAMS = normalizeParams({});

export function RampStudio() {
  const { theme, toggle } = useTheme();
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    hydrated,
    getProject,
    createProject,
    renameProject,
    deleteProject,
    addRamp,
    updateRamp,
    deleteRamp,
  } = useProjects();

  const [name, setName] = useState("Brand");
  const [params, setParams] = useState<RampParams>(INITIAL_PARAMS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Load the working draft once.
  useEffect(() => {
    try {
      const d = localStorage.getItem(DRAFT_KEY);
      if (d) {
        const draft = JSON.parse(d) as {
          name: string;
          params: RampParams;
          activeId: string | null;
        };
        setName(draft.name);
        setParams(normalizeParams(draft.params));
        setActiveId(draft.activeId ?? null);
      }
    } catch {
      /* ignore */
    }
    setDraftLoaded(true);
  }, []);

  // Persist the working draft.
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, params, activeId }));
    } catch {
      /* ignore */
    }
  }, [name, params, activeId, draftLoaded]);

  const activeProject = getProject(activeProjectId);
  const savedRamps = activeProject?.ramps ?? [];
  const isExisting = !!activeId && savedRamps.some((r) => r.id === activeId);
  const current: Ramp = { id: activeId ?? "draft", name, params };

  const patch = (p: Partial<RampParams>) =>
    setParams((prev) => ({ ...prev, ...p }));

  const save = () => {
    if (!activeProjectId) return;
    if (isExisting) {
      updateRamp(activeProjectId, { id: activeId!, name, params });
    } else {
      const id = uid();
      addRamp(activeProjectId, { id, name, params });
      setActiveId(id);
    }
  };

  const load = (r: Ramp) => {
    setName(r.name);
    setParams(normalizeParams(r.params));
    setActiveId(r.id);
  };

  const del = (id: string) => {
    if (activeProjectId) deleteRamp(activeProjectId, id);
    if (activeId === id) setActiveId(null);
  };

  const resetDraft = () => {
    setName("Untitled");
    setParams(INITIAL_PARAMS);
    setActiveId(null);
  };

  return (
    <PageShell
      header={
        <SiteHeader theme={theme} onToggleTheme={toggle} showTagline />
      }
    >
      {hydrated && activeProjectId && (
        <div className="border-b border-border px-6 py-4">
          <ProjectBar
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              rampCount: p.ramps.length,
            }))}
            activeId={activeProjectId}
            onSwitch={(id) => {
              setActiveProjectId(id);
              setActiveId(null);
            }}
            onCreate={(n) => {
              createProject(n);
              resetDraft();
            }}
            onRename={renameProject}
            onDelete={deleteProject}
          />
        </div>
      )}

      <div className="border-b border-border">
        <RampEditor
          name={name}
          params={params}
          onNameChange={setName}
          patch={patch}
          showInfo={showInfo}
          onShowInfoChange={setShowInfo}
          saveLabel={isExisting ? "Update" : "Save"}
          onSave={save}
          onReset={resetDraft}
          hydrated={hydrated && draftLoaded}
        />
      </div>

      <Card className="gap-4 border-b border-border py-6">
        <CardHeader className="px-6">
          <h2 className="font-display text-sm font-medium leading-none">
            Export
          </h2>
        </CardHeader>
        <CardContent className="px-6">
          <ExportPanel current={current} saved={savedRamps} />
        </CardContent>
      </Card>

      <Card className="gap-4 border-b border-border py-6">
        <CardHeader className="px-6">
          <h2 className="font-display text-sm font-medium leading-none">
            Ramps In {activeProject?.name ?? "project"}
          </h2>
        </CardHeader>
        <CardContent className="px-6">
          <SavedRamps
            saved={savedRamps}
            activeId={activeId}
            onLoad={load}
            onDelete={del}
          />
        </CardContent>
      </Card>
    </PageShell>
  );
}
