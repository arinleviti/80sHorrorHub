//npm run cleanupYoutube
import { prisma } from "../src/app/services/prisma";
const THIRTY_MINUTES_MS = 1000 * 60 * 30;
async function cleanup() {
  await prisma.youTubeQuery.deleteMany({
    where: {
      updatedAt: {
        lt: new Date(Date.now() - THIRTY_MINUTES_MS), // less than 30 minutes
      },
    },
  });

  console.log("✅ Cleanup done");
}

cleanup();