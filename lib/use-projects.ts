"use client";

import { useCallback, useEffect, useState } from "react";
import { type Project, type Ramp } from "./ramp";

const PROJECTS_KEY = "oklch-ramp:projects:v1";
const LEGACY_SAVED_KEY = "oklch-ramp:saved";

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function makeProject(name: string, ramps: Ramp[] = []): Project {
  return { id: uid(), name, ramps, createdAt: Date.now() };
}

interface Persisted {
  projects: Project[];
  activeProjectId: string;
}

function loadProjects(): Persisted {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<Persisted>;
      let projects = data.projects ?? [];
      if (projects.length === 0) projects = [makeProject("Invisible")];
      let active = data.activeProjectId ?? "";
      if (!projects.some((p) => p.id === active)) active = projects[0].id;
      return { projects, activeProjectId: active };
    }
    // Migrate the legacy flat ramp list into a first project.
    const legacy = localStorage.getItem(LEGACY_SAVED_KEY);
    const ramps: Ramp[] = legacy ? JSON.parse(legacy) : [];
    const projects = [makeProject("Invisible", ramps)];
    return { projects, activeProjectId: projects[0].id };
  } catch {
    const projects = [makeProject("Invisible")];
    return { projects, activeProjectId: projects[0].id };
  }
}

/**
 * Shared project store backed by localStorage. Each route mounts its own
 * instance and reads fresh on mount — only one page is mounted at a time, so
 * this keeps pages in sync without a global store.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const { projects, activeProjectId } = loadProjects();
    setProjects(projects);
    setActiveProjectId(activeProjectId);
    setHydrated(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        PROJECTS_KEY,
        JSON.stringify({ projects, activeProjectId }),
      );
    } catch {
      /* ignore */
    }
  }, [projects, activeProjectId, hydrated]);

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  );

  const updateRamps = useCallback(
    (projectId: string, fn: (ramps: Ramp[]) => Ramp[]) =>
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, ramps: fn(p.ramps) } : p,
        ),
      ),
    [],
  );

  const createProject = useCallback((name: string): Project => {
    const proj = makeProject(name);
    setProjects((prev) => [...prev, proj]);
    setActiveProjectId(proj.id);
    return proj;
  }, []);

  const renameProject = useCallback(
    (id: string, name: string) =>
      setProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name } : p)),
      ),
    [],
  );

  const deleteProject = useCallback(
    (id: string) =>
      setProjects((prev) => {
        let next = prev.filter((p) => p.id !== id);
        if (next.length === 0) next = [makeProject("Invisible")];
        setActiveProjectId((cur) =>
          cur === id || !next.some((p) => p.id === cur) ? next[0].id : cur,
        );
        return next;
      }),
    [],
  );

  const addRamp = useCallback(
    (projectId: string, ramp: Ramp) =>
      updateRamps(projectId, (ramps) => [...ramps, ramp]),
    [updateRamps],
  );

  const updateRamp = useCallback(
    (projectId: string, ramp: Ramp) =>
      updateRamps(projectId, (ramps) =>
        ramps.map((r) => (r.id === ramp.id ? ramp : r)),
      ),
    [updateRamps],
  );

  const deleteRamp = useCallback(
    (projectId: string, rampId: string) =>
      updateRamps(projectId, (ramps) => ramps.filter((r) => r.id !== rampId)),
    [updateRamps],
  );

  const reorderRamps = useCallback(
    (projectId: string, from: number, to: number) =>
      updateRamps(projectId, (ramps) => {
        if (
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= ramps.length ||
          to >= ramps.length
        ) {
          return ramps;
        }
        const next = ramps.slice();
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      }),
    [updateRamps],
  );

  return {
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
    reorderRamps,
  };
}
