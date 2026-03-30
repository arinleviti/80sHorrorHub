import axios from "axios";

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  upvotes: number;
  url: string;
}

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

const allowedSubreddits = ["horror", "80shorror", "movies"];
const junkWords = /meme|shitpost|gif|funny|bot|disney/i;

export interface MovieForReddit {
  title: string;
  releaseDate?: string | null;
  castMembers?: { actor: { name: string }; character: string }[];
}

const scorePost = (post: RedditPost, movie: MovieForReddit): number => {
  let score = 0;
  const titleLower = post.title.toLowerCase();

  const movieTitle = movie.title.toLowerCase();
  const movieYear = movie.releaseDate?.slice(0, 4);

  if (junkWords.test(titleLower)) return -100;

  if (titleLower.includes(movieTitle)) score += 3;
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
            limit: 15,
          },
          headers: {
            "User-Agent": "VintageHorrorApp/1.0",
          },
        }
      );

      const posts = res.data.data.children.map(child => ({
        id: child.data.id,
        title: child.data.title,
        author: child.data.author,
        subreddit: child.data.subreddit,
        upvotes: child.data.ups,
        url: `https://reddit.com${child.data.permalink}`,
      }));

      allPosts.push(...posts);
    } catch (err) {
      console.error(`Error fetching ${subreddit}`, err);
    }
  }

  const scored = allPosts
    .map(post => ({ post, score: scorePost(post, movie) }))
    .filter(({ score }) => score > 0);

  const unique = Array.from(new Map(scored.map(s => [s.post.id, s])).values());

  unique.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.post.upvotes - a.post.upvotes;
  });

  return unique.slice(0, limit).map(u => u.post);
};