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

// ─── Internal types ───────────────────────────────────────────────────────────

interface RedditChild {
  data: {
    id: string;
    title: string;
    author: string;
    subreddit: string;
    ups: number;
    permalink: string;
  };
}

interface RedditSearchResponse {
  data: {
    children: RedditChild[];
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SUBREDDITS = ["horror", "80sHorrorMovies", "horrorcollecting", "PhysicalMediaMatters"];
const JUNK_WORDS = /meme|shitpost|gif|funny|bot|disney/i;
const CACHE_TTL_1H = 60 * 60; // 1 hour
const CACHE_TTL_12H = 60 * 60 * 12; // 12 hours



// ─── Scoring ──────────────────────────────────────────────────────────────────

const fuzzy = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

const scorePost = (post: RedditPost, movie: MovieForReddit): number => {
  const titleLower = post.title.toLowerCase();
  const movieYear = movie.releaseDate?.slice(0, 4);

  if (JUNK_WORDS.test(titleLower)) return -100;
  if (post.upvotes < 2) return -100;

  let score = 0;

  if (fuzzy(post.title).includes(fuzzy(movie.title))) score += 3;
  if (movieYear && titleLower.includes(movieYear)) score += 2;

  if (movie.castMembers) {
    const topActors = movie.castMembers
      .slice(0, 5)
      .map((c) => c.actor.name.toLowerCase());
    if (topActors.some((a) => titleLower.includes(a))) score += 2;

    const topChars = movie.castMembers
      .slice(0, 5)
      .map((c) => c.character.toLowerCase());
    if (topChars.some((c) => titleLower.includes(c))) score += 2;
  }

  return score;
};



// ─── Cache ────────────────────────────────────────────────────────────────────

type CacheEntry = { data: RedditSearchResponse; expires: number };
const cache = new Map<string, CacheEntry>();

const getCache = (key: string): RedditSearchResponse | null => {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) { cache.delete(key); return null; }
  return hit.data;
};

const setCache = (key: string, data: RedditSearchResponse) => {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_12H * 1000 });
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const fetchViaProxy = async (proxyUrl: string): Promise<RedditSearchResponse | null> => {
  try {
    const res = await fetch(proxyUrl);
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.startsWith("{")) return null;
    return JSON.parse(text) as RedditSearchResponse;
  } catch {
    return null;
  }
};

// Proxy chain — tried in order until one succeeds.
// All wrap the raw Reddit URL so each proxy hits Reddit independently.
const PROXY_CHAIN = [
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.org/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
  (url: string) => `https://yacdn.org/serve/${url}`,
];

const fetchWithFallback = async (
  redditUrl: string,
  key: string
): Promise<RedditChild[]> => {
  const cached = getCache(key);
  if (cached) return cached.data.children;

  for (const buildProxy of PROXY_CHAIN) {
    const proxyUrl = buildProxy(redditUrl);
    const json = await fetchViaProxy(proxyUrl);
    if (json) {
      setCache(key, json);
      return json.data.children;
    }
    console.warn("[Reddit] proxy failed:", proxyUrl.split("?")[0]);
  }

  console.error("[Reddit] all proxies failed for:", redditUrl);
  return [];
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function fetchRedditPosts(
  movie: MovieForReddit,
  limit = 5
): Promise<RedditPost[]> {
  console.log("[Reddit] fetchRedditPosts START", {
    title: movie.title,
    limit,
    subreddits: SUBREDDITS,
  });

  try {
    const requests = SUBREDDITS.map(async (subreddit) => {
      const url =
        `https://www.reddit.com/r/${subreddit}/search.json?` +
        new URLSearchParams({ q: movie.title, restrict_sr: "1", sort: "relevance", limit: "15" });

      console.log(`[Reddit] querying r/${subreddit}`);

      const cacheKey = `${subreddit}:${movie.title}`;
      const children = await fetchWithFallback(url, cacheKey);

      if (children.length === 0) {
        console.warn(`[Reddit] r/${subreddit} returned 0 results for "${movie.title}"`);
      } else {
        console.log(`[Reddit] SUCCESS r/${subreddit} -> ${children.length} results`);
      }

      return children;
    });

    const results = await Promise.allSettled(requests);

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[Reddit] Promise rejected for r/${SUBREDDITS[i]}:`, r.reason);
      }
    });

    const allChildren: RedditChild[] = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    if (allChildren.length === 0) {
      console.warn(`[Reddit] All subreddits returned empty. Movie: "${movie.title}"`);
      return [];
    }

    const allPosts: RedditPost[] = allChildren.map((child) => ({
      id: child.data.id,
      title: child.data.title,
      author: child.data.author,
      subreddit: child.data.subreddit,
      upvotes: child.data.ups || 0,
      url: `https://reddit.com${child.data.permalink}`,
    }));

    const withScores = allPosts.map((post) => ({
      post,
      score: scorePost(post, movie),
    }));

    const filtered = withScores.filter(({ score }) => score > 0);

    if (filtered.length === 0) {
      console.warn(
        `[Reddit] Scoring filtered out all ${allPosts.length} posts for "${movie.title}". ` +
        `Top titles: ${allPosts.slice(0, 3).map((p) => `"${p.title}"`).join(", ")}`
      );
      return [];
    }

    const unique = Array.from(
      new Map(filtered.map((s) => [s.post.id, s])).values()
    );

    unique.sort((a, b) => b.score - a.score || b.post.upvotes - a.post.upvotes);

    const returned = unique.slice(0, limit).map((u) => u.post);

    console.log("[Reddit] FINAL", {
      raw: allChildren.length,
      posts: allPosts.length,
      scored: filtered.length,
      returned: returned.length,
      topPost: returned[0]?.title ?? "none",
    });

    return returned;
  } catch (err) {
    console.error(
      "[Reddit] Unhandled global failure:",
      err instanceof Error ? err.stack : err
    );
    return [];
  }
}