import { PrismaClient } from '../../generated/prisma/client';

const prisma = new PrismaClient();

interface AiDescription {
    synopsis: string;
    funFacts: string;
    productionContext: string;
    reception: string;
}

export async function fetchAIDescription(movieId: string): Promise<AiDescription | null> {
    const aiDescription = await prisma.aiDescription.findUnique({
        where: { movieId },
    });

    if (!aiDescription) {
        return null;
    }

    // map nulls to empty strings to satisfy AiDescription interface
    const returnedObject: AiDescription = {
        synopsis: aiDescription.synopsis ?? "",
        funFacts: aiDescription.funFacts ?? "",
        productionContext: aiDescription.productionContext ?? "",
        reception: aiDescription.reception ?? "",
    };

    return returnedObject;
}
