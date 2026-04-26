import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract a Cloudinary public ID from a delivery URL.
 * Returns null for non-Cloudinary URLs (so external image hosts are ignored).
 *
 * Example:
 *   https://res.cloudinary.com/foo/image/upload/v1700000000/ecomm/products/abc.jpg
 *     → "ecomm/products/abc"
 */
export function publicIdFromUrl(url: string): string | null {
  if (typeof url !== "string") return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  if (!match || !url.includes("res.cloudinary.com")) return null;
  return match[1];
}

/**
 * Best-effort deletion of multiple Cloudinary assets.
 * Failures are logged but never thrown — orphan cleanup must not break the
 * primary request flow. Skips non-Cloudinary URLs.
 */
export async function destroyImagesByUrl(urls: string[]): Promise<void> {
  const ids = urls
    .map((u) => publicIdFromUrl(u))
    .filter((id): id is string => id !== null);
  if (ids.length === 0) return;
  await Promise.all(
    ids.map((id) =>
      cloudinary.uploader
        .destroy(id)
        .catch((err) => console.error(`Cloudinary destroy failed for ${id}:`, err))
    )
  );
}

export default cloudinary;
