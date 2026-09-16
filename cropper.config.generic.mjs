// cropper.config.mjs - generic / other projects
// No SERVICES = flat mode: input/<profile>/ -> dist/<profile>/

export const INPUT_ROOT = "./input";
export const OUTPUT_STRUCTURE = "profile"; // profile | flat

export const PROFILES = {
  cards_mobile: {
    ratio: 3/2,
    widths: [390, 780, 1190],
    webpQ: 80,
    avifQ: 50,
  },
  cards_desktop: {
    ratio: 2,
    widths: [360, 720],
    webpQ: 80,
    avifQ: 50,
  },
  hero_mobile: {
    ratio: 4/5,
    widths: [412, 824],
    webpQ: 75,
    avifQ: 55,
  },
  hero_desktop: {
    ratio: 16/9,
    widths: [1024, 1920],
    webpQ: 75,
    avifQ: 55,
  },
};
