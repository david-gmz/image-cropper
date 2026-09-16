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
    cards_mobile: {
        ratio: 2, // 2:1
        widths: [390, 780, 1170],
        webpQ: 70,
        avifQ: 50
    },
    cards_desktop: {
        ratio: 3 / 2, // 3:2
        widths: [360, 720],
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
    hero_service_desktop: {
        ratio: 5 / 4,
        widths: [480, 960],
        webpQ: 80,
        avifQ: 55
    },
    menu_mobile: {
        ratio: 3 / 2,
        widths: [390, 780, 1170],
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
