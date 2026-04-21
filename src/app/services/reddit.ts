import axios from "axios";

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

// --- NEW INTERNAL TYPES TO REMOVE 'ANY' ---
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

const allowedSubreddits = ["horror", "80shorror", "movies"];
const junkWords = /meme|shitpost|gif|funny|bot|disney/i;

const fuzzy = (str: string): string => str.toLowerCase().replace(/[^a-z0-9]/g, "");

const scorePost = (post: RedditPost, movie: MovieForReddit): number => {
  let score = 0;
  const titleLower = post.title.toLowerCase();
  const movieYear = movie.releaseDate?.slice(0, 4);

  if (junkWords.test(titleLower)) return -100;

  if (fuzzy(post.title).includes(fuzzy(movie.title))) score += 3;

  if (movieYear && titleLower.includes(movieYear)) score += 2;

  if (movie.castMembers) {
    const topActors = movie.castMembers.slice(0, 5).map(c => c.actor.name.toLowerCase());
    if (topActors.some(a => titleLower.includes(a))) score += 2;

    const topChars = movie.castMembers.slice(0, 5).map(c => c.character.toLowerCase());
    if (topChars.some(c => titleLower.includes(c))) score += 2;
  }

  if (post.upvotes < 2) return -100;

  return score;
};
// --- END OF NEW INTERNAL TYPES ---
export const fetchRedditPosts = async (
  movie: MovieForReddit,
  limit = 5
): Promise<RedditPost[]> => {
  console.log("[Reddit] fetchRedditPosts START", {
    title: movie.title,
    limit,
    subreddits: allowedSubreddits,
  });
  try {
    const requests = allowedSubreddits.map(async (subreddit) => {
      // 🔥 2. BEFORE REQUEST
      console.log(`[Reddit] querying r/${subreddit}`);
      const url = `https://www.reddit.com/r/${subreddit}/search.json`;

      try {
        const res = await axios.get<RedditSearchResponse>(url, {
          params: {
            q: movie.title,
            restrict_sr: 1,
            sort: "relevance",
            limit: 15,
          },
          timeout: 9000,
        });
        // 🔥 3. AFTER SUCCESS RESPONSE
        console.log(
          `[Reddit] SUCCESS r/${subreddit} ->`,
          res.data?.data?.children?.length ?? 0
        );
        return res.data?.data?.children ?? [];
      } catch (err) {
        // 🔥 4. ERROR PER SUBREDDIT
        console.warn(
          `[Reddit] FAILED r/${subreddit}`,
          err instanceof Error ? err.message : err
        );
        if (axios.isAxiosError(err)) {
          console.warn(`[Reddit] Failed for r/${subreddit}: ${err.message}`);
        }
        return [];
      }
    });

    const results = await Promise.allSettled(requests);

    const allChildren: RedditChild[] = results
      .flatMap(r => (r.status === "fulfilled" ? r.value : []))
      .flat();

    const allPosts: RedditPost[] = allChildren.map((child) => ({
      id: child.data.id,
      title: child.data.title,
      author: child.data.author,
      subreddit: child.data.subreddit,
      upvotes: child.data.ups || 0,
      url: `https://reddit.com${child.data.permalink}`,
    }));

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
    console.log("[Reddit] FINAL", {
      raw: allChildren.length,
      posts: allPosts.length,
      scored: scored.length,
      returned: Math.min(limit, scored.length),
    });
    return unique.slice(0, limit).map(u => u.post);
  } catch (err) {
    console.warn("[Reddit] Global fetch failure:", err);
    return [];
  }
};