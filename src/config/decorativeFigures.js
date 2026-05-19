export const DECORATIVE_FIGURES = [
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-man-met-koffie-scaled.png',
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-breakdancer-scaled.png',
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-drag-queen-scaled.png',
    'https://media.cafetheaterfestival.nl/wp-content/uploads/2025/12/cafe-theater-festival-viool-speelster-scaled.png'
];

// Helper om willekeurige figuren te kiezen op basis van een seed (zodat het stabiel blijft per pagina) of random
export const getRandomFigures = (seedString) => {
    let seed = 0;
    if (seedString) {
        for (let i = 0; i < seedString.length; i++) {
            seed = ((seed << 5) - seed) + seedString.charCodeAt(i);
            seed |= 0;
        }
    } else {
        seed = Math.floor(Math.random() * 10000);
    }

    // Kies index 1
    const index1 = Math.abs(seed) % DECORATIVE_FIGURES.length;
    // Kies index 2 (zorg dat het niet dezelfde is als index 1)
    let index2 = Math.abs(seed >> 1) % DECORATIVE_FIGURES.length;
    if (index1 === index2) {
        index2 = (index2 + 1) % DECORATIVE_FIGURES.length;
    }

    return [DECORATIVE_FIGURES[index1], DECORATIVE_FIGURES[index2]];
};
