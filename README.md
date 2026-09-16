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
- `--out=path` output root (default ./dist)
- `--config=path` config file (default ./cropper.config.mjs)
- `--manifest` generate manifest.json

## Output structure

With `OUTPUT_STRUCTURE = "service/profile"` (delisnack):

```
dist/
├── box-lunch/
│   ├── hero_mobile/
│   │   ├── hero-412.webp
│   │   └── hero-412.avif
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

## Copy / Deploy to PHP project

In `package.json`:

```json
"scripts": {
  "copy": "node -e \"... copy dist to Laragon ...\"",
  "deploy": "node cropper.mjs --service=all --manifest && pnpm run copy"
}
```

```bash
pnpm run copy
# custom dest
DEST=C:/laragon/www/other-project/public/assets pnpm run copy
```

## Why separate tool?

- PHP 8.5 GD often lacks AVIF. Sharp does it.
- No Node in production. Build once, commit dist.
- Reusable across all your projects via config.

## License

MIT
