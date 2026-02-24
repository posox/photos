#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(SCRIPT_DIR, "..");
const ROOT_DIR = path.resolve(SITE_DIR, "..");
const PHOTOS_DIR = path.join(ROOT_DIR, "photos");
const OUTPUT_DIR = path.join(SITE_DIR, "src", "generated");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "manifest.json");
const PUBLIC_PHOTOS_DIR = path.join(SITE_DIR, "public", "photos");
const ALLOWED_IMAGE_EXTS = [".jpg", ".jpeg", ".JPG", ".JPEG"];
const CDN_BASE_URL = process.env.PHOTOS_CDN_BASE_URL || "/photos";
const MAX_WIDTH = Number.parseInt(process.env.PHOTOS_MAX_WIDTH || "2560", 10);
const JPEG_QUALITY = Number.parseInt(process.env.PHOTOS_JPEG_QUALITY || "78", 10);
const WEBP_QUALITY = Number.parseInt(process.env.PHOTOS_WEBP_QUALITY || "72", 10);
const USE_SHARP_OPTIMIZATION = process.env.PHOTOS_DISABLE_SHARP !== "1";

let sharpModule = null;
let sharpUnavailable = false;

async function walk(dirPath) {
  const items = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    items.map(async (item) => {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        return walk(fullPath);
      }
      return [fullPath];
    })
  );

  return files.flat();
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function uniqueSlug(baseSlug, usedSlugs) {
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  let n = 2;
  let candidate = `${baseSlug}-${n}`;
  while (usedSlugs.has(candidate)) {
    n += 1;
    candidate = `${baseSlug}-${n}`;
  }

  usedSlugs.add(candidate);
  return candidate;
}

async function findMetadataPath(basePathNoExt) {
  const candidates = [`${basePathNoExt}.yml`, `${basePathNoExt}.yaml`];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue searching.
    }
  }
  return null;
}

async function copyImageToPublic(relativeImagePath, absoluteImagePath) {
  const targetPath = path.join(PUBLIC_PHOTOS_DIR, relativeImagePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(absoluteImagePath, targetPath);
  return targetPath;
}

async function getJpegDimensions(filePath) {
  const buffer = await fs.readFile(filePath);
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error(`Not a valid JPEG file: ${filePath}`);
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset += 1;
    }
    if (offset >= buffer.length) {
      break;
    }

    const marker = buffer[offset];
    offset += 1;

    if (
      marker === 0x01 ||
      marker === 0xd8 ||
      marker === 0xd9 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      continue;
    }

    if (offset + 1 >= buffer.length) {
      break;
    }
    const blockLength = buffer.readUInt16BE(offset);
    if (blockLength < 2 || offset + blockLength > buffer.length) {
      break;
    }

    const isSofMarker =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSofMarker) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (!width || !height) {
        throw new Error(`Could not read JPEG dimensions: ${filePath}`);
      }
      return { width, height };
    }

    offset += blockLength;
  }

  throw new Error(`SOF marker not found for JPEG: ${filePath}`);
}

async function loadSharp() {
  if (!USE_SHARP_OPTIMIZATION || sharpUnavailable) {
    return null;
  }
  if (sharpModule) {
    return sharpModule;
  }
  try {
    const mod = await import("sharp");
    sharpModule = mod.default;
    return sharpModule;
  } catch {
    sharpUnavailable = true;
    console.warn("sharp is not installed, using original JPEGs without optimization.");
    return null;
  }
}

