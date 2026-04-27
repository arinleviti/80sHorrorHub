import axios from "axios";
import { parseStringPromise } from "xml2js";

/* =========================================================
   🔴 CORE TYPES
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
   🟡 RSS TYPES (STRICT - NO ANY)
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
   🔴 API TYPES (KEPT FOR FUTURE USE)
   ========================================================= */

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

/* =========================================================
   🟡 CONFIG
   ========================================================= */

const allowedSubreddits = ["horror", "80shorror", "movies"];
const junkWords = /meme|shitpost|gif|funny|bot|disney/i;

const fuzzy = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

/* =========================================================
   🧠 SCORING (UNCHANGED)
   ========================================================= */

const scorePost = (post: RedditPost, movie: MovieForReddit): number => {
  let score = 0;
  const titleLower = post.title.toLowerCase();
  const movieYear = movie.releaseDate?.slice(0, 4);

  if (junkWords.test(titleLower)) return -100;

  if (fuzzy(post.title).includes(fuzzy(movie.title))) score += 3;

  if (movieYear && titleLower.includes(movieYear)) score += 2;

  if (movie.castMembers) {
    const topActors = movie.castMembers
      .slice(0, 5)
      .map(c => c.actor.name.toLowerCase());

    if (topActors.some(a => titleLower.includes(a))) score += 2;

    const topChars = movie.castMembers
      .slice(0, 5)
      .map(c => c.character.toLowerCase());

    if (topChars.some(c => titleLower.includes(c))) score += 2;
  }

  if (post.upvotes < 2) return -100;

  return score;
};

/* =========================================================
   🟣 RSS FETCH (TYPE-SAFE)
   ========================================================= */

const fetchSubredditRSS = async (subreddit: string): Promise<RedditPost[]> => {
  const url = `https://www.reddit.com/r/${subreddit}.rss`;

  const res = await axios.get<string>(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (HorrorHubRSS/1.0)",
    },
    timeout: 9000,
  });

  const parsed = await parseStringPromise(res.data) as RSSFeed;

  const entries = parsed.feed.entry ?? [];

  return entries.map((entry: RSSEntry): RedditPost => {
    const title = entry.title[0];

    const author =
      entry.author?.[0]?.name?.[0] ?? "unknown";

    const id =
      entry.id?.[0] ?? title;

    const url =
      entry.link[0].$.href;

    return {
      id,
      title,
      author,
      subreddit,
      upvotes: 0,
      url,
    };
  });
};

/* =========================================================
   🔵 API MODE (COMMENTED OUT - NO ANY)
   ========================================================= */

/*
const fetchSubredditAPI = async (
  subreddit: string,
  movieTitle: string
): Promise<RedditChild[]> => {
  const url = `https://www.reddit.com/r/${subreddit}/search.json`;

  const res = await axios.get<RedditSearchResponse>(url, {
    params: {
      q: movieTitle,
      restrict_sr: 1,
      sort: "relevance",
      limit: 15,
    },
    timeout: 9000,
  });

  return res.data.data.children;
};
*/

/* =========================================================
   🚀 MAIN FUNCTION (RSS ACTIVE)
   ========================================================= */

export const fetchRedditPosts = async (
  movie: MovieForReddit,
  limit = 5
): Promise<RedditPost[]> => {
  console.log("[Reddit RSS] START", {
    title: movie.title,
    subreddits: allowedSubreddits,
  });

  try {
    const requests = allowedSubreddits.map(sub =>
      fetchSubredditRSS(sub)
    );

    const results = await Promise.allSettled(requests);

    const allPosts: RedditPost[] = results
      .flatMap(r => (r.status === "fulfilled" ? r.value : []));

    const scored = allPosts
      .map(post => ({
        post,
        score: scorePost(post, movie),
      }))
      .filter(({ score }) => score > 0);

    const unique = Array.from(
      new Map(scored.map(s => [s.post.id, s])).values()
    );

    unique.sort(
      (a, b) =>
        b.score - a.score || b.post.upvotes - a.post.upvotes
    );

    console.log("[Reddit RSS] FINAL", {
      raw: allPosts.length,
      scored: scored.length,
      returned: Math.min(limit, scored.length),
    });

    return unique.slice(0, limit).map(u => u.post);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.warn("[Reddit RSS] ERROR:", err.message);
    } else {
      console.warn("[Reddit RSS] UNKNOWN ERROR");
    }

    return [];
  }
};