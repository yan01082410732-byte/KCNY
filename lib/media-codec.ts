import { ImageMagick, MagickFormat, MagickImageInfo, ResourceLimits } from "@imagemagick/magick-wasm";
import { imageSignature, MEDIA_MAX_BYTES, MEDIA_MAX_PIXELS } from "./post-media-policy.ts";

// initializeImageMagick is called once by the worker/test bootstrap with pinned WASM bytes.
export function sanitizePostImage(input: Uint8Array, claimedMime: string) {
  const mime = imageSignature(input);
  if (mime !== claimedMime) throw Error("image_mime");
  ResourceLimits.width = BigInt(8192); ResourceLimits.height = BigInt(8192);
  ResourceLimits.area = BigInt(MEDIA_MAX_PIXELS); ResourceLimits.memory = BigInt(96 * 1024 * 1024);
  ResourceLimits.maxMemoryRequest = BigInt(64 * 1024 * 1024); ResourceLimits.disk = BigInt(0);
  // ImageMagick's list limit also counts internal working images, not only input frames.
  ResourceLimits.maxProfileSize = BigInt(512 * 1024); ResourceLimits.listLength = BigInt(8); ResourceLimits.time = BigInt(2);
  const info = MagickImageInfo.create(input);
  if (!info.width || !info.height || info.width * info.height > MEDIA_MAX_PIXELS) throw Error("image_dimensions");
  return ImageMagick.read(input, mime === "image/jpeg" ? MagickFormat.Jpeg : mime === "image/png" ? MagickFormat.Png : MagickFormat.WebP, image => {
    image.autoOrient();
    const ratio = Math.min(1, 2048 / image.width, 2048 / image.height);
    if (ratio < 1) image.resize(Math.max(1, Math.round(image.width * ratio)), Math.max(1, Math.round(image.height * ratio)));
    image.strip(); image.quality = 80; image.settings.setDefine(MagickFormat.WebP, "method", 0);
    const width = image.width, height = image.height;
    const bytes = image.write(MagickFormat.WebP, data => Uint8Array.from(data));
    if (!bytes.length || bytes.length > MEDIA_MAX_BYTES) throw Error("file_size");
    return { bytes, width, height };
  });
}
