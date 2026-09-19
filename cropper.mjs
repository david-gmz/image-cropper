#!/usr/bin/env node
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

// Parse args supporting repeats: --service=a --service=b  and comma lists
function parseArgs(argv) {
    const args = {};
    for (const raw of argv) {
        if (!raw.startsWith("--")) continue;
        const eq = raw.indexOf("=");
        let key, val;
        if (eq === -1) {
            key = raw.slice(2);
            val = true;
        } else {
            key = raw.slice(2, eq);
            val = raw.slice(eq + 1);
        }
        if (args[key] === undefined) args[key] = val;
        else if (Array.isArray(args[key])) args[key].push(val);
        else args[key] = [args[key], val];
    }
    return args;
}
function toArray(val) {
    if (!val) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.flatMap(v =>
        typeof v === "string"
            ? v
                  .split(",")
                  .map(s => s.trim())
                  .filter(Boolean)
            : [v]
    );
}

const args = parseArgs(process.argv.slice(2));
const CONFIG_PATH = args.config || "./cropper.config.mjs";
const OUTPUT_ROOT = args.out || "./dist";
const GENERATE_MANIFEST = !!args.manifest;
const GENERATE_FALLBACK = !!args.fallback; // --fallback flag
const FILTER_SERVICE_RAW = args.service || "all";
const FILTER_PROFILE_RAW = args.profile || "all";
const FILTER_SERVICES =
    FILTER_SERVICE_RAW === "all" ? ["all"] : toArray(FILTER_SERVICE_RAW);
const FILTER_PROFILES =
    FILTER_PROFILE_RAW === "all" ? ["all"] : toArray(FILTER_PROFILE_RAW);

const s = (w, ratio) => ({ w, h: Math.round(w / ratio) });

let config = {};
try {
    const full = path.resolve(CONFIG_PATH);
    await fs.access(full);
    config = await import(pathToFileURL(full).href);
    console.log(`✓ Loaded config: ${CONFIG_PATH}`);
    if (FILTER_SERVICES.length > 1 || FILTER_SERVICES[0] !== "all") {
        console.log(`  → Filtering services: ${FILTER_SERVICES.join(", ")}`);
    }
    if (FILTER_PROFILES.length > 1 || FILTER_PROFILES[0] !== "all") {
        console.log(`  → Filtering profiles: ${FILTER_PROFILES.join(", ")}`);
    }
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
const FALLBACK_ENABLED = config.FALLBACK_JPG ?? true; // global toggle
const FALLBACK_Q = config.FALLBACK_Q || 75;

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
    const minW = Math.min(...profile.widths);
    const shouldFallback =
        (GENERATE_FALLBACK || FALLBACK_ENABLED || profile.fallback) &&
        profile.fallback !== false;

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

        // mozjpeg fallback: smallest width, named ${name}.jpg
        if (shouldFallback) {
            const { h } = s(minW, profile.ratio);
            const fallbackPath = path.join(outDir, `${name}.jpg`);
            await sharp(inputPath)
                .resize(minW, h, { fit: "cover", position: "attention" })
                .jpeg({
                    mozjpeg: true,
                    quality: profile.fallbackQ || FALLBACK_Q,
                    chromaSubsampling: "4:4:4"
                })
                .toFile(fallbackPath);
            // console.log(`  ↳ fallback ${name}.jpg (${minW}w)`);
        }

        console.log(
            `✓ ${serviceName ? serviceName + "/" : ""}${profileName} ${file} -> ${profile.widths.length * 2} + ${shouldFallback ? "1 jpg fallback" : ""}`
        );
    }
    return true;
}

let didAny = false;
if (SERVICES) {
    const targetServices = FILTER_SERVICES.includes("all")
        ? SERVICES
        : FILTER_SERVICES;
    const targetProfiles = FILTER_PROFILES.includes("all")
        ? Object.keys(PROFILES)
        : FILTER_PROFILES;
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
    const targetProfiles = FILTER_PROFILES.includes("all")
        ? Object.keys(PROFILES)
        : FILTER_PROFILES;
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
