// src/app/services/youtube.ts
  import { PrismaClient } from '../../generated/prisma/client';

  const prisma = new PrismaClient(); // directly instantiating, no singleton


const TWO_WEEKS_MS = 1000 * 60 * 60 * 24 * 14;

interface YouTubeSearchResponse {
  items: {
    id: { videoId: string };
    snippet: {
      title: string;
      thumbnails: { medium: { url: string } };
    };
  }[];
}
export interface YouTubeVideo {
  youtubeId: string;
  title: string;
  thumbnail: string;
  url: string;
}
export async function getYouTubeVideos(query: string) {
 console.log("🔍 YouTube service called with query:", query);

  // Step 1: Look in DB
  const cached = await prisma.youTubeQuery.findUnique({
    //It’s the same as writing: where: { query: query }
    where: { query },
    include: { videos: true },
  });

   console.log("📦 Cached entry found:", cached ? "YES" : "NO");

  if (cached) {
    console.log("   Cached updatedAt:", cached.updatedAt);
    console.log("   Cached videos length:", cached.videos.length);
  }

  if (cached && Date.now() - cached.updatedAt.getTime() < TWO_WEEKS_MS) {
    // return cached data
    console.log("Using cached YouTube data for query:", query);
    return cached.videos;
  }
   console.log("🌐 Fetching from YouTube API for:", query);
  // Step 2: Fetch from API
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
    query
  )}&type=video&maxResults=3&key=${API_KEY}`;

  const res = await fetch(url); // added this line
  console.log("YouTube API status:", res.status, res.statusText);
  // Try to parse the response for more info
  let jsObject;
  try {
    jsObject = await res.json();
    console.log("YouTube API response body:", JSON.stringify(jsObject, null, 2));
  } catch (err) {
    console.error("Failed to parse YouTube API response as JSON:", err);
  }



  if (!res.ok || !jsObject?.items || !Array.isArray(jsObject.items)) {
    console.warn("YouTube API error, returning fallback message");
    return [
      {
        youtubeId: "error",
        title: "Unable to fetch videos (quota exceeded or API error)",
        thumbnail: "",
        url: "#",
      },
    ];
  }
  const data: YouTubeSearchResponse = jsObject;
  const videos= data.items.map((item) => ({
    youtubeId: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  } as YouTubeVideo));

  // Step 3: Cache in DB
 const saved = await prisma.youTubeQuery.upsert({
  where: { query },
  update: {
     updatedAt: new Date(), // 👈 manually bump updatedAt
    videos: {
      deleteMany: {}, // clear old videos
      create: videos,
    },
  },
  create: {
    query,
    videos: { create: videos },
  },
  include: { videos: true }, // so you can log videos right away
});

console.log("💾 Saved/updated YouTubeQuery with id:", saved.id);
console.log("   Videos now count:", saved.videos?.length ?? 0);

return videos;
}
