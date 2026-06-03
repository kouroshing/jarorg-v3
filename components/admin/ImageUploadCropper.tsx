"use client";

import { useCallback, useId, useRef, useState } from "react";
import Image from "next/image";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Camera, Loader2, X } from "lucide-react";
import { uploadExpertAvatar } from "@/app/actions/expertActions";
import { getCroppedImageDataUrl } from "@/lib/images/get-cropped-image";

const ACCEPT = "image/jpeg,image/png,image/webp,image/jpg";
const MAX_FILE_BYTES = 8 * 1024 * 1024;

type ImageUploadCropperProps = {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
};

export function ImageUploadCropper({
  value,
  onChange,
  disabled = false,
}: ImageUploadCropperProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const closeCropModal = useCallback(() => {
    setCropOpen(false);
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    revokeObjectUrl();
    if (inputRef.current) inputRef.current.value = "";
  }, [revokeObjectUrl]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("فقط فایل تصویری مجاز است.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("حجم فایل باید کمتر از ۸ مگابایت باشد.");
      return;
    }

    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
  };

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    setError(null);

    try {
      const dataUrl = await getCroppedImageDataUrl(imageSrc, croppedAreaPixels);
      const result = await uploadExpertAvatar({ dataUrl });

      if (!result.success) {
        setError(result.error);
        return;
      }

      onChange(result.url);
      closeCropModal();
    } catch {
      setError("برش یا آپلود تصویر ناموفق بود.");
    } finally {
      setUploading(false);
    }
  };

  const previewSrc = value || null;

  return (
    <div className="space-y-3">
      <span className="block text-xs font-medium text-gray-600">عکس پروفایل</span>

      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100 ring-1 ring-gray-100">
          {previewSrc ? (
            previewSrc.startsWith("/") ? (
              <Image
                src={previewSrc}
                alt=""
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            )
          ) : (
            <span className="flex h-full w-full items-center justify-center text-gray-300">
              <Camera className="h-6 w-6" strokeWidth={1.5} />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={handleFileChange}
          />
          <label
            htmlFor={inputId}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 ${
              disabled || uploading
                ? "pointer-events-none cursor-not-allowed opacity-50"
                : ""
            }`}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            {previewSrc ? "تغییر عکس" : "انتخاب عکس"}
          </label>
          <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
            مربع ۱:۱ — پس از برش به ۳۰۰×۳۰۰ ذخیره می‌شود.
          </p>
        </div>
      </div>

      {error && !cropOpen && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      {cropOpen && imageSrc && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crop-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0"
            aria-label="بستن"
            disabled={uploading}
            onClick={closeCropModal}
          />

          <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3
                id="crop-modal-title"
                className="text-sm font-bold text-black"
              >
                برش عکس پروفایل
              </h3>
              <button
                type="button"
                onClick={closeCropModal}
                disabled={uploading}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative h-[min(60vh,320px)] w-full bg-gray-900">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="border-t border-gray-100 px-4 py-3">
              <label className="mb-3 flex items-center gap-3">
                <span className="shrink-0 text-xs text-gray-500">زوم</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={uploading}
                  className="h-1.5 w-full accent-[#FACC15]"
                />
              </label>

              {error && (
                <p role="alert" className="mb-3 text-xs text-red-600">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={uploading || !croppedAreaPixels}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FACC15] py-3 text-sm font-bold text-black transition-all hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال آپلود
                  </>
                ) : (
                  "تایید و برش"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
