// cropper.config.mjs - delisnack project
// Copy this file to your project root as cropper.config.mjs

export const INPUT_ROOT = "./input";
export const OUTPUT_STRUCTURE = "profile"; // profile | flat

export const PROFILES = {
    placeholder: {
        ratio: 3 / 2,
        widths: [360, 390, 480, 720, 780, 960, 1170],
        webpQ: 70,
        avifQ: 50
    }
};
