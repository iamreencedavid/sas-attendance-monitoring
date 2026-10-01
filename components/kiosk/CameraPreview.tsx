"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { captureFrame } from "@/lib/camera/capture";

export type CameraStatus = "loading" | "ready" | "denied" | "missing" | "insecure" | "error";

export type CameraHandle = {
  capture: () => Promise<Blob>;
};

const STATUS_MESSAGES: Record<Exclude<CameraStatus, "ready">, string> = {
  loading: "Starting camera…",
  denied: "Camera access is blocked. Allow the camera in your browser settings, then reload.",
  missing: "No camera found on this device.",
  insecure: "The camera needs a secure (HTTPS) connection.",
  error: "The camera couldn't start. Reload the page to try again.",
};

type Props = {
  ref?: Ref<CameraHandle>;
  status: CameraStatus;
  onStatusChange: (status: CameraStatus) => void;
};

export function CameraPreview({ ref, status, onStatusChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => ({
    capture: () => {
      const video = videoRef.current;
      if (!video) return Promise.reject(new Error("Camera is not ready"));
      return captureFrame(video);
    },
  }));

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        onStatusChange("insecure");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        if (!cancelled) onStatusChange("ready");
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "SecurityError") onStatusChange("denied");
        else if (name === "NotFoundError" || name === "OverconstrainedError") onStatusChange("missing");
        else onStatusChange("error");
      }
    }

    start();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onStatusChange]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-espresso-soft">
      <video
        ref={videoRef}
        className="h-full w-full -scale-x-100 object-cover"
        playsInline
        muted
        aria-label="Live camera preview"
      />

      {status === "ready" ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 aspect-3/4 h-3/5 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-2 border-dashed border-cream/70"
          />
          <p className="absolute inset-x-0 bottom-3 text-center text-sm font-medium text-cream drop-shadow">
            Center your face in the oval
          </p>
        </>
      ) : (
        <div
          role={status === "loading" ? "status" : "alert"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-latte"
        >
          <span aria-hidden="true" className="text-4xl">
            {status === "loading" ? "📷" : "🚫"}
          </span>
          <p className="max-w-xs text-sm sm:text-base">{STATUS_MESSAGES[status]}</p>
        </div>
      )}
    </div>
  );
}
