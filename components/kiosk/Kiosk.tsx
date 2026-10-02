"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPunchState, punch as savePunch } from "@/lib/punch/actions";
import { isStaleIn, nextAllowedType, PIN_PATTERN } from "@/lib/punch/rules";
import type { PunchState, PunchType, Staff } from "@/lib/punch/types";
import {
  CameraPreview,
  type CameraHandle,
  type CameraStatus,
} from "./CameraPreview";
import { KioskHeader } from "./KioskHeader";
import { PunchPanel } from "./PunchPanel";
import { PunchResult } from "./PunchResult";

const SUCCESS_RESET_MS = 3_000;
const IDLE_RESET_MS = 30_000;

type Selection = {
  staffId: string;
  name: string;
  /** null while the last punch is loading. */
  allowedType: PunchType | null;
  statusText: string;
};

type Success = {
  name: string;
  type: PunchType;
  punchedAt: Date;
  photoUrl: string;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeStatus({ last, inToday }: PunchState, now: Date): string {
  if (nextAllowedType(last, now, !!inToday) === null) {
    return last?.type === "out" && inToday
      ? `Done for today: in at ${formatTime(inToday)}, out at ${formatTime(last.punchedAt)}. You can punch in again tomorrow.`
      : "You've already punched in today. You can punch in again tomorrow.";
  }
  if (!last) return "No punches yet. Ready to punch in.";
  if (isStaleIn(last, now)) {
    return `Missing punch-out from ${last.punchedAt.toLocaleDateString()}. Punch in to start a new shift.`;
  }
  return last.type === "in"
    ? `Clocked in since ${formatTime(last.punchedAt)}`
    : `Clocked out since ${formatTime(last.punchedAt)}`;
}

export function Kiosk({
  staff,
  loadError,
  deviceName,
}: {
  staff: Staff[];
  loadError: boolean;
  deviceName: string;
}) {
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
    const person = staff.find((s) => s.id === staffId);
    if (!person) {
      setSelection(null);
      return;
    }
    setSelection({
      staffId,
      name: person.name,
      allowedType: null,
      statusText: "Checking your status…",
    });
    getPunchState(staffId)
      .then((state) => {
        const now = new Date();
        // Ignore a late answer if someone else was picked meanwhile.
        setSelection((current) =>
          current?.staffId === staffId
            ? {
                ...current,
                allowedType: nextAllowedType(state.last, now, !!state.inToday),
                statusText: describeStatus(state, now),
              }
            : current,
        );
      })
      .catch(() => {
        setSelection((current) =>
          current?.staffId === staffId
            ? {
                ...current,
                statusText: "Couldn't check your status. Pick your name again.",
              }
            : current,
        );
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
      const form = new FormData();
      form.set("staffId", selection.staffId);
      form.set("pin", pin);
      form.set("type", type);
      form.set("photo", photo, "punch.jpg");
      const result = await savePunch(form);
      if (result.ok) {
        setSuccess({
          name: result.name,
          type: result.type,
          punchedAt: result.punchedAt,
          photoUrl,
        });
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
          <CameraPreview
            ref={cameraRef}
            status={cameraStatus}
            onStatusChange={setCameraStatus}
          />
        </div>

        <PunchPanel
          staff={staff}
          loadError={loadError}
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

      <footer className="flex justify-center px-4 pb-3 text-[12.5px] text-mocha">
        <p className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-punch-in" />
          Registered device: <strong className="font-semibold text-espresso">{deviceName}</strong>
        </p>
      </footer>

      {success && <PunchResult {...success} onDone={reset} />}
    </div>
  );
}
