import { prisma } from "@/app/services/prisma";

// We changed this to 30 days (1 month) to maximize your quota efficiency
const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30;

// ---------------------- 
// 📝 INTERFACES
// ----------------------
interface YouTubeSearchResponse {
  items: {
    id: { videoId: string };
    snippet: {
      title: string;
      thumbnails: { medium: { url: string } };
    };
  }[];
}

interface YouTubeStatsResponse {
  items: {
    id: string;
    statistics: {
      viewCount: string;
      likeCount?: string;
    };
    contentDetails: {
      duration: string;
    };
  }[];
}

export interface YouTubeVideo {
  youtubeId: string;
  title: string;
  thumbnail: string;
  url: string;
  views?: number;
  duration?: number; // seconds
}

// ---------------------- 
// 🔍 QUERY BUILDER (Optimized for Quota: 100 units total)
// ----------------------
function buildYoutubeQuery(movieTitle: string, year: string): string {
  return `${movieTitle} ${year} (trailer OR scene OR "behind the scenes" OR interview OR "making of" OR documentary)`;
}

// ----------------------
// 🧠 TYPE DETECTION
// ----------------------
type VideoType =
  | "trailer"
  | "scene"
  | "interview"
  | "behind"
  | "review"
  | "other";

function detectVideoType(title: string): VideoType {
  title = title.toLowerCase();

  if (title.includes("trailer")) return "trailer";
  if (title.includes("scene") || title.includes("clip")) return "scene";
  if (title.includes("interview")) return "interview";
  if (title.includes("behind") || title.includes("making")) return "behind";
  if (title.includes("review")) return "review";

  return "other";
}

// ----------------------
// ⏱️ ISO8601 → seconds
// ----------------------
function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+M)?(\d+S)?/);
  const minutes = match?.[1] ? parseInt(match[1]) : 0;
  const seconds = match?.[2] ? parseInt(match[2]) : 0;
  return minutes * 60 + seconds;
}

// ----------------------
// ⭐ SCORING (Keeping all your specific logic)
// ----------------------
function scoreVideo(video: YouTubeVideo): number {
  const title = video.title.toLowerCase();
  let score = 0;

  if (title.includes("official trailer")) score += 5;
  if (title.includes("trailer")) score += 3;
  if (title.includes("scene")) score += 3;

  if (title.includes("behind")) score += 4;
  if (title.includes("interview")) score += 3;
  if (title.includes("making")) score += 4;
  if (title.includes("documentary")) score += 4;

  if (title.includes("kills") || title.includes("death")) score += 2;

  if (
    title.includes("rare") ||
    title.includes("promo") ||
    title.includes("vintage") ||
    title.includes("signed") ||
    title.includes("screener")
  ) {
    score += 3;
  }

  if (title.includes("reaction")) score -= 3;
  if (title.includes("fan film")) score -= 4;
  if (title.includes("recap") || title.includes("explained")) score -= 2;

  if (video.views) {
    if (video.views > 1_000_000) score += 2;
    else if (video.views > 100_000) score += 1;
    else if (video.views < 5_000) score -= 2;
  }

  if (video.duration) {
    if (video.duration < 60) score -= 2;
    if (video.duration > 1800) score -= 2;
  }

  return score;
}

// ----------------------
// 🧹 DEDUPE & SHUFFLE
// ----------------------
function dedupeVideos(videos: YouTubeVideo[]): YouTubeVideo[] {
  return Array.from(new Map(videos.map(v => [v.youtubeId, v])).values());
}

function shuffle<T>(arr: T[]): T[] {
  return arr.sort(() => Math.random() - 0.5);
}

