"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Crop, Loader2, RotateCcw } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type Area = { x: number; y: number; width: number; height: number };

// ── Canvas crop helper ───────────────────────────────────────────────────────
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  originalFileName: string
): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", reject);
    img.setAttribute("crossOrigin", "anonymous");
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error("Canvas is empty")); return; }
        const baseName = originalFileName.replace(/\.[^.]+$/, "");
        resolve(new File([blob], `${baseName}_cropped.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  });
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface ImageCropModalProps {
  open: boolean;
  /** Object URL created from the selected File */
  imageSrc: string | null;
  originalFileName?: string;
  /** Called with the cropped File when the user confirms */
  onCropDone: (file: File) => void;
  /** Called when the user cancels */
  onCancel: () => void;
  /**
   * Desired crop aspect ratio.
   * Defaults to 1 (square). Pass e.g. 4/3 for landscape, 3/4 for portrait.
   */
  aspectRatio?: number;
}

// ── Component ────────────────────────────────────────────────────────────────
export function ImageCropModal({
  open,
  imageSrc,
  originalFileName = "image.jpg",
  onCropDone,
  onCancel,
  aspectRatio = 1,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  // Reset state each time a new image is opened
  useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open, imageSrc]);

  const onCropComplete = useCallback((_: Area, cap: Area) => {
    setCroppedAreaPixels(cap);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const file = await getCroppedImg(imageSrc, croppedAreaPixels, originalFileName);
      onCropDone(file);
    } catch {
      // silently reset — the original file is still valid
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crop className="h-4 w-4 text-primary" />
            Adjust Featured Image
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Drag to reposition · Use the slider to zoom
          </p>
        </DialogHeader>

        {/* Cropper canvas */}
        <div className="relative w-full h-72 bg-neutral-900 select-none">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              showGrid
              style={{
                containerStyle: { background: "#171717" },
                cropAreaStyle: { border: "2px solid hsl(var(--primary))" },
              }}
            />
          )}
        </div>

        {/* Zoom slider */}
        <div className="px-5 py-4 space-y-1 border-t bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-2">Zoom</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 accent-primary cursor-pointer rounded-full"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
              {zoom.toFixed(1)}×
            </span>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t bg-background flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={processing}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={processing || !croppedAreaPixels}>
              {processing
                ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Processing…</>
                : "Apply & Use"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
