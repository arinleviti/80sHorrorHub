//npm run cleanupYoutube
import { prisma } from "../src/app/services/prisma";

async function cleanup() {
  await prisma.youTubeQuery.deleteMany({
    where: {
      updatedAt: {
        lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      },
    },
  });

  console.log("✅ Cleanup done");
}

cleanup();