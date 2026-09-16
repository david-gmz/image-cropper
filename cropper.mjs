#!/usr/bin/env node
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

// pnpm crop --cards_mobile=./my-cards-mobile --hero_desktop=./my-hero-desktop --out=./dist --manifest
const args = Object.fromEntries(
    process.argv
        .slice(2)
        .map(a => a.replace(/^--/, "").split("="))
        .map(([k, v]) => [k, v || true])
);

const OUTPUT_DIR = args.out || "./dist";
const GENERATE_MANIFEST = !!args.manifest;

// w = x, h = y - cartesian, x always first
const s = (w, ratio) => ({ w, h: Math.round(w / ratio) });

const PROFILES = {
    cards_mobile: {
        dir: args.cards_mobile || "./input-cards-mobile",
        ratio: 2, // 2:1
        widths: [390, 780, 1190],
        webpQ: 70,
        avifQ: 50
    },
    cards_desktop: {
        dir: args.cards_desktop || "./input-cards-desktop",
        ratio: 3 / 2, // 3:2
        widths: [360, 720],
        webpQ: 70,
        avifQ: 50
    },
    hero_mobile: {
        dir: args.hero_mobile || "./input-hero-mobile",
        ratio: 1 / 2, // portrait
        widths: [412, 824, 1648],
        webpQ: 75,
        avifQ: 55
    },
    hero_desktop: {
        dir: args.hero_desktop || "./input-hero-desktop",
        ratio: 16 / 9,
        widths: [1024, 1440],
        webpQ: 75,
        avifQ: 55
    },
    // hero_service_mobile: {
    //     dir: args.hero_service_mobile || "./input-hero-service-mobile",
    //     ratio: 5 / 4, // portrait
    //     widths: [390, 780],
    //     webpQ: 80,
    //     avifQ: 55
    // },
    hero_service_desktop: {
        dir: args.hero_service_desktop || "./input-hero-service-desktop",
        ratio: 5 / 4,
        widths: [480, 960],
        webpQ: 80,
        avifQ: 55
    },
    menu_mobile: {
        dir: args.menu_mobile || "./input-menu-mobile",
        ratio: 3 / 2,
        widths: [390, 780, 1190],
        webpQ: 70,
        avifQ: 50
    },
    menu_desktop: {
        dir: args.menu_desktop || "./input-menu-desktop",
        ratio: 2,
        widths: [360, 720],
        webpQ: 70,
        avifQ: 50
    }
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const list = async dir => {
    try {
        return (await fs.readdir(dir)).filter(f =>
            /\.(jpe?g|png|webp)$/i.test(f)
        );
    } catch {
        return [];
    }
};

const manifest = {};

for (const [profileName, p] of Object.entries(PROFILES)) {
    const files = await list(p.dir);
    if (files.length === 0) continue;

    // each profile gets its own subfolder -> no collision for `${name}-${w}`
    const profileOutDir = path.join(OUTPUT_DIR, profileName);
    await fs.mkdir(profileOutDir, { recursive: true });

    for (const file of files) {
        const name = path.parse(file).name;
        const inputPath = path.join(p.dir, file);
        manifest[name] ??= [];

        for (const w of p.widths) {
            const { h } = s(w, p.ratio);
            const base = `${name}-${w}`; // x is in filename, y is derived from ratio

            const pipeline = sharp(inputPath).resize(w, h, {
                fit: "cover",
                position: "attention"
            });

            await pipeline
                .clone()
                .webp({ quality: p.webpQ })
                .toFile(path.join(profileOutDir, `${base}.webp`));
            await pipeline
                .clone()
                .avif({ quality: p.avifQ, effort: 4 })
                .toFile(path.join(profileOutDir, `${base}.avif`));

            manifest[name].push({
                profile: profileName,
                x: w,
                y: h,
                webp: `${profileName}/${base}.webp`,
                avif: `${profileName}/${base}.avif`
            });
        }
        console.log(
            `✓ ${profileName.toUpperCase()} ${file} -> ${p.widths.length * 2} files in ${profileName}/`
        );
    }
}

if (GENERATE_MANIFEST) {
    await fs.writeFile(
        path.join(OUTPUT_DIR, "manifest.json"),
        JSON.stringify(manifest, null, 2)
    );
    console.log(
        `\n✓ manifest.json written (${Object.keys(manifest).length} images)`
    );
} else {
    console.log("\nNo manifest generated. Use --manifest to create it.");
}
