import axios from 'axios';
import qs from 'qs';
import { PrismaClient } from '../../generated/prisma/client';

const TWELVE_HOURS_MS = 1000 * 60 * 60 * 12; // 43,200,000 ms
const prisma = new PrismaClient();
export interface EbayItemPrice {
    value: string;      // Price as a string
    currency: string;   // Currency code, e.g., "USD"
}

export interface EbayItemImage {
    imageUrl: string;   // Image URL
}

export interface EbayItemSummary {
    title: string;                 // Item title
    price: EbayItemPrice;          // Price object
    image: EbayItemImage;          // Image object
    itemAffiliateWebUrl: string;   // Link to eBay item
}

export interface EbaySearchResponse {
    itemSummaries: EbayItemSummary[];  // Array of item summaries
}
// Mock data for development before your API access
const mockEbayResponse: EbaySearchResponse = {
    itemSummaries: [
        {
            title: "The Matrix Neo Action Figure",
            price: { value: "19.99", currency: "USD" },
            image: { imageUrl: "https://via.placeholder.com/100x100.png?text=Action+Figure" },
            itemAffiliateWebUrl: "https://www.ebay.com/itm/1234567890"
        },
        {
            title: "The Matrix Poster 1999",
            price: { value: "9.99", currency: "USD" },
            image: { imageUrl: "https://via.placeholder.com/100x150.png?text=Poster" },
            itemAffiliateWebUrl: "https://www.ebay.com/itm/1234567891"
        }
    ]
};
interface RawEbayPrice {
    value: string;
    currency: string;
}

interface RawEbayImage {
    imageUrl: string;
}

interface RawEbayItem {
    title: string;
    price: RawEbayPrice;
    thumbnailImages: RawEbayImage[];
    itemWebUrl: string;
}
interface RawEbaySearchResponse {
    itemSummaries: RawEbayItem[];
}
function mapEbayItem(item: RawEbayItem): EbayItemSummary {
    return {
        title: item.title,
        price: item.price,
        image: { imageUrl: item.thumbnailImages[0]?.imageUrl || '' },
        itemAffiliateWebUrl: item.itemWebUrl
    };
}
export async function getEbayItems(query: string): Promise<EbaySearchResponse> {
    /* console.log("Starting getEbayItems with query:", query); */
    const cached = await prisma.ebayQuery.findUnique({
        where: { query },
        include: { items: true },
    });

    if (cached && Date.now() - cached.updatedAt.getTime() < TWELVE_HOURS_MS) {
        // return cached data
        console.log("Using cached eBay data for query:", query);
        const mappedData: EbaySearchResponse = {
            itemSummaries: cached.items.map(i => ({
                title: i.title,
                price: { value: i.priceValue, currency: i.priceCurrency },
                image: { imageUrl: i.imageUrl },
                itemAffiliateWebUrl: i.itemUrl
            }))
        };
        return mappedData;
    }

    let accessToken: string | null = null;
    try {
        accessToken = await getEbayAccessToken();
    } catch (err) {
        console.warn("Failed to get eBay access token, returning mock data.", err);
        return mockEbayResponse;
    }

    if (!accessToken) {
        console.warn("access token is not received. Returning mock data.");
        return mockEbayResponse;
    }
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=4`;
    /* console.log("Request URL:", url); */
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=US,zip=10001'
        }
    });
    /* console.log("Response status:", res.status, res.statusText); */
    if (!res.ok) {
        console.warn("eBay API returned a non-OK status, using mock data.");
        /* const text = await res.text(); */
        /*  console.log("Response text:", text); */
        return mockEbayResponse;
    }
    const data: RawEbaySearchResponse = await res.json();


   const mappedData: EbaySearchResponse = {
    itemSummaries: (data.itemSummaries || []).map(mapEbayItem)
};
if (!data.itemSummaries) {
    console.warn(`eBay response for query "${query}" has no itemSummaries`, data);
}
    // ✅ Log that this data comes from the eBay API
    console.log(`Fetched fresh eBay data for query: "${query}" from the eBay API.`);

    await prisma.ebayQuery.upsert({
        where: { query }, // Look for EbayQuery WHERE query == query (variable)
        create: {       // If no record is found
            query,   // create one with this query value. It's shorthand for query: query
            items: {
                create: mappedData.itemSummaries.map(i => ({
                    title: i.title,
                    priceValue: i.price.value,
                    priceCurrency: i.price.currency,
                    imageUrl: i.image.imageUrl,
                    itemUrl: i.itemAffiliateWebUrl
                }))
            }
        },
        update: {
            updatedAt: new Date(), // <-- force the parent updatedAt to now
            items: {
                deleteMany: {},
                create: mappedData.itemSummaries.map(i => ({
                    title: i.title,
                    priceValue: i.price.value,
                    priceCurrency: i.price.currency,
                    imageUrl: i.image.imageUrl,
                    itemUrl: i.itemAffiliateWebUrl
                }))
            }
        }
    });
    return mappedData;

}
async function getEbayAccessToken(): Promise<string | null> {
    const record = await prisma.ebayToken.findFirst();
    if (record && record.expiresAt.getTime() > Date.now()) {
        console.log("Using cached eBay token.");
        return record.token;
    }

    console.log("No valid cached token. Requesting new eBay token...");
    const clientId = process.env.EBAY_CLIENT_ID!;
    const clientSecret = process.env.EBAY_CLIENT_SECRET!;

    const tokenResponse = await axios.post(
        'https://api.ebay.com/identity/v1/oauth2/token',
        //qs.stringify converts the data into URL-encoded form (grant_type=client_credentials&scope=...).
        qs.stringify({
            grant_type: 'client_credentials',
            scope: 'https://api.ebay.com/oauth/api_scope'
        }),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
            }
        }
    );
    const token = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in * 1000; // lifespan in ms
    // Upsert into SQLite
    await prisma.ebayToken.upsert({
        where: { id: 1 },
        update: { token, expiresAt: new Date(Date.now() + expiresIn - 60000) },
        create: { id: 1, token, expiresAt: new Date(Date.now() + expiresIn - 60000) }
    });

    return token;
}