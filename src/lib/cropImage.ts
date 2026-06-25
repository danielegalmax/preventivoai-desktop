export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossibile caricare l'immagine"));
    image.src = src;
  });
}

export function displayAreaToNatural(
  displayArea: CropRect,
  displaySize: { width: number; height: number },
  naturalSize: { width: number; height: number },
): CropRect {
  const scaleX = naturalSize.width / displaySize.width;
  const scaleY = naturalSize.height / displaySize.height;
  return {
    x: Math.max(0, Math.round(displayArea.x * scaleX)),
    y: Math.max(0, Math.round(displayArea.y * scaleY)),
    width: Math.max(1, Math.round(displayArea.width * scaleX)),
    height: Math.max(1, Math.round(displayArea.height * scaleY)),
  };
}

export function cropImageToBase64(
  image: HTMLImageElement,
  area: CropRect,
  mimeType: string,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas non disponibile");
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  const dataUrl = canvas.toDataURL(mimeType || "image/png", 0.9);
  const base64 = dataUrl.split(",")[1];
  if (!base64) throw new Error("Impossibile ritagliare l'immagine");
  return base64;
}
