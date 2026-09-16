#!/usr/bin/env node
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

const args = Object.fromEntries(
    process.argv
        .slice(2)
        .map(a => a.replace(/^--/, "").split("="))
        .map(([k, v]) => [k, v || true])
);

const CONFIG_PATH = args.config || "./cropper.config.mjs";
const OUTPUT_ROOT = args.out || "./dist";
const GENERATE_MANIFEST = !!args.manifest;
const FILTER_SERVICE = args.service || "all";
const FILTER_PROFILE = args.profile || "all";

const s = (w, ratio) => ({ w, h: Math.round(w / ratio) });

let config = {};
try {
    const full = path.resolve(CONFIG_PATH);
    await fs.access(full);
    config = await import(pathToFileURL(full).href);
    console.log(`✓ Loaded config: ${CONFIG_PATH}`);
} catch {
    console.log(`ℹ No config found at ${CONFIG_PATH}, using defaults`);
}

const DEFAULT_PROFILES = {
    cards_mobile: {
        ratio: 3 / 2,
        widths: [390, 780, 1170],
        webpQ: 70,
        avifQ: 50
    },
    cards_desktop: {
        ratio: 2,
        widths: [360, 720],
        webpQ: 70,
        avifQ: 50
    }
};

const PROFILES = config.PROFILES || DEFAULT_PROFILES;
const SERVICES = config.SERVICES || null;
const INPUT_ROOT = config.INPUT_ROOT || "./input";
const OUTPUT_STRUCTURE =
    config.OUTPUT_STRUCTURE || (SERVICES ? "service/profile" : "profile");

await fs.mkdir(OUTPUT_ROOT, { recursive: true });

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

async function processOne(
    inputDir,
    outDir,
    profileName,
    profile,
    serviceName = null
) {
    const files = await list(inputDir);
    if (files.length === 0) return false;
    await fs.mkdir(outDir, { recursive: true });
    for (const file of files) {
        const name = path.parse(file).name;
        const inputPath = path.join(inputDir, file);
        const key = serviceName ? `${serviceName}/${name}` : name;
        manifest[key] ??= [];
        for (const w of profile.widths) {
            const { h } = s(w, profile.ratio);
            const base = `${name}-${w}`;
            const pipeline = sharp(inputPath).resize(w, h, {
                fit: "cover",
                position: "attention"
            });
            await pipeline
                .clone()
                .webp({ quality: profile.webpQ })
                .toFile(path.join(outDir, `${base}.webp`));
            await pipeline
                .clone()
                .avif({ quality: profile.avifQ, effort: 4 })
                .toFile(path.join(outDir, `${base}.avif`));
            const relWebp = serviceName
                ? `${serviceName}/${profileName}/${base}.webp`
                : `${profileName}/${base}.webp`;
            const relAvif = serviceName
                ? `${serviceName}/${profileName}/${base}.avif`
                : `${profileName}/${base}.avif`;
            manifest[key].push({
                service: serviceName,
                profile: profileName,
                x: w,
                y: h,
                webp: relWebp,
                avif: relAvif
            });
        }
        console.log(
            `✓ ${serviceName ? serviceName + "/" : ""}${profileName} ${file} -> ${profile.widths.length * 2} files`
        );
    }
    return true;
}

let didAny = false;

if (SERVICES) {
    const targetServices =
        FILTER_SERVICE === "all" ? SERVICES : [FILTER_SERVICE];
    const targetProfiles =
        FILTER_PROFILE === "all" ? Object.keys(PROFILES) : [FILTER_PROFILE];

    for (const service of targetServices) {
        for (const profileName of targetProfiles) {
            const p = PROFILES[profileName];
            if (!p) {
                console.log(`⚠ Profile not found: ${profileName}`);
                continue;
            }
            const inputDir = path.join(INPUT_ROOT, service, profileName);
            let outDir;
            if (OUTPUT_STRUCTURE === "service/profile")
                outDir = path.join(OUTPUT_ROOT, service, profileName);
            else if (OUTPUT_STRUCTURE === "profile")
                outDir = path.join(OUTPUT_ROOT, profileName);
            else outDir = OUTPUT_ROOT;
            const ok = await processOne(
                inputDir,
                outDir,
                profileName,
                p,
                service
            );
            if (ok) didAny = true;
        }
    }
} else {
    const targetProfiles =
        FILTER_PROFILE === "all" ? Object.keys(PROFILES) : [FILTER_PROFILE];
    for (const profileName of targetProfiles) {
        const p = PROFILES[profileName];
        if (!p) {
            console.log(`⚠ Profile not found: ${profileName}`);
            continue;
        }
        const inputDir = path.join(INPUT_ROOT, profileName);
        const outDir =
            OUTPUT_STRUCTURE === "flat"
                ? OUTPUT_ROOT
                : path.join(OUTPUT_ROOT, profileName);
        const ok = await processOne(inputDir, outDir, profileName, p, null);
        if (ok) didAny = true;
    }
}

if (!didAny) {
    console.log(`\n⚠ No images found. Checked: ${INPUT_ROOT}/...`);
    console.log(
        `   Make sure you have: input/<service>/<profile>/  or input/<profile>/`
    );
}

if (GENERATE_MANIFEST) {
    await fs.writeFile(
        path.join(OUTPUT_ROOT, "manifest.json"),
        JSON.stringify(manifest, null, 2)
    );
    console.log(
        `\n✓ manifest.json written (${Object.keys(manifest).length} images)`
    );
}
