import { prisma } from "../prisma";
import axios from "axios";
import qs from "qs";

interface RawEbayPrice { value: string; currency: string; }
interface RawEbayImage { imageUrl: string; }
interface RawEbayItem {
  title: string;
  price: RawEbayPrice;
  thumbnailImages: RawEbayImage[];
  itemWebUrl: string;
}
interface RawEbaySearchResponse { itemSummaries: RawEbayItem[]; }

export interface EbayItemPrice { value: string; currency: string; }
export interface EbayItemImage { imageUrl: string; }
export interface EbayItemSummary {
  title: string;
  price: EbayItemPrice;
  image: EbayItemImage;
  itemAffiliateWebUrl: string;
}
export interface EbaySearchResponse { itemSummaries: EbayItemSummary[]; }

// Map raw eBay response to our format
function mapEbayItem(item: RawEbayItem): EbayItemSummary {
  return {
    title: item.title,
    price: { value: item.price.value, currency: item.price.currency },
    image: { imageUrl: item.thumbnailImages[0]?.imageUrl || '' },
    itemAffiliateWebUrl: item.itemWebUrl
  };
}

// Get eBay OAuth token
export async function getEbayAccessToken(): Promise<string> {
  const record = await prisma.ebayToken.findFirst();
  const now = Date.now();

  if (record && record.expiresAt.getTime() > now) {
    console.log("✅ Using cached eBay token.");
    return record.token;
  }

  console.log("⏳ Requesting new eBay token...");
  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;

  const tokenResponse = await axios.post(
    'https://api.ebay.com/identity/v1/oauth2/token',
    qs.stringify({ grant_type: 'client_credentials', scope: 'https://api.ebay.com/oauth/api_scope' }),
    { headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      }
    }
  );

  const token = tokenResponse.data.access_token;
  const expiresInMs = tokenResponse.data.expires_in * 1000;

  await prisma.ebayToken.upsert({
    where: { id: 1 },
    create: { id: 1, token, expiresAt: new Date(now + expiresInMs - 60000) },
    update: { token, expiresAt: new Date(now + expiresInMs - 60000) }
  });

  return token;
}

// Fetch eBay items for a query (no DB check)
export async function getEbayItems(query: string, accessToken: string): Promise<EbaySearchResponse> {
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=15`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-EBAY-C-ENDUSERCTX": "contextualLocation=country=US,zip=10001"
    }
  });

  const data: RawEbaySearchResponse = await res.json();

  return { itemSummaries: (data.itemSummaries || []).map(mapEbayItem) };
}