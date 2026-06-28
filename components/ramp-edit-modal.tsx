"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { RampEditor } from "@/components/ramp-editor";
import { normalizeParams, type Ramp, type RampParams } from "@/lib/ramp";
import { uid } from "@/lib/use-projects";

interface Props {
  open: boolean;
  onClose: () => void;
  /** The ramp being edited, or null when creating a new one. */
  ramp: Ramp | null;
  onSave: (ramp: Ramp) => void;
}

export function RampEditModal({ open, onClose, ramp, onSave }: Props) {
  const [name, setName] = useState("Untitled");
  const [params, setParams] = useState<RampParams>(() => normalizeParams({}));
  const [showInfo, setShowInfo] = useState(true);

  // Seed the editor whenever the modal opens (or the target ramp changes).
  useEffect(() => {
    if (!open) return;
    if (ramp) {
      setName(ramp.name);
      setParams(normalizeParams(ramp.params));
    } else {
      setName("Untitled");
      setParams(normalizeParams({}));
    }
  }, [open, ramp]);

  const patch = (p: Partial<RampParams>) =>
    setParams((prev) => ({ ...prev, ...p }));

  const handleSave = () => {
    onSave({ id: ramp?.id ?? uid(), name, params });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={ramp ? `Edit ${ramp.name}` : "New ramp"}
    >
      <RampEditor
        name={name}
        params={params}
        onNameChange={setName}
        patch={patch}
        showInfo={showInfo}
        onShowInfoChange={setShowInfo}
        saveLabel={ramp ? "Update" : "Create"}
        onSave={handleSave}
      />
    </Modal>
  );
}
