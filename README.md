# image-cropper — delisnack version

Cropper for `C:\laragon\www\delisnack\public\assets\images\services\`

## Final folder structure (proposed)

Stop using flat `desktop-800.avif` at root. New structure, per service, per profile, no collisions:

```
public/assets/images/services/
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
├── coffee-break/
├── snack-cart/
└── taquiza/
```

### Input (your project `image-cropper/`)

Mirror the output:

```
input/
├── box-lunch/
│   ├── hero_mobile/      -> put original hero vertical jpg here
│   ├── hero_desktop/     -> original hero horizontal
│   ├── menu_mobile/
│   └── menu_desktop/
├── canapes/
│   ├── hero_mobile/
│   └── hero_desktop/
└── ...
```

### Why this is better

1.  Your old `box-lunch-hero-1024.avif` at root -> now `box-lunch/hero_desktop/hero-1024.avif`. No more prefix hell.
2.  `ejecutivo-480`, `gourmet-480`, `premium-480` were all mixed in `box-lunch/` root. Now they live in `menu_mobile/` and `menu_desktop/` subfolders.
3.  `${name}-${w}` works because path includes profile: `box-lunch/menu_mobile/ejecutivo-390` vs `box-lunch/menu_desktop/ejecutivo-360` no longer collides.

## Usage

```bash
# all services
pnpm run crop
pnpm run crop:manifest

# only one service (faster dev loop)
pnpm run crop:box-lunch
node cropper.mjs --service=box-lunch --manifest

# deploy to Laragon
pnpm run deploy
# or custom DEST
DEST=C:/laragon/www/delisnack/public/assets/images/services 
pnpm run copy
```

## Profiles

Defined in cropper.mjs:

```js
hero_mobile: 1/2  -> 412, 824, 1236
hero_desktop: 16/9 -> 1024, 1440
menu_mobile: 3/2  -> 390, 780, 1170
menu_desktop: 2   -> 360, 720
```

w = x, h = y, h = round(w / ratio)

## What changed
1. 1 tool + 1 config per project pattern explained - like Tailwind
2. cropper.config.mjs docs with PROFILES, SERVICES, INPUT_ROOT, OUTPUT_STRUCTURE
3. Two modes:
    - With SERVICES: `input/<service>/<profile>/ → dist/<service>/<profile>/ (delisnack)`
    - Without: `input/<profile>/ → dist/<profile>/ (all your other projects)`
4. New CLI flags `--service, --config, --manifest, --out`
5. Fixed the collision explanation and w=x, h=y

Then in each project just copy the right config:

```Bash
cp cropper.config.delisnack.mjs ./cropper.config.mjs  # in delisnack
cp cropper.config.generic.mjs ./cropper.config.mjs    # in other projects
```