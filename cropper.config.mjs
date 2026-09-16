// cropper.config.mjs - FLAT MODE (your current structure)
// You have: input/hero_desktop/hero.jpg and input/hero_mobile/hero.jpg
// So NO SERVICES - just PROFILES

export const INPUT_ROOT = "./input";
export const OUTPUT_STRUCTURE = "profile"; // profile | flat

export const PROFILES = {
    hero_mobile: {
        ratio: 1 / 2,
        widths: [412, 824, 1236],
        webpQ: 75,
        avifQ: 55
    },
    hero_desktop: {
        ratio: 16 / 9,
        widths: [1024, 1440],
        webpQ: 75,
        avifQ: 55
    }
};
