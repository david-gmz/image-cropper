// cropper.config.mjs - example for a blog / portfolio
export const SERVICES = ["posts", "projects", "authors"];

export const PROFILES = {
    thumbnail_mobile: {
        ratio: 1,
        widths: [150, 300],
        webpQ: 70,
        avifQ: 50
    },
    thumbnail_desktop: {
        ratio: 1,
        widths: [300, 600],
        webpQ: 70,
        avifQ: 50
    },
    cover_mobile: {
        ratio: 16 / 9,
        widths: [390, 780],
        webpQ: 75,
        avifQ: 50
    },
    cover_desktop: {
        ratio: 21 / 9,
        widths: [1280, 1920],
        webpQ: 75,
        avifQ: 50
    }
};
