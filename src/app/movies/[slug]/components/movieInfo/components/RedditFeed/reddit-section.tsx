import RedditFeed from "./redditFeed";
import { fetchRedditPosts, MovieForReddit } from "../../../../../../services/reddit";
import { Movie } from "@/app/services/tmdb";

export default async function RedditSection({ movie }: { movie: Movie }) {
  try {
    const movieForReddit: MovieForReddit = {
      title: movie.title,
      releaseDate: movie.release_date,
      castMembers: movie.cast?.map((c) => ({
        actor: { name: c.actorName },
        character: c.character,
      })),
      crew: movie.crew,
    };

    const posts = await fetchRedditPosts(movieForReddit, 5);
    if (!posts?.length) return null;

    return <RedditFeed posts={posts} />;
  } catch (err) {
    console.warn("[RedditSection] disabled safely:", err);
    return null;
  }
}