async function optimizeWithSharp(relativeImagePath, absoluteImagePath) {
  const sharp = await loadSharp();
  if (!sharp) {
    const copiedPath = await copyImageToPublic(relativeImagePath, absoluteImagePath);
    const { width, height } = await getJpegDimensions(copiedPath);
    return {
      imageUrl: `${CDN_BASE_URL.replace(/\/$/, "")}/${relativeImagePath}`,
      webpUrl: null,
      width,
      height
    };
  }

  const parsed = path.parse(relativeImagePath);
  const normalizedRelativeJpeg = `${parsed.dir ? `${parsed.dir}/` : ""}${parsed.name}.jpg`;
  const normalizedRelativeWebp = `${parsed.dir ? `${parsed.dir}/` : ""}${parsed.name}.webp`;
  const targetJpegPath = path.join(PUBLIC_PHOTOS_DIR, normalizedRelativeJpeg);
  const targetWebpPath = path.join(PUBLIC_PHOTOS_DIR, normalizedRelativeWebp);

  await fs.mkdir(path.dirname(targetJpegPath), { recursive: true });

  const sourceStat = await fs.stat(absoluteImagePath);
  let shouldRebuild = true;
  try {
    const [jpegStat, webpStat] = await Promise.all([fs.stat(targetJpegPath), fs.stat(targetWebpPath)]);
    shouldRebuild = sourceStat.mtimeMs > jpegStat.mtimeMs || sourceStat.mtimeMs > webpStat.mtimeMs;
  } catch {
    shouldRebuild = true;
  }

  if (shouldRebuild) {
    const pipeline = sharp(absoluteImagePath).rotate().resize({
      width: MAX_WIDTH,
      withoutEnlargement: true
    });

    await Promise.all([
      pipeline
        .clone()
        .jpeg({
          quality: JPEG_QUALITY,
          mozjpeg: true,
          progressive: true,
          chromaSubsampling: "4:2:0"
        })
        .toFile(targetJpegPath),
      pipeline
        .clone()
        .webp({
          quality: WEBP_QUALITY
        })
        .toFile(targetWebpPath)
    ]);
  }

  const metadata = await sharp(targetJpegPath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read output image dimensions: ${targetJpegPath}`);
  }

  return {
    imageUrl: `${CDN_BASE_URL.replace(/\/$/, "")}/${normalizedRelativeJpeg}`,
    webpUrl: `${CDN_BASE_URL.replace(/\/$/, "")}/${normalizedRelativeWebp}`,
    width: metadata.width,
    height: metadata.height
  };
}

async function build() {
  let files = [];
  try {
    files = await walk(PHOTOS_DIR);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      await fs.mkdir(OUTPUT_DIR, { recursive: true });
      await fs.writeFile(OUTPUT_FILE, "[]\n", "utf8");
      console.log("No photos directory yet. Created empty manifest.");
      return;
    }
    throw error;
  }

  const imageFiles = files
    .filter((filePath) => ALLOWED_IMAGE_EXTS.includes(path.extname(filePath)))
    .sort((a, b) => a.localeCompare(b));
  const items = [];
  const usedSlugs = new Set();

  for (const imagePath of imageFiles) {
    const relativeImagePath = path.relative(PHOTOS_DIR, imagePath).split(path.sep).join("/");
    const imageBaseNoExt = imagePath.slice(0, -path.extname(imagePath).length);
    const metadataPath = await findMetadataPath(imageBaseNoExt);
    let parsed = {};

    if (metadataPath) {
      const metadataRaw = await fs.readFile(metadataPath, "utf8");
      parsed = yaml.load(metadataRaw) || {};
    }

    const baseName = path.parse(relativeImagePath).name;
    const title = parsed.title ? String(parsed.title).trim() : baseName;
    const date = parsed.date ? String(parsed.date).trim() : null;
    const slugBase = parsed.slug ? String(parsed.slug).trim() : baseName;
    const rawSlug = slugify(slugBase) || slugify(baseName);

    if (!rawSlug) {
      throw new Error(`Cannot create slug for image: ${imagePath}`);
    }
    const slug = uniqueSlug(rawSlug, usedSlugs);

    const optimized = await optimizeWithSharp(relativeImagePath, imagePath);
    const { width, height } = optimized;
    const aspectRatio = Number((width / height).toFixed(6));

    items.push({
      slug,
      title,
      date,
      categories: normalizeArray(parsed.categories),
      tags: normalizeArray(parsed.tags),
      location: parsed.location ? String(parsed.location).trim() : "",
      description: parsed.description ? String(parsed.description).trim() : "",
      assetPath: relativeImagePath,
      imageUrl: optimized.imageUrl,
      webpUrl: optimized.webpUrl,
      width,
      height,
      aspectRatio
    });
  }

  const sorted = items.sort((a, b) => {
    if (!a.date && !b.date) {
      return a.slug.localeCompare(b.slug);
    }
    if (!a.date) {
      return 1;
    }
    if (!b.date) {
      return -1;
    }
    return b.date.localeCompare(a.date);
  });

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  console.log(`Manifest written: ${path.relative(ROOT_DIR, OUTPUT_FILE)} (${sorted.length} items)`);
}

build().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
