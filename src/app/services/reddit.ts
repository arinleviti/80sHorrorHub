import axios from "axios";

// -----------------
// Types
// -----------------
export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  upvotes: number;
  url: string;
}

// Reddit API response types
interface RedditAPIResponse {
  data: {
    children: {
      data: {
        id: string;
        title: string;
        author: string;
        subreddit: string;
        ups: number;
        permalink: string;
      };
    }[];
  };
}

// -----------------
// Constants
// -----------------
const allowedSubreddits = ["horror", "80shorror", "movies"];
const junkWords = /meme|shitpost|gif|funny|bot|disney/i;

// -----------------
// Helper: score a post
// -----------------
export interface MovieForReddit {
  title: string;
  releaseDate?: string | null;
  castMembers?: { actor: { name: string }; character: string }[];
}

const scorePost = (post: RedditPost, movie: MovieForReddit): number => {
  let score = 0;
  const titleLower = post.title.toLowerCase();

  const movieTitle = movie.title.toLowerCase();
  const movieYear = movie.releaseDate ? movie.releaseDate.slice(0, 4) : null;

  // Junk filter
  if (junkWords.test(titleLower)) return -100;

  // Movie title
  if (titleLower.includes(movieTitle)) score += 3;

  // Movie year
  if (movieYear && titleLower.includes(movieYear)) score += 2;

  // Top 5 actors
  if (movie.castMembers) {
    const topActors = movie.castMembers.slice(0, 5).map(c => c.actor.name.toLowerCase());
    if (topActors.some(a => titleLower.includes(a))) score += 2;
  }

  // Top 5 characters
  if (movie.castMembers) {
    const topChars = movie.castMembers.slice(0, 5).map(c => c.character.toLowerCase());
    if (topChars.some(c => titleLower.includes(c))) score += 2;
  }

  // Minimum upvotes
  if (post.upvotes < 2) return -100;

  return score;
};

// -----------------
// Main function
// -----------------
export const fetchRedditPosts = async (
  movie: MovieForReddit,
  limit = 5
): Promise<RedditPost[]> => {
  const allPosts: RedditPost[] = [];

  for (const subreddit of allowedSubreddits) {
    try {
      const res = await axios.get<RedditAPIResponse>(
        `https://www.reddit.com/r/${subreddit}/search.json`,
        {
          params: {
            q: movie.title,
            restrict_sr: 1,
            sort: "relevance",
            limit: 15, // fetch extra for filtering
          },
        }
      );

      const posts: RedditPost[] = res.data.data.children.map(child => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        subreddit: child.data.subreddit,
        upvotes: child.data.ups,
        url: `https://reddit.com${child.data.permalink}`,
      }));

      allPosts.push(...posts);
    } catch (err) {
      console.error(`Error fetching subreddit ${subreddit}:`, err);
    }
  }

  // Score posts
  const scored = allPosts
    .map(post => ({ post, score: scorePost(post, movie) }))
    .filter(({ score }) => score > 0);

  // Deduplicate by ID
  const unique = Array.from(new Map(scored.map(s => [s.post.id, s])).values());

  // Sort by score first, upvotes second
  unique.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.post.upvotes - a.post.upvotes;
  });

  // Limit results
  return unique.slice(0, limit).map(u => u.post);
};