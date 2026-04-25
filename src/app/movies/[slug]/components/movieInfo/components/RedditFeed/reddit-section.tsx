import RedditFeed from "./redditFeed";
import { MovieForReddit } from "./redditFeed";
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
/**
 * SAFE wrapper:
 * - never blocks page
 * - never throws
 * - silently disables Reddit if broken
 */
export default async function RedditSection({
  movie,
}: {
  movie: MovieForReddit;
}) {
  try {
    const posts = await fetchRedditPosts(movie, 5);

    if (!posts?.length) return null;

    return <RedditFeed posts={posts} />;
  } catch (err) {
    console.warn("[RedditSection] disabled safely:", err);
    return null;
  }
}

/* ---------------- INTERNAL SAFE FETCH ---------------- */

async function fetchRedditPosts(movie: MovieForReddit, limit: number) {
  const allowedSubreddits = ["horror", "80shorror", "movies"];

  const requests = allowedSubreddits.map(async subreddit => {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(
      movie.title
    )}&restrict_sr=1&sort=relevance&limit=10`;

    try {
      const res = await fetch(url, {
        next: { revalidate: 60 * 60 }, // 1h cache
      });

      if (!res.ok) return [];

      const json = await res.json();
      return json?.data?.children ?? [];
    } catch {
      return [];
    }
  });

  const results = await Promise.all(requests);

  const posts = results.flat().map((child: RedditApiChild) => ({
    id: child.data.id,
    title: child.data.title,
    author: child.data.author,
    subreddit: child.data.subreddit,
    upvotes: child.data.ups || 0,
    url: `https://reddit.com${child.data.permalink}`,
  }));

  return posts.slice(0, limit);
}