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

const SUBREDDITS = ["horror", "80shorror", "movies"];
const JUNK_WORDS = /meme|shitpost|gif|funny|bot|disney/i;
const CACHE_TTL = 60 * 60; // 1 hour
const USER_AGENT = "HeroLaCasadelBurger/1.0";

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

// ─── Fetch ────────────────────────────────────────────────────────────────────

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
      const url = `https://www.reddit.com/r/${subreddit}/search.json?${new URLSearchParams(
        {
          q: movie.title,
          restrict_sr: "1",
          sort: "relevance",
          limit: "15",
        }
      )}`;

      console.log(`[Reddit] querying r/${subreddit} -> ${url}`);

      try {
        const res = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          next: { revalidate: CACHE_TTL },
        });

        // Rate limited
        if (res.status === 429) {
          const retryAfter = res.headers.get("Retry-After");
          console.error(
            `[Reddit] RATE LIMITED on r/${subreddit}. Retry-After: ${retryAfter ?? "unknown"}s`
          );
          return [] as RedditChild[];
        }

        // Auth/forbidden
        if (res.status === 403) {
          console.error(
            `[Reddit] FORBIDDEN (403) on r/${subreddit} — Reddit may be blocking the request. Check User-Agent.`
          );
          return [] as RedditChild[];
        }

        // Subreddit doesn't exist or is banned
        if (res.status === 404) {
          console.error(`[Reddit] NOT FOUND (404) — r/${subreddit} may not exist or is banned.`);
          return [] as RedditChild[];
        }

        if (!res.ok) {
          console.error(
            `[Reddit] Unexpected HTTP ${res.status} ${res.statusText} for r/${subreddit}`
          );
          return [] as RedditChild[];
        }

        let json: RedditSearchResponse;
        try {
          json = await res.json();
        } catch (parseErr) {
          console.error(
            `[Reddit] Failed to parse JSON from r/${subreddit}:`,
            parseErr instanceof Error ? parseErr.message : parseErr
          );
          return [] as RedditChild[];
        }

        // Unexpected response shape
        if (!json?.data?.children) {
          console.error(
            `[Reddit] Unexpected response shape from r/${subreddit}:`,
            JSON.stringify(json).slice(0, 200)
          );
          return [] as RedditChild[];
        }

        const children = json.data.children;

        if (children.length === 0) {
          console.warn(`[Reddit] r/${subreddit} returned 0 results for "${movie.title}"`);
        } else {
          console.log(`[Reddit] SUCCESS r/${subreddit} -> ${children.length} results`);
        }

        return children;
      } catch (err) {
        // Network-level failure (DNS, timeout, etc.)
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Reddit] Network failure for r/${subreddit}: ${msg}`);
        return [] as RedditChild[];
      }
    });

    const results = await Promise.allSettled(requests);

    // Log any unexpected promise rejections (shouldn't happen but just in case)
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
        `Top titles: ${allPosts.slice(0, 3).map(p => `"${p.title}"`).join(", ")}`
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
      duplicatesRemoved: filtered.length - unique.length,
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