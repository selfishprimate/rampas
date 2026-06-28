"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  exportRamps,
  exportFilename,
  FORMAT_LABELS,
  type ExportFormat,
} from "@/lib/export";
import type { Ramp } from "@/lib/ramp";

interface Props {
  current: Ramp;
  saved: Ramp[];
}

export function ExportPanel({ current, saved }: Props) {
  const [format, setFormat] = useState<ExportFormat>("theme");
  const [scope, setScope] = useState<"current" | "all">("current");
  const [copied, setCopied] = useState(false);

  const hasSet = saved.length > 0;
  const ramps = scope === "all" && hasSet ? saved : [current];
  const code = exportRamps(format, ramps);
  const filename = exportFilename(
    format,
    scope === "all" ? undefined : current.name,
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
          <TabsList>
            {(Object.keys(FORMAT_LABELS) as ExportFormat[]).map((f) => (
              <TabsTrigger key={f} value={f}>
                {FORMAT_LABELS[f]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-[3px] text-sm">
          <button
            onClick={() => setScope("current")}
            className={
              "rounded-md px-2.5 py-1 transition-colors " +
              (scope === "current"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground")
            }
          >
            This ramp
          </button>
          <button
            onClick={() => hasSet && setScope("all")}
            disabled={!hasSet}
            className={
              "rounded-md px-2.5 py-1 transition-colors disabled:opacity-40 " +
              (scope === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground")
            }
          >
            All in project ({saved.length})
          </button>
        </div>
      </div>

      <div className="relative">
        <pre className="max-h-72 overflow-auto rounded-lg border bg-card p-4 text-[11px] leading-relaxed text-foreground/90">
          <code>{code}</code>
        </pre>
        <div className="absolute right-2 top-2 flex gap-1.5">
          <Button size="sm" variant="secondary" onClick={copy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="secondary" onClick={download}>
            <Download />
            {filename}
          </Button>
        </div>
      </div>
    </div>
  );
}
