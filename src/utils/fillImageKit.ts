import { PrismaClient } from '../generated/prisma/client';
import { imagekit } from '../app/services/imagekit'; // adjust path if needed

const prisma = new PrismaClient();

async function uploadMissingImages() {
  // Fetch movies with cast members AND their actors
  const movies = await prisma.movie.findMany({
    include: { castMembers: { include: { actor: true } } },
  });

  for (const movie of movies) {
    // 1️⃣ Upload missing movie poster
    if (!movie.imagekitPosterPath && movie.posterPath) {
      try {
        const posterRes = await fetch(`https://image.tmdb.org/t/p/w500${movie.posterPath}`);
        const posterBuffer = Buffer.from(await posterRes.arrayBuffer());
        const uploadResult = await imagekit.upload({
          file: posterBuffer,
          fileName: `poster_${movie.tmdbId}.jpg`,
          folder: '/posters',
        });

        await prisma.movie.update({
          where: { id: movie.id },
          data: { imagekitPosterPath: uploadResult.url },
        });

        console.log(`Uploaded poster for "${movie.title}" → ${uploadResult.url}`);
      } catch (err) {
        console.error(`Failed to upload poster for "${movie.title}":`, err);
      }
    }

    // 2️⃣ Upload missing cast images
    for (const cast of movie.castMembers) {
      const actor = cast.actor;
      if (!actor.imagekitProfilePath && actor.profilePath) {
        try {
          const profileRes = await fetch(`https://image.tmdb.org/t/p/w185${actor.profilePath}`);
          const profileBuffer = Buffer.from(await profileRes.arrayBuffer());
          const uploadResult = await imagekit.upload({
            file: profileBuffer,
            fileName: `cast_${actor.id}.jpg`,
            folder: '/cast',
          });

          await prisma.actor.update({
            where: { id: actor.id },
            data: { imagekitProfilePath: uploadResult.url },
          });

          console.log(`Uploaded profile for "${actor.name}" → ${uploadResult.url}`);
        } catch (err) {
          console.error(`Failed to upload profile for "${actor.name}":`, err);
        }
      }
    }
  }

  console.log('✅ All done!');
}

uploadMissingImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());