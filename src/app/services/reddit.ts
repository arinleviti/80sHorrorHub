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
  crew?: { name: string; job: string }[];
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
const SEASONAL_CONTEXT = /\bfor halloween\b|\bon halloween\b|\bhappy halloween\b|\bhome for halloween\b/i;
const NEWS_WORDS = /\bordered at\b|\bwill premiere\b|\bwants to reboot\b|\bsues\s\w/i;
const PROXY_TIMEOUT_MS = 500;
const SUBREDDIT_TIMEOUT_MS = 1000;
const GLOBAL_TIMEOUT_MS = 1500;
const CACHE_TTL_12H = 60 * 60 * 12;

// ─── Scoring ──────────────────────────────────────────────────────────────────

const fuzzy = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

const headlineOf = (title: string): string =>
  title.split(/\bPlot:/i)[0].trim().slice(0, 120);

const scorePost = (post: RedditPost, movie: MovieForReddit): number => {
  const headline = headlineOf(post.title);
  const titleLower = headline.toLowerCase();
  const movieYear = movie.releaseDate?.slice(0, 4);

  if (JUNK_WORDS.test(titleLower)) return -100;
  if (post.upvotes < 2) return -100;
  if (SEASONAL_CONTEXT.test(titleLower)) return -100;
  if (NEWS_WORDS.test(post.title)) return -100;

  const fuzzyMovie = fuzzy(movie.title);
  const fuzzyPost = fuzzy(headline);
  if (!fuzzyPost.includes(fuzzyMovie)) return -100;

  // Require at least one cast member or character mention
  const topActors = movie.castMembers?.slice(0, 5).map((c) => c.actor.name.toLowerCase()) ?? [];
  const topChars = movie.castMembers?.slice(0, 5).map((c) => c.character.toLowerCase()) ?? [];
  const hasActorMention = topActors.some((a) => titleLower.includes(a));
  const hasCharMention = topChars.some((c) => titleLower.includes(c));
  const crewNames = movie.crew?.map((c) => c.name.toLowerCase()) ?? [];
  const hasCrewMention = crewNames.some((n) => titleLower.includes(n));

  let score = 0;

  const escaped = movie.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundaryMatch = new RegExp(`\\b${escaped}\\b`, "i").test(headline);
  score += boundaryMatch ? 3 : 1;

  const afterTitle = headline.replace(new RegExp(escaped, "i"), "").trim();
  if (/^[A-Z][a-z]/.test(afterTitle)) score -= 3;
  if (/^(II|III|IV|V|VI|2|3|4|5|6)\b/i.test(afterTitle)) return -100;

  const yearInPost = titleLower.match(/\((\d{4})\)/);
  if (yearInPost && movieYear && yearInPost[1] !== movieYear) return -100;
  if (movieYear && titleLower.includes(movieYear)) score += 3;

  if (hasActorMention) score += 2;
  if (hasCharMention) score += 2;
  if (hasCrewMention) score += 2;

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

const PROXY_CHAIN = [
  (url: string) => `https://orange-truth-50d2.arin-leviti.workers.dev/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://api.cors.lol/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.org/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
  (url: string) => `https://yacdn.org/serve/${url}`,
];

const fetchViaProxy = async (proxyUrl: string): Promise<RedditSearchResponse | null> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const res = await fetch(proxyUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const text = await res.text();
    if (!text.startsWith("{")) return null;
    return JSON.parse(text) as RedditSearchResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const fetchWithFallback = async (redditUrl: string, key: string): Promise<RedditChild[]> => {
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

const fetchSubreddit = async (subreddit: string, movie: MovieForReddit): Promise<RedditChild[]> => {
  const url =
    `https://www.reddit.com/r/${subreddit}/search.json?` +
    new URLSearchParams({ q: movie.title, restrict_sr: "1", sort: "relevance", limit: "15" });

  const timeout = new Promise<RedditChild[]>((resolve) =>
    setTimeout(() => {
      console.warn(`[Reddit] r/${subreddit} timed out after ${SUBREDDIT_TIMEOUT_MS}ms`);
      resolve([]);
    }, SUBREDDIT_TIMEOUT_MS)
  );

  return Promise.race([
    fetchWithFallback(url, `${subreddit}:${movie.title}`),
    timeout,
  ]);
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function fetchRedditPosts(
  movie: MovieForReddit,
  limit = 5
): Promise<RedditPost[]> {
  const globalTimeout = new Promise<RedditPost[]>((resolve) =>
    setTimeout(() => {
      console.warn(`[Reddit] global timeout (${GLOBAL_TIMEOUT_MS}ms) reached for "${movie.title}"`);
      resolve([]);
    }, GLOBAL_TIMEOUT_MS)
  );

  return Promise.race([_fetchRedditPosts(movie, limit), globalTimeout]);
}

async function _fetchRedditPosts(
  movie: MovieForReddit,
  limit = 5
): Promise<RedditPost[]> {
  console.log("[Reddit] START", { title: movie.title, subreddits: SUBREDDITS });

  try {
    const results = await Promise.allSettled(
      SUBREDDITS.map((subreddit) => fetchSubreddit(subreddit, movie))
    );

    const allChildren: RedditChild[] = results.flatMap((r, i) => {
      if (r.status === "rejected") {
        console.error(`[Reddit] r/${SUBREDDITS[i]} rejected:`, r.reason);
        return [];
      }
      if (r.value.length === 0) {
        console.warn(`[Reddit] r/${SUBREDDITS[i]} → 0 results for "${movie.title}"`);
      } else {
        console.log(`[Reddit] r/${SUBREDDITS[i]} → ${r.value.length} results`);
      }
      return r.value;
    });

    if (allChildren.length === 0) {
      console.warn(`[Reddit] all subreddits empty for "${movie.title}"`);
      return [];
    }

    const scored = allChildren
      .map((child) => {
        const post: RedditPost = {
          id: child.data.id,
          title: child.data.title,
          author: child.data.author,
          subreddit: child.data.subreddit,
          upvotes: child.data.ups || 0,
          url: `https://reddit.com${child.data.permalink}`,
        };
        return { post, score: scorePost(post, movie) };
      })
      .filter(({ score }) => score >= 3);

    if (scored.length === 0) {
      console.warn(`[Reddit] scoring filtered all ${allChildren.length} posts for "${movie.title}"`);
      return [];
    }

    const unique = Array.from(new Map(scored.map((s) => [s.post.id, s])).values());
    unique.sort((a, b) => b.score - a.score || b.post.upvotes - a.post.upvotes);

    const returned = unique.slice(0, limit).map((u) => u.post);
    console.log("[Reddit] DONE", { raw: allChildren.length, scored: scored.length, returned: returned.length, top: returned[0]?.title ?? "none" });

    return returned;
  } catch (err) {
    console.error("[Reddit] unhandled failure:", err instanceof Error ? err.stack : err);
    return [];
  }
}