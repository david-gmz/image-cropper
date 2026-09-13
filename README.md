# image-cropper

Tiny standalone CLI tool to generate responsive crops for mobile and desktop.
Built with `sharp` + `pnpm`, separated from your main PHP project - same idea as an icon builder.

It solves the PHP GD/Imagick AVIF problem: your PHP app can keep generating JPG/WEBP, while this tool generates optimized `webp` + `avif` offline and you just copy `dist/` into your project.

## Features

- 3 mobile + 3 desktop sizes (fully configurable)
- Separate input folders: `input-mobile` and `input-desktop` - use different shots when needed
- Outputs `webp` (compatibility) + `avif` (30-50% smaller) for each size
- Aspect ratio driven by constants: `RELATION_MOBILE` and `RELATION_DESKTOP`
- `w = x`, `h = y` - cartesian, x always first
- Smart crop with `attention` (face/subject detection)
- Generates `manifest.json` like a sprite/icon manifest
- No runtime dependency in your PHP project

## Requirements

- Node.js >= 18
- pnpm

## Install

```bash
git clone <your-repo>
cd image-cropper
pnpm install
```

Sharp includes prebuilt binaries. If you get native issues:

```bash
pnpm rebuild sharp
```

## Folder structure

```
.
├── input-mobile/   # put vertical / mobile shots here
├── input-desktop/  # put horizontal / desktop shots here
├── dist/           # generated files - copy this to your PHP project
├── cropper.mjs
└── package.json
```

## Quick start

1. Drop images:

```bash
# only mobile shot -> generates 6 files (3 sizes x 2 formats)
cp ~/photos/hero-mobile.jpg input-mobile/hero.jpg

# only desktop shot -> generates 6 files
cp ~/photos/hero-desktop.jpg input-desktop/hero.jpg

# different shots with same name -> generates 12 files (6 mobile + 6 desktop)
```

2. Run:

```bash
pnpm crop
# or
pnpm run crop
```

Output:

```
✓ MOBILE hero.jpg -> 6 files
✓ DESKTOP hero.jpg -> 6 files
Done. 1 images processed to ./dist
```

3. Copy to your PHP project:

```bash
cp -r dist/* ../my-php-project/public/images/cropped/
```

## Configuration

Edit `cropper.mjs` - all sizes are derived from relations:

```js
// w / h relation
const RELATION_MOBILE = 0.75; // 3/4 portrait -> w=320, h=427
const RELATION_DESKTOP = 16/9; // 16:9 landscape

const s = (w, rel) => ({ w, h: Math.round(w / rel) });

const MOBILE_SIZES = {
  mobile_sm: s(320, RELATION_MOBILE),
  mobile_md: s(375, RELATION_MOBILE),
  mobile_lg: s(414, RELATION_MOBILE),
};

const DESKTOP_SIZES = {
  desktop_sm: s(1024, RELATION_DESKTOP),
  desktop_md: s(1440, RELATION_DESKTOP),
  desktop_lg: s(1920, RELATION_DESKTOP),
};
```

Change `RELATION_*` once, all sizes update. Sharp requires integer dimensions, so we use `Math.round()`.

## CLI args

```bash
# custom folders
pnpm crop --mobile=./assets/mobile --desktop=./assets/desktop --out=./public/cropped

# options:
# --mobile=path   mobile input folder (default: ./input-mobile)
# --desktop=path  desktop input folder (default: ./input-desktop)
# --out=path      output folder (default: ./dist)
```

## Output & manifest

`dist/` contains:

```
hero_mobile_sm_320x427.webp
hero_mobile_sm_320x427.avif
hero_desktop_lg_1920x1080.webp
hero_desktop_lg_1920x1080.avif
manifest.json
```

`manifest.json`:

```json
{
  "hero": [
    {
      "variant": "mobile_md",
      "x": 375,
      "y": 500,
      "webp": "hero_mobile_md_375x500.webp",
      "avif": "hero_mobile_md_375x500.avif"
    }
  ]
}
```

## Usage in PHP / HTML

```html
<picture>
  <source media="(max-width: 768px)" srcset="/images/cropped/hero_mobile_md_375x500.avif" type="image/avif">
  <source media="(max-width: 768px)" srcset="/images/cropped/hero_mobile_md_375x500.webp" type="image/webp">
  <source media="(min-width: 769px)" srcset="/images/cropped/hero_desktop_lg_1920x1080.avif" type="image/avif">
  <source media="(min-width: 769px)" srcset="/images/cropped/hero_desktop_lg_1920x1080.webp" type="image/webp">
  <img src="/images/cropped/hero_desktop_lg_1920x1080.webp" alt="Hero">
</picture>
```

In PHP:

```php
$manifest = json_decode(file_get_contents('dist/manifest.json'), true);
foreach ($manifest['hero'] as $crop) {
  // $crop['x'], $crop['y'], $crop['avif'], $crop['webp']
}
```

## Why separate tool?

- PHP 8.5.9 GD often lacks AVIF. Sharp generates AVIF natively.
- No Node runtime needed in production. You run the cropper locally/CI, commit `dist/`.
- Same workflow as your lucide/sprit-icons builder: build once, include the result.

## License

MIT
