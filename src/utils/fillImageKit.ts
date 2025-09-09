import { PrismaClient } from '../generated/prisma/client';
import { imagekit } from '../app/services/imagekit'; // adjust path if needed
const prisma = new PrismaClient();

async function uploadMissingImages() {
  const movies = await prisma.movie.findMany({
    include: { castMembers: true },
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
      if (!cast.imagekitProfilePath && cast.profilePath) {
        try {
          const profileRes = await fetch(`https://image.tmdb.org/t/p/w185${cast.profilePath}`);
          const profileBuffer = Buffer.from(await profileRes.arrayBuffer());
          const uploadResult = await imagekit.upload({
            file: profileBuffer,
            fileName: `cast_${cast.castId}.jpg`,
            folder: '/cast',
          });

          await prisma.castMember.update({
            where: { id: cast.id },
            data: { imagekitProfilePath: uploadResult.url },
          });

          console.log(`Uploaded profile for "${cast.name}" → ${uploadResult.url}`);
        } catch (err) {
          console.error(`Failed to upload profile for "${cast.name}":`, err);
        }
      }
    }
  }

  console.log('✅ All done!');
}

uploadMissingImages()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
