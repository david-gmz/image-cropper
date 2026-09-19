# image-cropper

Generic, reusable image cropper. One tool, many projects.

Built with `sharp` + `pnpm` + PowerShell 7. Separated from PHP projects (like an icon builder). You run it locally, it generates `webp` + `avif` + `jpg fallback (mozjpeg)`, you copy `dist/` to production. No Node runtime on server, no `fs-extra` needed anymore — file ops are pure PowerShell.

Solves PHP GD/Imagick AVIF problem and `${name}-${w}` collision by using subfolders per profile.

## How it works: 1 tool + 1 config per project

Don't make a `cropper.mjs` per project. Keep one generic `cropper.mjs` and add a `cropper.config.mjs` per project, like `tailwind.config.js`.

```
my-project/
├── cropper.config.mjs  <- PROFILES + SERVICES + FALLBACK_JPG
├── input/
│   ├── box-lunch/
│   │   ├── hero_mobile/hero.jpg
│   │   └── menu_mobile/ejecutivo.jpg
│   └── canapes/
└── dist/               <- generated
```

### Config example (delisnack)

If `cropper.config.mjs` exists, it is loaded. If not, defaults are used.

```js
// cropper.config.delisnack.mjs
export const INPUT_ROOT = "./input";
export const OUTPUT_STRUCTURE = "service/profile"; // service/profile | profile | flat
export const FALLBACK_JPG = true; // generate ${name}.jpg at smallest width with mozjpeg
export const FALLBACK_Q = 75;

export const SERVICES = ["box-lunch","canapes","coffee-break","snack-cart","taquiza"];

export const PROFILES = {
  hero_mobile: { ratio: 4/5, widths: [412,824], webpQ: 75, avifQ: 55, fallback: true, fallbackQ: 75 },
  hero_desktop: { ratio: 16/9, widths: [1024,1440], webpQ: 75, avifQ: 55, fallback: true },
  menu_mobile: { ratio: 3/2, widths: [390,780,1190], webpQ: 70, avifQ: 50, fallback: true },
  menu_desktop: { ratio: 2, widths: [360,720], webpQ: 70, avifQ: 50, fallback: false }, // no fallback for this one
};
```

- `w = x, h = y` → `h = Math.round(w / ratio)`
- `base = ${name}-${w}` for webp/avif, fallback is `${name}.jpg` (smallest width, mozjpeg)
- `fallback: true/false` per profile, or global `FALLBACK_JPG`

## Requirements

- Node.js >=24 (you have v24.21.0)
- pnpm >=12.4.1 (you have 12.4.2)
- sharp ^0.35.4 (has mozjpeg built-in)
- PowerShell 7 (pwsh) for init/clean/copy/deploy

## Install

```bash
git clone https://github.com/david-gmz/image-cropper
cd image-cropper
pnpm install
```

No `fs-extra` anymore — clean/copy are pure PowerShell `Remove-Item` / `Copy-Item`, much faster on Windows.

## CLI - cropper.mjs

```bash
# flat mode (input/<profile>/)
node cropper.mjs --manifest --fallback
pnpm run crop:manifest

# service mode
node cropper.mjs --config=cropper.config.delisnack.mjs --service=box-lunch --manifest --fallback
node cropper.mjs --config=cropper.config.delisnack.mjs --service=box-lunch,canapes --manifest --fallback
node cropper.mjs --config=cropper.config.delisnack.mjs --service=all --manifest --fallback

# also: --profile filter
node cropper.mjs --service=box-lunch --profile=hero_desktop --manifest

# pnpm shortcuts
pnpm run crop:box-lunch
pnpm run crop:2          # box-lunch,canapes
pnpm run crop:all        # all services + fallback
```

Flags:
- `--service=all|box-lunch|box-lunch,canapes`  filter service (comma list or repeat --service, only if SERVICES defined)
- `--profile=all|hero_desktop|hero_mobile,menu_mobile`  filter profile (only if PROFILE defined)
- `--out=path` output root (default ./dist)
- `--config=path` config file (default ./cropper.config.mjs)
- `--manifest` generate manifest.json
- `--fallback` force mozjpeg fallback ${name}.jpg even if FALLBACK_JPG=false

