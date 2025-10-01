"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("../src/generated/prisma/client");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const prisma = new client_1.PrismaClient();
// Load JSON dynamically so compiled JS can find it
const jsonPath = path_1.default.resolve(__dirname, '../src/app/services/aiMovieDescriptions.json');
const aiMovieDescriptions = JSON.parse(fs_1.default.readFileSync(jsonPath, 'utf-8'));
// Simple helper to normalize strings for matching
function normalize(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
// Optional: compute simple word overlap percentage
function similarity(a, b) {
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));
    const intersection = [...wordsA].filter(x => wordsB.has(x));
    return intersection.length / Math.max(wordsA.size, wordsB.size);
}
async function main() {
    // Fetch only the necessary movie fields
    const allMovies = await prisma.movie.findMany({
        select: { id: true, title: true, slug: true },
    });
    for (const movieData of aiMovieDescriptions) {
        const { slug, aiDescription } = movieData;
        const normalizedSlug = normalize(slug);
        // Find best matching movie
        const matchedMovie = allMovies.find(m => {
            const normalizedTitle = normalize(m.title);
            return normalizedTitle === normalizedSlug || similarity(normalizedTitle, normalizedSlug) >= 0.7;
        });
        if (!matchedMovie) {
            console.warn(`No matching movie found for slug: "${slug}"`);
            continue;
        }
        // Upsert AI description: update if exists, create if not
        await prisma.aiDescription.upsert({
            where: { movieId: matchedMovie.id },
            update: Object.assign({}, aiDescription),
            create: Object.assign(Object.assign({}, aiDescription), { movieId: matchedMovie.id }),
        });
        console.log(`Upserted AI description for movie: ${matchedMovie.title}`);
    }
}
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
