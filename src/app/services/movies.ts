export const slugToIdMap: Record<string, number> = {
  "halloween": 948,
  "friday-the-13th": 4488,
  "a-nightmare-on-elm-street": 377,
  "poltergeist": 609,
  "chud": 23730,
  "the-thing": 1091,
  "sleepaway-camp": 13567,
  "fright-night": 11797,
  "the-fog": 790,
  "A-Nightmare-on-Elm-Street-Part-2:Freddy's-Revenge": 10014,
  "swamp-thing": 17918,
  "aliens": 679,
  "re-animator": 1694,
  "the-return-of-the-living-dead": 10925,
  "ghostbusters": 620,
  "the-howling": 11298,
  "an-american-werewolf-in-london": 814,
  "the-lost-boys": 1547,
  "hellraiser": 9003,
  "the-shining": 694,
  "the-beyond":19204,
  "the-initiation":63360,
  "the-fly":9426
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