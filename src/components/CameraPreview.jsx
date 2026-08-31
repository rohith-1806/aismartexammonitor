import React from 'react'

export function CameraPreview({ videoRef, photo, onOpenCamera, onCapture, onRetake, cameraActive, message }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-outline-variant bg-surface-container-high p-4">
      {photo ? (
        <div className="relative aspect-video overflow-hidden rounded-2xl">
          <img src={photo} alt="Captured preview" className="h-full w-full object-cover" />
          <div className="absolute left-4 top-4 rounded-full bg-success px-3 py-1 text-label-sm text-on-secondary">Photo captured</div>
        </div>
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center rounded-2xl bg-surface-container-lowest text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high">
            <span className="material-symbols-outlined text-4xl text-outline">photo_camera</span>
          </div>
          <p className="mb-4 font-label-md text-label-md text-on-surface-variant">{message || 'Camera access required'}</p>
          <button type="button" onClick={onOpenCamera} className="rounded-full bg-primary-container px-5 py-2 text-label-md font-bold text-on-primary-container">
            Open Camera
          </button>
        </div>
      )}

      {cameraActive && !photo ? (
        <div className="mt-4 space-y-3">
          <video ref={videoRef} autoPlay playsInline className="w-full rounded-2xl bg-black" />
          <div className="flex gap-3">
            <button type="button" onClick={onCapture} className="flex-1 rounded-xl bg-primary px-4 py-3 font-label-md font-bold text-on-primary">
              Capture Photo
            </button>
          </div>
        </div>
      ) : null}

      {photo ? (
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onRetake} className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 font-label-md font-bold text-on-surface-variant">
            Retake Photo
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default CameraPreview
