import { getHFSuggestions } from "@/app/services/huggingFaceAI";
import HFSuggestionsList from "./hf-suggestion-list";
import { Movie } from "@/app/services/tmdb";

interface HFSectionProps {
  movie: Movie;
}

export default async function HFSection({ movie }: HFSectionProps) {
  const suggestions = await getHFSuggestions(
    movie.id.toString(),
    movie.title,
    movie.release_date?.slice(0, 4) || ""
  );

  if (!suggestions || suggestions.length === 0) return null;

  return <HFSuggestionsList suggestions={suggestions} />;
}