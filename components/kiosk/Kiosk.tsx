"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getLastPunch, mockPunch } from "@/lib/punch/mock";
import { isStaleIn, nextAllowedType, PIN_PATTERN } from "@/lib/punch/rules";
import type { LastPunch, PunchType, Staff } from "@/lib/punch/types";
import { CameraPreview, type CameraHandle, type CameraStatus } from "./CameraPreview";
import { KioskHeader } from "./KioskHeader";
import { PunchPanel } from "./PunchPanel";
import { PunchResult } from "./PunchResult";

const SUCCESS_RESET_MS = 3_000;
const IDLE_RESET_MS = 30_000;

type Selection = {
  staffId: string;
  allowedType: PunchType;
  statusText: string;
};

type Success = {
  name: string;
  type: PunchType;
  punchedAt: Date;
  photoUrl: string;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function describeStatus(last: LastPunch | null, now: Date): string {
  if (!last) return "No punches yet. Ready to punch in.";
  if (isStaleIn(last, now)) {
    return `Missing punch-out from ${last.punchedAt.toLocaleDateString()}. Punch in to start a new shift.`;
  }
  return last.type === "in"
    ? `Clocked in since ${formatTime(last.punchedAt)}`
    : `Clocked out since ${formatTime(last.punchedAt)}`;
}

export function Kiosk({ staff }: { staff: Staff[] }) {
  const cameraRef = useRef<CameraHandle>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("loading");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState<PunchType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);

  const reset = useCallback(() => {
    setSelection(null);
    setPin("");
    setError(null);
    setSuccess((prev) => {
      if (prev) URL.revokeObjectURL(prev.photoUrl);
      return null;
    });
  }, []);

  function selectStaff(staffId: string) {
    setPin("");
    setError(null);
    if (!staffId) {
      setSelection(null);
      return;
    }
    const now = new Date();
    const last = getLastPunch(staffId);
    setSelection({
      staffId,
      allowedType: nextAllowedType(last, now),
      statusText: describeStatus(last, now),
    });
  }

  async function punch(type: PunchType) {
    if (!selection || submitting) return;
    if (!PIN_PATTERN.test(pin)) {
      setError("PIN must be 4–6 digits.");
      return;
    }

    setSubmitting(type);
    setError(null);
    let photoUrl: string | null = null;
    try {
      const photo = await cameraRef.current!.capture();
      photoUrl = URL.createObjectURL(photo);
      const result = await mockPunch({ staffId: selection.staffId, pin, type, photo });
      if (result.ok) {
        setSuccess({ name: result.name, type: result.type, punchedAt: result.punchedAt, photoUrl });
        photoUrl = null; // ownership moves to the success overlay
      } else {
        setError(result.error);
        setPin("");
      }
    } catch {
      setError("Couldn't take the photo. Try again.");
    } finally {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setSubmitting(null);
    }
  }

  // Return to idle after the success overlay, or when someone walks away mid-punch.
  useEffect(() => {
    if (success) {
      const id = setTimeout(reset, SUCCESS_RESET_MS);
      return () => clearTimeout(id);
    }
    if (selection && !submitting) {
      const id = setTimeout(reset, IDLE_RESET_MS);
      return () => clearTimeout(id);
    }
  }, [success, selection, pin, submitting, reset]);

  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh">
      <KioskHeader />

      <main className="grid flex-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:min-h-0 lg:grid-cols-[3fr_2fr]">
        <div className="aspect-4/3 w-full lg:aspect-auto lg:min-h-0">
          <CameraPreview ref={cameraRef} status={cameraStatus} onStatusChange={setCameraStatus} />
        </div>

        <PunchPanel
          staff={staff}
          staffId={selection?.staffId ?? ""}
          pin={pin}
          statusText={selection?.statusText ?? null}
          allowedType={selection?.allowedType ?? null}
          submitting={submitting}
          cameraReady={cameraStatus === "ready"}
          error={error}
          onStaffChange={selectStaff}
          onPinChange={setPin}
          onPunch={punch}
        />
      </main>

      <footer className="px-4 pb-3 text-center text-xs text-muted">
        Photos are taken for attendance only · kept 90 days
      </footer>

      {success && <PunchResult {...success} onDone={reset} />}
    </div>
  );
}
