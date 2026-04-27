import RedditFeed from "./redditFeed";
import { MovieForReddit } from "./redditFeed";
import { fetchRedditPosts } from "../../../../../../services/reddit";

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