### Mozjpeg fallback

Generates `${name}.jpg` at smallest width in each profile folder, using `sharp.jpeg({ mozjpeg:true })`.

```
dist/box-lunch/hero_mobile/
├── hero-412.webp
├── hero-412.avif
├── hero-824.webp
├── hero-824.avif
└── hero.jpg          <- fallback, 412w, mozjpeg, quality 75
```

Use in HTML:

```html
<picture>
  <source srcset="hero-412.avif 412w, hero-824.avif 824w" type="image/avif">
  <source srcset="hero-412.webp 412w, hero-824.webp 824w" type="image/webp">
  <img src="hero.jpg" alt="" loading="lazy">
</picture>
```

Disable per profile: `fallback: false` or global `FALLBACK_JPG = false`.

## PowerShell helpers - init-cropper.ps1

One file, 5 functions. No per-service scripts needed in package.json.

```powershell
. ./init-cropper.ps1
Get-Help New-CropperInputTree -Full
Get-Help Copy-CropperDist -Examples
```

### 1. New-CropperInputTree

Creates `input/<service>/<profile>/` tree from config.

```powershell
New-CropperInputTree -FromConfig ./cropper.config.delisnack.mjs -WithReadme
New-CropperInputTree -Services @("box-lunch","canapes") -Profiles @("hero_mobile","hero_desktop") -WithReadme
New-CropperInputTree -WhatIf   # dry run
```

### 2. Clear-CropperDist

Cross-platform clean (replaces `rm -rf dist/*` which fails on Windows).

```powershell
Clear-CropperDist
Clear-CropperDist -Dist ./dist
```

`pnpm run clean` → calls this.

### 3. Copy-CropperDist

Replaces `copy:box-lunch`, `copy:coffee-break`... One function, any service.

```powershell
Copy-CropperDist                                    # copy all dist/ -> Laragon
Copy-CropperDist -Services box-lunch                # only one
Copy-CropperDist -Services @("box-lunch","canapes") # multiple
Copy-CropperDist -Services coffee-break -DestRoot "C:/laragon/www/delisnack/public/assets/images/services"

# env DEST override
$env:DEST="C:/other/project/public/images"
Copy-CropperDist -Services box-lunch
```

`pnpm run copy` and `pnpm run copy:box-lunch` call this.

### 4. Deploy-Cropper

Crop + copy in one command.

```powershell
Deploy-Cropper -Services box-lunch
Deploy-Cropper -Services @("box-lunch","canapes") -Profiles @("hero_desktop")
Deploy-Cropper -Services all
```

`pnpm run deploy` and `pnpm run deploy:box-lunch` call this.

### 5. Move-OldCropperInputs

Migrates old flat `input-mobile/` folders to new structure.

```powershell
Move-OldCropperInputs -OldRoot . -NewRoot ./input -DefaultService box-lunch -WhatIf
```

## Output structure

With `OUTPUT_STRUCTURE = "service/profile"`:

```
dist/
├── box-lunch/
│   ├── hero_mobile/
│   │   ├── hero-412.webp
│   │   ├── hero-412.avif
│   │   ├── hero-824.webp
│   │   ├── hero-824.avif
│   │   └── hero.jpg          <- mozjpeg fallback
│   └── menu_mobile/
│       ├── ejecutivo-390.webp
│       ├── ejecutivo-390.avif
│       └── ejecutivo.jpg
├── canapes/
└── manifest.json  # only with --manifest
```

With `OUTPUT_STRUCTURE = "profile"` (generic):

```
dist/
├── cards_mobile/
│   ├── burger-390.webp
│   └── burger-390.avif
└── cards_desktop/
```

No more `${name}-${w}` collisions because `box-lunch/menu_mobile/ejecutivo-390` and `box-lunch/menu_desktop/ejecutivo-360` live in different folders.

## Why separate tool?

- PHP 8.5 GD often lacks AVIF. Sharp does it.
- No Node in production. Build once, copy dist.
- PowerShell for file ops = faster on Windows than Node fs-extra.
- Reusable across all your projects via `cropper.config.mjs`.

## License

MIT
