export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const OUTPUT_SIZE = 300;
const JPEG_QUALITY = 0.88;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.setAttribute("crossOrigin", "anonymous");
    image.src = src;
  });
}

/**
 * Crops an image to a square and exports a small JPEG data URL (client-only).
 */
export async function getCroppedImageDataUrl(
  imageSrc: string,
  pixelCrop: CropArea,
  outputSize = OUTPUT_SIZE
): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is not supported.");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}
