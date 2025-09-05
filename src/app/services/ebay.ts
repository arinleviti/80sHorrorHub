import axios from 'axios';
import qs from 'qs';

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;
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
    // Map raw data to your strict interface
    const mappedData: EbaySearchResponse = {
        itemSummaries: data.itemSummaries.map(mapEbayItem)
    };

    return mappedData;

}
async function getEbayAccessToken(): Promise<string | null> {
    if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
        console.log("Using cached eBay token.");
        return cachedToken;
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
    cachedToken = tokenResponse.data.access_token;
    tokenExpiry = Date.now() + (tokenResponse.data.expires_in * 1000) - 60000; // 1 min buffer
    return cachedToken;
    /* return tokenResponse.data.access_token; */
}