// ----------------------
// 🚀 MAIN FUNCTION
// ----------------------
export async function getYouTubeVideos(movieTitle: string, year: string) {
  const queryKey = `${movieTitle}-${year}`;

  // 1️⃣ Cache check (Check if we have any data at all)
  const cached = await prisma.youTubeQuery.findUnique({
    where: { query: queryKey },
    include: { videos: true },
  });

  const isFresh = cached && (Date.now() - cached.updatedAt.getTime() < ONE_MONTH_MS);

  if (isFresh) {
    console.log("📦 Using fresh cached YouTube data");
    return cached.videos;
  }

  // 2️⃣ API FETCH BLOCK (Inside try-catch for graceful fallback)
  try {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    console.log("🎬 YouTube API Key:", API_KEY ? "FOUND" : "MISSING");

    const q = buildYoutubeQuery(movieTitle, year);
    console.log("🔍 Running Optimized Master Query:", q);

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=50&key=${API_KEY}`;
    const searchRes = await fetch(searchUrl);
    
    console.log(`🔍 YouTube Search Response:`, searchRes.status);

    if (!searchRes.ok) {
        const errData = await searchRes.json();
        throw new Error(`YouTube API Error: ${searchRes.status} - ${JSON.stringify(errData)}`);
    }

    const data: YouTubeSearchResponse = await searchRes.json();
    const searchItems = data.items || [];
    console.log(`📦 Total videos fetched: ${searchItems.length}`);

    const baseVideos: YouTubeVideo[] = searchItems.map(item => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    const unique = dedupeVideos(baseVideos);
    console.log(`🎯 Unique videos after dedupe: ${unique.length}`);

    if (unique.length === 0) return cached?.videos || [];

    // 3️⃣ FETCH STATS (batch)
    const ids = unique.map(v => v.youtubeId).join(",");
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids}&key=${API_KEY}`;
    
    const statsRes = await fetch(statsUrl);
    const statsData: YouTubeStatsResponse = await statsRes.json();

    const statsMap = new Map(
      (statsData.items || []).map(i => [
        i.id,
        {
          views: i.statistics?.viewCount ? parseInt(i.statistics.viewCount) : undefined,
          duration: i.contentDetails?.duration ? parseDuration(i.contentDetails.duration) : undefined,
        },
      ])
    );

    const enriched = unique.map(v => ({
      ...v,
      ...statsMap.get(v.youtubeId),
    }));

    // 4️⃣ SCORE + DIVERSITY
    const scored = enriched.map(v => ({ video: v, score: scoreVideo(v) }));

    const limits = { trailer: 2, scene: 3, interview: 1, behind: 1, review: 1, other: 1 };
    const counts: Record<string, number> = {};
    const curated: YouTubeVideo[] = [];

    for (const { video, score } of scored.sort((a, b) => b.score - a.score)) {
      if (score <= 0) continue;
      const type = detectVideoType(video.title);
      if ((counts[type] || 0) < (limits[type] || 1)) {
        curated.push(video);
        counts[type] = (counts[type] || 0) + 1;
      }
      if (curated.length >= 9) break;
    }

    const final = shuffle(curated);
    console.log("🎯 Final curated videos:", final.map(v => v.title));

    // 5️⃣ UPDATE CACHE
    await prisma.youTubeQuery.upsert({
      where: { query: queryKey },
      update: {
        updatedAt: new Date(),
        videos: {
          deleteMany: {},
          create: final.map(v => ({
            youtubeId: v.youtubeId,
            title: v.title,
            thumbnail: v.thumbnail,
            url: v.url,
          })),
        },
      },
      create: {
        query: queryKey,
        videos: {
          create: final.map(v => ({
            youtubeId: v.youtubeId,
            title: v.title,
            thumbnail: v.thumbnail,
            url: v.url,
          })),
        },
      },
    });

    return final;

  } catch (error) {
    // 6️⃣ THE FAIL-SAFE FALLBACK
    console.error("🚨 YouTube API Process Failed. Falling back to cache:", error);
    
    // If API fails (like a 403 Forbidden), return stale data if it exists
    if (cached) {
      console.log("🩹 API Failed but found stale cache data. Serving...");
      return cached.videos;
    }

    // If no cache and no API, return empty
    return [];
  }
}