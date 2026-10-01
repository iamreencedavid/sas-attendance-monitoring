/**
 * Grabs the current video frame as a JPEG Blob (never base64), scaled down
 * to `maxWidth`. The preview is mirrored with CSS only, so the saved photo
 * keeps the true orientation.
 */
export function captureFrame(
  video: HTMLVideoElement,
  maxWidth = 640,
  quality = 0.7,
): Promise<Blob> {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) {
    return Promise.reject(new Error("Camera is not ready"));
  }

  const scale = Math.min(1, maxWidth / videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(videoWidth * scale);
  canvas.height = Math.round(videoHeight * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas is not supported"));
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Capture failed"))),
      "image/jpeg",
      quality,
    );
  });
}
