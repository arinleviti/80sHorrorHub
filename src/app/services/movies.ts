export const rawSlugToIdMap: Record<string, number> = {
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
  "the-fly":9426,
  "night-of-the-demons": 24924,
  "maniac": 27346,
  "children-of-the-corn": 10823,
  "tremors": 9362,
  "friday-the-13th:-the-final-chapter": 9730,
  "maximum-overdrive": 9980,
  "scanners": 9538, 
  "my-bloody-valentine": 39874, 
   "motel-hell": 30924, 
   "the-evil-dead": 764, 
   "the-changeling": 13550, 
   "dressed-to-kill": 11033, 
   "fade-to-black": 40034, 
   "the-burning": 24124, 
   "halloween-II": 11281, 
   "cat-people": 6217, 
  "basket-case": 27813, 
  "halloween-III:-season-of-the-witch": 10676,
  "they-live": 8337, 
  "videodrome": 837, 
  "christine": 8769, 
  "full-moon-high": 107430, 
  "ghost-story": 24634, 
  "q:-the-winged-serpent": 27726,
  "creepshow": 16281, 
  "friday-the-13th-part-III": 9728, 
  "parasite": 48311, 
  "the-huger": 11654, 
  "psycho-II": 10576, 
  "cujo": 10489, 
  "amityville-3D": 27214,  
  "jaws-3D": 17692, 
  "firestarter": 11495, 
  "gremlins": 927, 
  "night-of-the-comet": 18462, 
  "the-company-of-wolves": 11905,
  "the-stuff": 18502, 
  "day-of-the-dead": 8408, 
  "howling-II": 29794, 
  "silver-bullet": 17898, 
  "chopping-mall": 28941, 
  "the-toxic-avenger": 15239, 
  "psycho-III": 12662, 
  "friday-the-13th-part-VI:-jason-lives": 10225, 
  "night-of-the-creeps": 15762, 
  "the-taxas-chainsaw-massacre-2": 16337, 
  "from-beyond": 14510, 
  "a-nightmare-on-elm-street-3:-dream-warriors": 10072, 
  "dolls": 24341, 
  "evil-dead-2": 765, 
  "the-monster-squad": 13509, 
  "near-dark": 11879, 
  "critters-2": 10127, 
  "friday-the-13th-part-VII:-the-new-blood": 10281, 
  "killer-klowns-from-outer-space": 16296, 
  "phantasm-II": 15158,
  "the-blob": 9599, 
  "a-nightmare-on-elm-street-4:-the-dream-master": 10131, 
  "the-lair-of-the-white-worm": 11347, 
  "elvira:-mistress-of-the-dark": 5680, 
  "pumpkinhead": 26515, 
  "halloween-IV:-the-return-of-michael-myers": 11357,
  "child's-play": 10585, 
  "hellbound:-hellraiser-ii": 9064, 
  "the-burbs": 11974, 
  "976-evil": 24038,
  "pet-sematary": 8913, 
  "friday-the-13th-part-VIII:-jason-takes-manhattan": 10283, 
  "stepfather-ii": 30666,
  "society": 22244, 
};
// Precompute normalized map
export const slugToIdMap: Record<string, number> = {};
for (const key in rawSlugToIdMap) {
  //normalizeSlug(key) converts the raw slug into a clean, consistent slug that can be used in URLs and lookups. 
  //It trims whitespace, converts to lowercase, replaces spaces with hyphens, and removes special characters.
  slugToIdMap[normalizeSlug(key)] = rawSlugToIdMap[key];
}
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
export const moviesArray = Object.entries(slugToIdMap).map(([slug, id]) => ({
  slug,
  id,
  // optional: title as human-readable
  title: slug.replace(/-/g, ' '),
}));

export function normalizeSlug(str: string) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')       // replace spaces with hyphens
    .replace(/[^a-z0-9\-]/g, ''); // remove everything except a-z, 0-9, -
}