import { prisma } from "@/app/services/prisma";

export interface CollectorDescription {
  hook: string;
  identity: string;
  collectorFocus: string;
  context: string;
}

export async function fetchCollectorDescription(
  movieId: string
): Promise<CollectorDescription | null> {
  const collectorDescription = await prisma.collectorDescription.findUnique({
    where: { movieId },
  });

  if (!collectorDescription) {
    return null;
  }

  const returnedObject: CollectorDescription = {
    hook: collectorDescription.hook ?? "",
    identity: collectorDescription.identity ?? "",
    collectorFocus: collectorDescription.collectorFocus ?? "",
    context: collectorDescription.context ?? "",
  };

  return returnedObject;
}