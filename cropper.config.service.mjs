// cropper.config.mjs - SERVICE MODE (for delisnack 6 services)
// Structure: input/<service>/<profile>/hero.jpg
// Example: input/box-lunch/hero_mobile/hero.jpg

export const INPUT_ROOT = "./input";
export const OUTPUT_STRUCTURE = "service/profile";

export const SERVICES = [
    "box-lunch",
    "canapes",
    "coffee-break",
    "snack-cart",
    "taquiza",
    "other"
];

export const PROFILES = {
    hero_mobile: {
        ratio: 4 / 5,
        widths: [412, 824],
        webpQ: 75,
        avifQ: 55
    },
    hero_desktop: {
        ratio: 16 / 9,
        widths: [1024, 1440],
        webpQ: 75,
        avifQ: 55
    },
    menu_mobile: {
        ratio: 3 / 2,
        widths: [390, 780],
        webpQ: 70,
        avifQ: 50
    },
    menu_desktop: {
        ratio: 2,
        widths: [360, 720],
        webpQ: 70,
        avifQ: 50
    }
};
