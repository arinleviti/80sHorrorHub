import { prisma } from "@/app/services/prisma";

const ONE_MONTH_MS = 1000 * 60 * 60 * 24 * 30;

// ---------------------- 
// 📝 STRICT INTERFACES
// ----------------------
interface YouTubeSearchItem {
  id: { videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: { medium: { url: string } };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeSearchItem[];
}

interface YouTubeVideoDetails {
  id: string;
  statistics: {
    viewCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface YouTubeStatsResponse {
  items: YouTubeVideoDetails[];
}

export interface YouTubeVideo {
  youtubeId: string;
  title: string;
  description?: string;
  thumbnail: string;
  url: string;
  views?: number;
  duration?: number;
}

type VideoType = "trailer" | "scene" | "interview" | "behind" | "review" | "other";

// ----------------------
// 🧠 TYPE DETECTION
// ----------------------
function detectVideoType(title: string): VideoType {
  const t = title.toLowerCase();
  if (t.includes("trailer")) return "trailer";
  if (t.includes("behind") || t.includes("making") || t.includes("documentary")) return "behind";
  if (t.includes("interview") || t.includes("podcast")) return "interview";
  if (t.includes("scene") || t.includes("clip")) return "scene";
  if (t.includes("review") || t.includes("reaction")) return "review";

  return "other";
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = match?.[1] ? parseInt(match[1]) : 0;
  const minutes = match?.[2] ? parseInt(match[2]) : 0;
  const seconds = match?.[3] ? parseInt(match[3]) : 0;
  return hours * 3600 + minutes * 60 + seconds;
}

// ----------------------
// ⭐ SCORING (With Actor Fallback)
// ----------------------
function scoreVideo(video: YouTubeVideo, movieTitle: string, actorNames: string[] = []): number {
  const title = video.title.toLowerCase();
  const description = (video.description || "").toLowerCase();
  const movie = movieTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normalizedTitle = title.replace(/[^a-z0-9]/g, "");

  const topActors = actorNames.slice(0, 5);
  let score = 0;

  const hasMovieTitle = normalizedTitle.includes(movie);
  const hasActorInTitle = topActors.some(name => title.includes(name.toLowerCase()));
  const hasActorInDesc = topActors.some(name => description.includes(name.toLowerCase()));

  if (hasMovieTitle) {
    score += 7;
  } else if (hasActorInTitle || hasActorInDesc) {
    score += 3; // weaker than movie title
  } else {
    score -= 15;
  }

  //new: Short videos that don't match "interview" are likely junk, while longer interviews get a boost
  if (video.duration) {
    if (video.duration < 30) score -= 5; // shorts / junk
    if (video.duration > 600 && detectVideoType(video.title) === "interview") score += 2;
  }
  topActors.forEach(name => {
    if (title.includes(name.toLowerCase())) score += 3;
    if (description.includes(name.toLowerCase())) score += 1;
  });

  if (title.includes("official trailer")) score += 2;
  if (title.includes("scene") || title.includes("clip")) {
    score += 5;
    if (title.match(/\(\d+\/\d+\)/)) score -= 5;
  }
  if (title.includes("behind") || title.includes("making")) score += 6;
  if (title.includes("interview")) score += 4;

  if (video.views && video.views > 500000) score += 2;
  if (video.views && video.views < 1000) score -= 3;

  // ADD HERE
  if (video.views && video.views < 50000 && score > 10) {
    score += 2;
  }
  return score;
}

// ----------------------
// 🚀 MAIN FUNCTION
// ----------------------
export async function getYouTubeVideos(movieTitle: string, year: string, actorNames: string[] = []): Promise<YouTubeVideo[]> {
  const queryKey = `${movieTitle}-${year}`;

  const cached = await prisma.youTubeQuery.findUnique({
    where: { query: queryKey },
    include: { videos: true },
  });

  if (cached && (Date.now() - cached.updatedAt.getTime() < ONE_MONTH_MS)) {
    // ✅ CACHE LOG
    console.log(`\x1b[32m%s\x1b[0m`, `📦 CACHE HIT: Found ${cached.videos.length} videos in DB for "${queryKey}"`);
    return cached.videos;
  }
  // ❌ CACHE MISS LOG
  console.log(`\x1b[33m%s\x1b[0m`, `🔍 CACHE MISS: Fetching new videos from YouTube API for "${queryKey}"...`);
  try {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    const top2Actors = actorNames.slice(0, 2).join(" ");
    const q = `${movieTitle} ${year} ${top2Actors} (trailer OR scene OR "behind the scenes")`;

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=50&key=${API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData: YouTubeSearchResponse = await searchRes.json();

    const baseVideos: YouTubeVideo[] = (searchData.items || []).map(item => ({
      youtubeId: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    }));

    const ids = baseVideos.map(v => v.youtubeId).join(",");
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${ids}&key=${API_KEY}`;
    const statsRes = await fetch(statsUrl);
    const statsData: YouTubeStatsResponse = await statsRes.json();

    const statsMap = new Map<string, { views: number; duration: number }>(
      (statsData.items || []).map((i: YouTubeVideoDetails) => [
        i.id,
        {
          views: i.statistics?.viewCount ? parseInt(i.statistics.viewCount) : 0,
          duration: i.contentDetails?.duration ? parseDuration(i.contentDetails.duration) : 0,
        },
      ])
    );

    const enriched = baseVideos.map(v => ({
      ...v,
      ...statsMap.get(v.youtubeId),
    }));

    // ⚖️ SCORING LOG
    const scoredforLog = enriched.map(v => {
      const score = scoreVideo(v, movieTitle, actorNames);
      return {
        title: v.title.substring(0, 50), // Truncate for clean table
        score: score,
        type: detectVideoType(v.title)
      };
    });

    // Sort for the log table
    const sortedForLog = [...scoredforLog].sort((a, b) => b.score - a.score);

    console.log(`📊 SCORING RESULTS FOR: ${movieTitle}`);
    console.table(sortedForLog.slice(0, 15)); // Shows top 15 results and their scores in a nice table
    const scored = enriched.map(v => ({ video: v, score: scoreVideo(v, movieTitle, actorNames) }));
    const sorted = [...scored].sort((a, b) => b.score - a.score);

    const limits: Record<string, number> = { trailer: 1, scene: 4, interview: 2, behind: 2, other: 0 };
    const counts: Record<string, number> = {};
    const curated: YouTubeVideo[] = [];

    // Pass 1: Variety
    for (const { video, score } of sorted) {
  const type = detectVideoType(video.title);

  if (type === "other" && score < 12) continue;
    

      if ((counts[type] || 0) < limits[type]) {
        curated.push(video);
        counts[type] = (counts[type] || 0) + 1;
      }
      if (curated.length >= 9) break;
    }

   // Pass 2: Fill remaining to always get 9 videos
if (curated.length < 9) {
  for (const { video, score } of sorted) {
    if (curated.find(c => c.youtubeId === video.youtubeId)) continue;

    const type = detectVideoType(video.title);

    // Keep basic limits, but allow slightly lower-quality videos if needed
    if (type === "other" && score < 8) continue; // allow lower scores than Pass 1
    if (type === 'trailer' && (counts['trailer'] || 0) >= 2) continue;

    curated.push(video);
    counts[type] = (counts[type] || 0) + 1;

    if (curated.length >= 9) break;
  }
}

// Last resort: if still < 9, just fill with anything left
if (curated.length < 9) {
  for (const { video } of sorted) {
    if (!curated.find(c => c.youtubeId === video.youtubeId)) {
      curated.push(video);
      if (curated.length >= 9) break;
    }
  }
}

    const final = curated.sort(() => Math.random() - 0.5);

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
    console.log(`✅ SUCCESS: Curated 9 videos and saved to cache for "${queryKey}"`);
    return final;

  } catch (error) {
    console.error("🚨 YouTube API Fail:", error);
    return cached ? (cached.videos as YouTubeVideo[]) : [];
  }
}