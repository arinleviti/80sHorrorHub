export const slugToIdMap: Record<string, number> = {
  "halloween": 948,
  "friday-the-13th": 4488,
  "a-nightmare-on-elm-street": 377,
  "poltergeist": 609,
  "chud": 23730,
  "the-thing": 1091,
  "sleepaway-camp": 13567,
  "fright-night": 11797,
};

export interface Movie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: { id: number; name: string }[];
  vote_average: number;
}