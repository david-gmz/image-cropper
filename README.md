# image-cropper

Tiny, generic CLI cropper. One tool, many projects.

Built with `sharp` + `pnpm`. Separated from your PHP projects - same idea as an icon builder. You run it locally/CI, it generates `webp` + `avif`, you copy `dist/` to production. No Node runtime on server.

Solves the PHP GD/Imagick AVIF problem and the `${name}-${w}` collision problem by using subfolders per profile.

## How it works: 1 tool + 1 config per project

Don't make a `cropper.mjs` per project. Keep one generic `cropper.mjs` and add a `cropper.config.mjs` per project, like `tailwind.config.js`.

```
my-project/
├── cropper.config.mjs  <- PROFILES + SERVICES for this project
├── input/
│   ├── box-lunch/
│   │   ├── hero_mobile/
│   │   └── menu_mobile/
│   └── canapes/
└── dist/               <- generated
```

If `cropper.config.mjs` exists, it is loaded. If not, defaults are used.

```js
// cropper.config.mjs
export const INPUT_ROOT = "./input";
export const OUTPUT_STRUCTURE = "service/profile"; // service/profile | profile | flat

export const SERVICES = ["box-lunch", "canapes", "coffee-break"];

export const PROFILES = {
  hero_mobile: { ratio: 4/5, widths: [412, 824], webpQ: 75, avifQ: 55 },
  hero_desktop: { ratio: 16/9, widths: [1024, 1440], webpQ: 75, avifQ: 55 },
  menu_mobile: { ratio: 3/2, widths: [390, 780], webpQ: 70, avifQ: 50 },
};
```

- `w = x, h = y` - cartesian, x always first. `h = Math.round(w / ratio)`
- `base = ${name}-${w}` - no profile in filename, collision avoided by folder

## Requirements

- Node.js >= 24 (you're on v24.21.0)
- pnpm >= 12.4.1 (you're on 12.4.1)
- sharp ^0.35.4

## Install

```bash
git clone https://github.com/david-gmz/image-cropper
cd image-cropper
pnpm install
```

## Examples

Three example configs are included:

- `cropper.config.delisnack.mjs` - your delisnack project with SERVICES
- `cropper.config.generic.mjs` - flat mode, no SERVICES
- `cropper.config.blog.mjs` - posts / projects / authors

Copy one:

```bash
cp cropper.config.delisnack.mjs cropper.config.mjs
# or
cp cropper.config.generic.mjs cropper.config.mjs
```

## CLI

```bash
pnpm crop                          # all services/profiles
pnpm crop --service=box-lunch      # only box-lunch
pnpm crop --manifest               # + manifest.json
pnpm crop --config=./my.config.mjs --out=./public/cropped

# npm scripts
pnpm run crop:box-lunch
pnpm run deploy   # crop + copy to Laragon
```

Flags:
- `--service=all|box-lunch|canapes`  filter service (only if SERVICES defined)
- `--profile=all|box-lunch|canapes`  filter profile (only if PROFILE defined)
- `--out=path` output root (default ./dist)
- `--config=path` config file (default ./cropper.config.mjs)
- `--manifest` generate manifest.json

## Output structure

With `OUTPUT_STRUCTURE = "service/profile"` (delisnack):

```
dist/
├── box-lunch/
│   ├── hero_mobile/          # was box-lunch-hero-*.avif at root -> now here
│   │   ├── hero-412.webp
│   │   ├── hero-412.avif
│   │   └── hero-824.avif
│   ├── hero_desktop/
│   │   ├── hero-1024.webp
│   │   ├── hero-1024.avif
│   │   └── hero-1440.avif
│   ├── menu_mobile/          # was ejecutivo-480, gourmet-480 flat -> now separated
│   │   ├── ejecutivo-390.webp
│   │   ├── ejecutivo-780.webp
│   │   ├── gourmet-390.webp
│   │   └── premium-390.webp
│   └── menu_desktop/
│       ├── ejecutivo-360.webp
│       └── gourmet-360.webp
├── canapes/
│   ├── hero_mobile/
│   ├── hero_desktop/
│   └── menu_mobile/
│       ├── ejecutivo-390.webp
│       └── gourmet-390.webp
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

### New pnpm scripts added

```json
"crop:2": "box-lunch,canapes",
"crop:3": "box-lunch,canapes,coffee-break",
"crop:box+canapes": "same as crop:2 - easier to remember"
```

Usage:

```bash
pnpm run crop:2          # box-lunch + canapes
pnpm run crop:3          # box-lunch + canapes + coffee-break
pnpm run crop:box+canapes # same as crop:2

# or manual:
node cropper.mjs --config=cropper.config.delisnack.mjs --service=box-lunch,canapes --manifest
node cropper.mjs --config=cropper.config.delisnack.mjs --service=box-lunch --service=canapes --manifest
```

### New PowerShell API

```powershell
. ./init-cropper.ps1

# CLEAN - cross-platform, works on Windows (rm -rf fails on Windows)
Clear-CropperDist
Clear-CropperDist -Dist ./dist -WhatIf

# COPY - no more copy:box-lunch per service in package.json
Copy-CropperDist                                    # copy ALL dist/ -> Laragon
Copy-CropperDist -Services box-lunch                # only box-lunch
Copy-CropperDist -Services @("box-lunch","canapes") # 2 services
Copy-CropperDist -Services coffee-break -DestRoot "C:/other/project/public"

# DEPLOY = crop + copy in one command
Deploy-Cropper -Services box-lunch
Deploy-Cropper -Services @("box-lunch","canapes","coffee-break")
Deploy-Cropper -Services all                        # all 6 services
Deploy-Cropper -Services box-lunch -Profiles hero_desktop
```

### pnpm shortcuts (still work, now call pwsh)

```bash
pnpm run clean              # -> Clear-CropperDist
pnpm run copy               # -> Copy-CropperDist (all)
pnpm run copy:box-lunch     # -> Copy-CropperDist -Services box-lunch
pnpm run deploy             # -> Deploy-Cropper -Services all
pnpm run deploy:box-lunch   # -> Deploy-Cropper -Services box-lunch
pnpm run deploy:coffee-break # NEW - no need to edit JSON anymore, just use pwsh directly if you want more
```

**What do I think?** Your idea is better:
- Node for cropping (sharp needs Node)
- PowerShell for file ops (copy/clean/deploy) — because `Copy-Item`, `Remove-Item` are native, handle Windows paths `C:\laragon\...` correctly, and you can pass arrays `@("box-lunch","coffee-break")` without editing `package.json` every time.

So now `package.json` has only 2 generic copy scripts, and everything else you do via `Copy-CropperDist -Services ...` directly in pwsh.

## Why separate tool?

- PHP 8.5 GD often lacks AVIF. Sharp does it.
- No Node in production. Build once, commit dist.
- Reusable across all your projects via config.

## License

MIT