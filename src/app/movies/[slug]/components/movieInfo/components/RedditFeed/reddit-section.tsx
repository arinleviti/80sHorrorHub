import axios from "axios";
import { parseStringPromise } from "xml2js";
import RedditFeed from "./redditFeed";

/* =========================================================
   🔴 TYPES
   ========================================================= */

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  upvotes: number;
  url: string;
}

export interface MovieForReddit {
  title: string;
  releaseDate?: string | null;
  castMembers?: { actor: { name: string }; character: string }[];
}

/* =========================================================
   🔵 REDDIT API TYPES (PRESERVED)
   ========================================================= */

interface RedditApiChild {
  data: {
    id: string;
    title: string;
    author: string;
    subreddit: string;
    ups: number;
    permalink: string;
  };
}

/* =========================================================
   🟣 RSS TYPES (STRICT, NO ANY)
   ========================================================= */

interface RSSLink {
  $: {
    href: string;
  };
}

interface RSSAuthor {
  name: string[];
}

interface RSSEntry {
  id?: string[];
  title: string[];
  author?: RSSAuthor[];
  link: RSSLink[];
}

interface RSSFeed {
  feed: {
    entry?: RSSEntry[];
  };
}

/* =========================================================
   ⚙️ CONFIG
   ========================================================= */

const allowedSubreddits = ["horror", "80shorror", "movies"];

/* =========================================================
   🔁 MODE SWITCH
   ========================================================= */

const USE_RSS = true;

/* =========================================================
   🆕🆕🆕 CACHE LAYER (NEW - ADDED, NON-DESTRUCTIVE)
   ========================================================= */

const cache = new Map<
  string,
  { data: RedditPost[]; ts: number }
>();

const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/* =========================================================
   🧠 UI COMPONENT (UNCHANGED)
   ========================================================= */

export default async function RedditSection({
  movie,
}: {
  movie: MovieForReddit;
}) {
  try {
    const posts = await fetchRedditPosts(movie, 5);

    if (!posts.length) return null;

    return <RedditFeed posts={posts} />;
  } catch (err) {
    console.warn("[RedditSection] disabled safely:", err);
    return null;
  }
}

/* =========================================================
   🧪 TYPE GUARDS (REPLACES ANY)
   ========================================================= */

function isRSSFeed(data: unknown): data is RSSFeed {
  return (
    typeof data === "object" &&
    data !== null &&
    "feed" in data
  );
}

function isRSSEntryArray(entries: unknown): entries is RSSEntry[] {
  return Array.isArray(entries);
}

/* =========================================================
   🚀 FETCH LOGIC (RSS ACTIVE, API PRESERVED)
   ========================================================= */

async function fetchRedditPosts(
  movie: MovieForReddit,
  limit: number
): Promise<RedditPost[]> {
  const requests = allowedSubreddits.map(async subreddit => {

    /* =====================================================
       🆕🆕🆕 CACHE CHECK (ADDED - BEFORE FETCH)
       ===================================================== */

    const cacheKey = `${movie.title}-${subreddit}`;

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return cached.data;
    }

    /* ================================
       🟢 RSS MODE (ACTIVE)
       ================================ */
    if (USE_RSS) {
      const url = `https://www.reddit.com/r/${subreddit}.rss`;

      try {
        const res = await axios.get<string>(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (HorrorHubRSS/1.0)",
          },
          timeout: 9000,
        });

        const parsedUnknown: unknown = await parseStringPromise(res.data);

        if (!isRSSFeed(parsedUnknown)) return [];

        const entriesUnknown = parsedUnknown.feed.entry;

        if (!entriesUnknown || !isRSSEntryArray(entriesUnknown)) {
          return [];
        }

        const posts: RedditPost[] = entriesUnknown.map((entry: RSSEntry) => {
          const post: RedditPost = {
            id: entry.id?.[0] ?? entry.title[0],
            title: entry.title[0],
            author: entry.author?.[0]?.name?.[0] ?? "unknown",
            subreddit,
            upvotes: 0,
            url: entry.link[0].$.href,
          };

          return post;
        });

        /* =====================================================
           🆕🆕🆕 CACHE STORE (ADDED - AFTER FETCH)
           ===================================================== */

        cache.set(cacheKey, {
          data: posts,
          ts: Date.now(),
        });

        return posts;
      } catch (err) {
        console.warn(`[RSS] failed r/${subreddit}`, err);
        return [];
      }
    }

    /* ================================
       🔵 API MODE (COMMENTED OUT - PRESERVED)
       ================================ */

    /*
    const url = `https://www.reddit.com/r/${subreddit}/search.json`;

    try {
      const res = await axios.get(url, {
        params: {
          q: movie.title,
          restrict_sr: 1,
          sort: "relevance",
          limit: 10,
        },
        timeout: 9000,
      });

      return res.data?.data?.children ?? [];
    } catch (err) {
      console.warn(`[API] failed r/${subreddit}`, err);
      return [];
    }
    */

    return [];
  });

  /* =========================================================
     🧩 MERGE RESULTS
     ========================================================= */

  const results = await Promise.all(requests);

  const posts: RedditPost[] = results
    .flat()
    .map((item: RedditPost) => item);

  return posts.slice(0, limit);
}