import { prisma } from "../prisma";
import axios from "axios";
import qs from "qs";

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
  thumbnailImages?: RawEbayImage[];
  itemWebUrl: string;
  itemAffiliateWebUrl?: string;
  itemEndDate?: string; // This is the field returned by MATCHING_ITEMS
}

interface RawEbaySearchResponse {
  itemSummaries: RawEbayItem[];
}

export interface EbayItemPrice {
  value: string;
  currency: string;
}

export interface EbayItemImage {
  imageUrl: string;
}

export interface EbayItemSummary {
  title: string;
  price: EbayItemPrice;
  image: EbayItemImage;
  itemAffiliateWebUrl: string;
  listing?: {
    endDate?: string; // ISO string from eBay API
  };
}

export interface EbaySearchResponse {
  itemSummaries: EbayItemSummary[];
}

/**
 * Maps the raw API response to our internal EbayItemSummary type
 */
function mapEbayItem(item: RawEbayItem): EbayItemSummary {
  return {
    title: item.title,
    price: {
      value: item.price.value,
      currency: item.price.currency
    },
    image: {
      imageUrl: item.thumbnailImages?.[0]?.imageUrl || ''
    },
    itemAffiliateWebUrl: item.itemAffiliateWebUrl || item.itemWebUrl, // ← prefer affiliate
    listing: {
      // Mapping the raw 'itemEndDate' to our structured 'listing.endDate'
      endDate: item.itemEndDate
    }
  };
}

// Get eBay OAuth token
export async function getEbayAccessToken(): Promise<string | null> {
  const record = await prisma.ebayToken.findFirst();
  const now = Date.now();

  if (record && record.expiresAt.getTime() > now) {
    console.log("✅ Using cached eBay token.");
    return record.token;
  }

  console.log("⏳ Requesting new eBay token...");

  const clientId = process.env.EBAY_CLIENT_ID!;
  const clientSecret = process.env.EBAY_CLIENT_SECRET!;

  try {
    const tokenResponse = await axios.post(
      'https://api.ebay.com/identity/v1/oauth2/token',
      qs.stringify({
        grant_type: 'client_credentials',
        scope: 'https://api.ebay.com/oauth/api_scope'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
        },
        timeout: 5000 // 🔥 prevent hanging
      }
    );

    const token = tokenResponse.data.access_token;
    const expiresInMs = tokenResponse.data.expires_in * 1000;

    await prisma.ebayToken.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        token,
        expiresAt: new Date(now + expiresInMs - 60000)
      },
      update: {
        token,
        expiresAt: new Date(now + expiresInMs - 60000)
      }
    });

    return token;

  } catch (error) {
    console.error("❌ eBay token fetch failed:", error);
    return null; // 🔥 CRITICAL
  }
}

/**
 * Fetches eBay items with the MATCHING_ITEMS fieldgroup to unlock expiry dates
 */
export async function getEbayItems(
  query: string,
  accessToken: string
): Promise<EbaySearchResponse> {

  // CRITICAL: Added &fieldgroups=MATCHING_ITEMS to unlock itemEndDate
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(query)}&limit=15&fieldgroups=MATCHING_ITEMS`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-EBAY-C-ENDUSERCTX": `affiliateCampaignId=${process.env.EBAY_CAMPAIGN_ID},contextualLocation=country=US,zip=10001`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`❌ eBay API Error (${res.status}):`, errorText);
    return { itemSummaries: [] };
  }

  const data: RawEbaySearchResponse = await res.json();

  return {
    itemSummaries: (data.itemSummaries || []).map(mapEbayItem)
  };
}