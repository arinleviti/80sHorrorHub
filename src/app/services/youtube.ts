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
  id: string;
  title: string;
  thumbnail: string;
  url: string;
}
export async function getYouTubeVideos(query: string) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
    query
  )}&type=video&maxResults=3&key=${API_KEY}`;
 const res = await fetch(url); // added this line
  console.log("YouTube API status:", res.status, res.statusText);
  // Try to parse the response for more info
  let json;
  try {
    json = await res.json();
    console.log("YouTube API response body:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Failed to parse YouTube API response as JSON:", err);
  }
  

 
 if (!res.ok || !json?.items || !Array.isArray(json.items)) {
      console.warn("YouTube API error, returning fallback message");
      return [
        {
          id: "error",
          title: "Unable to fetch videos (quota exceeded or API error)",
          thumbnail: "",
          url: "#",
        },
      ];
    }
const data: YouTubeSearchResponse = json;
  return data.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  } as YouTubeVideo));
}
