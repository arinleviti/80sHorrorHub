// npm run cleanupEbay
import { prisma } from "../src/app/services/prisma";

async function cleanup() {
  // Delete EbayQuery records older than 24 hours
  const deleted = await prisma.ebayQuery.deleteMany({
    where: {
      updatedAt: {
        lt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours
      },
    },
  });

  console.log(`✅ Cleanup done. ${deleted.count} old eBay queries removed.`);
}

cleanup().catch((err) => {
  console.error("❌ Cleanup failed:", err);
});