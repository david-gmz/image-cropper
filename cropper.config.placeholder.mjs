// cropper.config.mjs - delisnack project
// Copy this file to your project root as cropper.config.mjs

export const INPUT_ROOT = "./input";
export const OUTPUT_STRUCTURE = "service/profile"; // service/profile | profile | flat

// These become folders: input/<service>/<profile>/
export const SERVICES = [
  "box-lunch",
  "canapes", 
  "coffee-break",
  "snack-cart",
  "taquiza",
];

export const PROFILES = {
    placeholder_3_2: {
        ratio: 3 / 2,
        widths: [360, 390, 720, 780, 1170],
        webpQ: 70,
        avifQ: 50
    },
    placeholder_2_1: {
        ratio: 2,
        widths: [360, 390, 720, 780, 1170],
        webpQ: 70,
        avifQ: 50
    },
    // hero_service_mobile: {
    //     dir: args.hero_service_mobile || "./input-hero-service-mobile",
    //     ratio: 5 / 4, // portrait
    //     widths: [390, 780],
    //     webpQ: 80,
    //     avifQ: 55
    // },
    placeholder_hero: {
        ratio: 5 / 4,
        widths: [480, 960],
        webpQ: 75,
        avifQ: 55
    }
};
