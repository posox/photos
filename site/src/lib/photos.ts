import manifest from "../generated/manifest.json";
import type { PhotoItem } from "../types";

export function getPhotos(): PhotoItem[] {
  return manifest as PhotoItem[];
}

export function getCategoryList(items: PhotoItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.categories))]
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}
