#!/usr/bin/env node
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

// allow args: pnpm crop --mobile=./my-mobile --desktop=./my-desktop
const args = Object.fromEntries(
    process.argv
        .slice(2)
        .map(a => a.replace(/^--/, "").split("="))
        .map(([k, v]) => [k, v || true])
);

const MOBILE_DIR = args.mobile || "./input-mobile";
const DESKTOP_DIR = args.desktop || "./input-desktop";
const OUTPUT_DIR = args.out || "./dist";

const MOBILE_RATIO = 3 / 2; // 3:2
const DESKTOP_RATIO = 2; // 2:1
// helper to keep ints
const size = (w, ratio) => ({ w, h: Math.round(w / ratio) });

const MOBILE_SIZES = {
    mobile_sm: size(375, MOBILE_RATIO), // 320 x 213
    mobile_md: size(480, MOBILE_RATIO), // 375 x 250
    mobile_lg: size(768, MOBILE_RATIO) // 414 x 276
};

const DESKTOP_SIZES = {
    desktop_sm: size(800, DESKTOP_RATIO),
    desktop_md: size(1024, DESKTOP_RATIO), // 1024 x 576
    desktop_lg: size(1440, DESKTOP_RATIO) // 1440 x 810
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const listFiles = async dir => {
    try {
        return (await fs.readdir(dir)).filter(f =>
            /\.(jpe?g|png|webp)$/i.test(f)
        );
    } catch {
        return [];
    }
};

const mobileFiles = await listFiles(MOBILE_DIR);
const desktopFiles = await listFiles(DESKTOP_DIR);

const manifest = {};

for (const file of mobileFiles) {
    const name = path.parse(file).name;
    const inputPath = path.join(MOBILE_DIR, file);
    manifest[name] ??= [];

    // --- MOBILE CROPS ---
    for (const [key, { w, h }] of Object.entries(MOBILE_SIZES)) {
        // const base = `${name}_${key}_${w}x${h}`;
        const base = `${name}-${w}`;
        await sharp(inputPath)
            .resize(w, h, { fit: "cover", position: "attention" })
            .webp({ quality: 80 })
            .toFile(path.join(OUTPUT_DIR, `${base}.webp`));
        await sharp(inputPath)
            .resize(w, h, { fit: "cover", position: "attention" })
            .avif({ quality: 50, effort: 4 })
            .toFile(path.join(OUTPUT_DIR, `${base}.avif`));
        manifest[name].push({
            variant: key,
            x: w,
            y: h,
            webp: `${base}.webp`,
            avif: `${base}.avif`
        });
    }
    console.log(`✓ MOBILE ${file} -> 6 files`);
}

for (const file of desktopFiles) {
    const name = path.parse(file).name;
    const inputPath = path.join(DESKTOP_DIR, file);
    manifest[name] ??= [];

    for (const [key, { w, h }] of Object.entries(DESKTOP_SIZES)) {
        // const base = `${name}_${key}_${w}x${h}`;
        const base = `${name}-${w}`;
        await sharp(inputPath)
            .resize(w, h, { fit: "cover", position: "attention" })
            .webp({ quality: 75 })
            .toFile(path.join(OUTPUT_DIR, `${base}.webp`));
        await sharp(inputPath)
            .resize(w, h, { fit: "cover", position: "attention" })
            .avif({ quality: 50, effort: 4 })
            .toFile(path.join(OUTPUT_DIR, `${base}.avif`));
        manifest[name].push({
            variant: key,
            x: w,
            y: h,
            webp: `${base}.webp`,
            avif: `${base}.avif`
        });
    }
    console.log(`✓ DESKTOP ${file} -> 6 files`);
}

await fs.writeFile(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(manifest, null, 2)
);
