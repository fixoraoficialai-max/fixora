import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/config";
import { configureFal, fal } from "@/lib/fal";
import { ApiErrors, apiSuccess } from "@/lib/api/response";
import { checkRateLimit, RATE_LIMITS } from "@/lib/security";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 30 * 1024 * 1024; // 30 MB — allows large HEIC before conversion
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// ─── HEIC detection ───────────────────────────────────────────────────────────

function isHeicFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

function classifyFile(file: File): { isImage: boolean; isVideo: boolean } {
  const isImage = file.type.startsWith("image/") || isHeicFile(file);
  const isVideo = file.type.startsWith("video/");
  return { isImage, isVideo };
}

// ─── HEIC → JPEG conversion ───────────────────────────────────────────────────

/**
 * Converts a HEIC/HEIF buffer to JPEG using heic-convert, then applies
 * the EXIF orientation tag using sharp.
 *
 * WHY: iPhones store photos in landscape orientation at the pixel level,
 * with an EXIF tag (e.g. orientation=6) telling apps to rotate 90° CW.
 * heic-convert copies pixels without applying that rotation, producing a
 * sideways JPEG. Kling's character detection then fails (can't find a person).
 * sharp().rotate() reads the EXIF tag, physically rotates the pixels, and
 * strips the EXIF orientation so the output is correct with no metadata quirks.
 */
async function convertHeicToJpeg(inputBuffer: ArrayBuffer): Promise<Uint8Array> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const heicConvert = (await import("heic-convert")) as any;
  const convert = heicConvert.default ?? heicConvert;

  // Step 1: decode HEIC → raw JPEG bytes (pixels may be rotated per EXIF)
  const rawJpeg: ArrayBuffer = await convert({
    buffer: Buffer.from(inputBuffer),
    format: "JPEG",
    quality: 0.9,
  });

  // Step 2: apply EXIF rotation + downscale to max 1920px + strip metadata
  const sharp = (await import("sharp")).default;
  const corrected = await sharp(Buffer.from(rawJpeg))
    .rotate()           // auto-rotate using EXIF orientation, then strip EXIF
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  return new Uint8Array(corrected);
}

/**
 * Downscales an image larger than 1920px using sharp.
 * Only used for non-HEIC images (standard JPEG/PNG from Android/DSLR).
 * Prevents Fal.ai 500 errors caused by gigantic image payloads.
 */
async function downscaleIfOversized(buffer: Uint8Array, mimeType: string): Promise<{ buffer: Uint8Array; mimeType: string }> {
  const sharp = (await import("sharp")).default;
  const { width = 0, height = 0 } = await sharp(buffer).metadata();

  if (width <= 1920 && height <= 1920) return { buffer, mimeType };

  const resized = await sharp(buffer)
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();

  return { buffer: new Uint8Array(resized), mimeType: "image/jpeg" };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return ApiErrors.unauthorized();

  if (!checkRateLimit(`upload:${session.user.id}`, RATE_LIMITS.upload)) {
    return ApiErrors.tooManyRequests();
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return ApiErrors.validation({ message: "Invalid multipart form data" });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return ApiErrors.validation({ message: "Field 'file' must be a file" });
  }

  if (file.size === 0) {
    return ApiErrors.validation({ message: "File is empty" });
  }

  const { isImage, isVideo } = classifyFile(file);

  if (!isImage && !isVideo) {
    return ApiErrors.validation({ message: "Only image or video files are accepted" });
  }

  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    const limit = isVideo ? "50MB" : "30MB";
    return ApiErrors.validation({ message: `File too large — maximum is ${limit}` });
  }

  try {
    configureFal();

    const rawBuffer = await file.arrayBuffer();
    let uploadBuffer: Uint8Array = new Uint8Array(rawBuffer);
    let uploadMimeType = file.type || "application/octet-stream";
    let uploadName = file.name;

    if (isImage) {
      if (isHeicFile(file)) {
        // Convert HEIC → JPEG on the server — works on all platforms, no native deps
        uploadBuffer = await convertHeicToJpeg(rawBuffer);
        uploadMimeType = "image/jpeg";
        uploadName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
      } else {
        // Downscale large standard images to prevent Fal.ai payload rejections
        const result = await downscaleIfOversized(new Uint8Array(rawBuffer), uploadMimeType);
        uploadBuffer = result.buffer;
        uploadMimeType = result.mimeType;
      }
    }
    // Video: uploadBuffer stays as the initial Uint8Array(rawBuffer)

    // Construct a clean native File — Uint8Array is a valid BlobPart on all platforms
    const cleanFile = new File([new Uint8Array(uploadBuffer)], uploadName, { type: uploadMimeType });
    const fileUrl = await fal.storage.upload(cleanFile);

    return apiSuccess({ fileUrl, isVideo });
  } catch (err) {
    console.error("[upload]", err);
    return ApiErrors.internal();
  }
}
