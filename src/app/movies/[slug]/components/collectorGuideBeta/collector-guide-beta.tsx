// Collector's Guide (beta). Mounted on the movie page with one line: <CollectorGuideBeta slug={slug} />.
// Fetches its own data and renders nothing unless the film has a published guide.
import { prisma } from "@/app/services/prisma";
import { COLLECTOR_GUIDE_SLUGS } from "@/collectorGuide/config";
import type { GuideContent } from "@/collectorGuide/pipeline/writer";
import CollectorGuideBetaClient from "./collector-guide-beta-client";

interface CollectorGuideBetaProps {
  slug: string;
}

export default async function CollectorGuideBeta({ slug }: CollectorGuideBetaProps) {
  if (!COLLECTOR_GUIDE_SLUGS.includes(slug)) return null;

  try {
    const guide = await prisma.collectorGuide.findFirst({
      where: { slug, status: "published" },
      orderBy: { createdAt: "desc" },
      select: { content: true, createdAt: true },
    });
    if (!guide) return null;

    return (
      <CollectorGuideBetaClient
        content={guide.content as GuideContent}
        updatedAt={guide.createdAt.toISOString()}
      />
    );
  } catch (err) {
    // A beta feature must never break the movie page.
    console.error("CollectorGuideBeta failed:", err);
    return null;
  }
}
