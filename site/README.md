# Photo site (Astro)

Static photo gallery powered by Astro. Source images are stored in `../photos` with sidecar metadata files.

## Content format

Minimum:
- `photos/trips/italy/sunset.jpg`

Optional sidecar metadata:
- `photos/trips/italy/sunset.yml`

Example metadata (`.yml`):

```yaml
title: "Sunset Over Harbor"
date: "2026-02-10"
categories: ["travel", "sea"]
tags: ["sunset", "golden-hour"]
location: "Genoa, Italy"
description: "Shot from the old pier after rain."
slug: "genoa-sunset" # optional
```

If metadata file is missing, the photo is still shown with fallback values:
- `title` from filename
- empty `categories/tags`
- no `date`

## Commands

From `site/`:

```bash
npm install
npm run dev
```

Recommended Node.js version: `20.x` or `22.x` (LTS).

Build production bundle:

```bash
npm run build
```

## Environment

- `PHOTOS_CDN_BASE_URL` (optional, default: `/photos`)
  - Example: `https://cdn.example.com`
  - Used by `./scripts/build-manifest.mjs` to build final `imageUrl` in `site/src/generated/manifest.json`.
  - For local development (default `/photos`), build step also copies source JPEGs into `site/public/photos`.
- `PHOTOS_MAX_WIDTH` (optional, default: `2560`)
  - Max width for generated web images.
- `PHOTOS_JPEG_QUALITY` (optional, default: `78`)
  - JPEG quality for optimized output.
- `PHOTOS_WEBP_QUALITY` (optional, default: `72`)
  - WebP quality for optimized output.
- `PHOTOS_DISABLE_SHARP=1` (optional)
  - Disable optimization and use original JPEG files.

## Web optimization

`build:manifest` now generates optimized files in `site/public/photos`:
- `*.jpg` (compressed, progressive)
- `*.webp`

The site serves WebP first (when supported) and falls back to JPEG.
