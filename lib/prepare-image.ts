/** Types platform-api accepts for images (SVG is refused there). */
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
/** Same limit as platform-api for room photos and experience images. */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Photos above the limit are resized to this longest edge. */
const RESIZE_MAX_EDGE = 2400;

/**
 * Makes a picked file uploadable: PNG/JPEG/WebP and at most `maxBytes`.
 * Bigger photos (e.g. from a phone) are resized and re-encoded as JPEG.
 */
export async function prepareImageFile(file: File, maxBytes = IMAGE_MAX_BYTES): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error(`"${file.name}" must be a PNG, JPEG or WebP image.`);
  }
  if (file.size <= maxBytes) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, RESIZE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(`Could not resize "${file.name}".`);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size > maxBytes) throw new Error(`"${file.name}" is too large, even after resizing.`);
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
