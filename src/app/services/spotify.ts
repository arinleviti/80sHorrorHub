const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";

// --- TYPES ---
interface SpotifyImage {
  url: string;
}

interface SpotifyAlbumRaw {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: { name: string }[];
  release_date?: string;
}

interface SpotifyPlaylistRaw {
  id: string;
  name: string;
  images: SpotifyImage[];
}

export interface SpotifyEmbed {
  id: string;
  name: string;
  embedUrl: string;
  imageUrl?: string;
  type: "album" | "playlist";
}

// --- CONFIG ---
const SEARCH_LIMIT = 50;
const YEAR_TOLERANCE = 2;

const SOUNDTRACK_KEYWORDS = [
  "ost",
  "soundtrack",
  "score",
  "original soundtrack",
  "original score",
  "motion picture",
  "film score"
];

const STOPWORDS = ["the", "a", "an", "of", "on", "in", "and"];
const MIN_SCORE = 7; // or 6, experiment with this

// allow short but meaningful names (bands etc.)
const ALLOWED_SHORT_NAMES = ["goblin"];

// --- HELPERS ---
const normalize = (str: string) =>
  str?.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim() || "";

const hasSoundtrackKeyword = (title: string) =>
  SOUNDTRACK_KEYWORDS.some(k => normalize(title).includes(normalize(k)));

const getMovieWords = (movie: string) =>
  normalize(movie)
    .split(" ")
    .filter(w => w && !STOPWORDS.includes(w));

const OST_FOLLOWING_WORDS = new Set([
  "soundtrack", "ost", "score", "original", "motion", "picture",
  "film", "the", "a", "an", "and", "or", "volume", "vol"
]);
const ROMAN_MAP: Record<string, number> = {
  ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10
};

const getSequelNumber = (title: string): number | null => {
  const roman = normalize(title).match(/\b(ii|iii|iv|v|vi|vii|viii|ix|x)\b/);
  if (roman) return ROMAN_MAP[roman[1]];
  const arabic = normalize(title).match(/\b(\d+)\b/);
  if (arabic) return parseInt(arabic[1]);
  return null;
};

const containsFullTitle = (itemTitle: string, movie: string): boolean => {
 const normalizedItem  = normalize(itemTitle);
  const normalizedMovie = normalize(movie);
  const idx = normalizedItem.indexOf(normalizedMovie);
  if (idx === -1) return false;

  const after = normalizedItem.slice(idx + normalizedMovie.length).trimStart();
  if (!after) return true;

  // sequel number → not a match
  if (/^(ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|\d+)\b/.test(after)) return false;

  // for non-sequel movies, the next word must be an OST keyword
  // this blocks "Halloween Kills", "Halloween Returns", etc.
  if (getSequelNumber(movie) === null) {
    const firstWord = after.split(" ")[0].replace(/[^a-z]/g, "");
    if (firstWord && !OST_FOLLOWING_WORDS.has(firstWord)) return false;
  }

  return true;
};


const countMatchingWords = (title: string, movieWords: string[]) => {
  const titleNorm = normalize(title);
  return movieWords.filter(word => titleNorm.includes(word)).length;
};

const getAlbumYear = (album: SpotifyAlbumRaw): number | null => {
  if (!album.release_date) return null;
  const year = parseInt(album.release_date.slice(0, 4), 10);
  return isNaN(year) ? null : year;
};

const extractYearFromTitle = (title: string): number | null => {
  const match = title.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
};

const toEmbed = (
  item: SpotifyAlbumRaw | SpotifyPlaylistRaw,
  type: "album" | "playlist"
): SpotifyEmbed => ({
  id: item.id,
  name: item.name,
  embedUrl: `https://open.spotify.com/embed/${type}/${item.id}`,
  imageUrl: item.images?.[0]?.url,
  type
});

// --- CREW MATCHING ---
const extractCrewNames = (crew?: { name: string; job: string }[]) => {
  if (!crew) return [];

  return crew.map(c => normalize(c.name));
};

const isStrongName = (name: string) => {
  if (ALLOWED_SHORT_NAMES.includes(name)) return true;

  // require at least 2 words (e.g. "john carpenter")
  if (!name.includes(" ")) return false;

  // avoid very short names
  if (name.length < 5) return false;

  return true;
};

const matchesCrew = (
  title: string,
  artists: { name: string }[] = [],
  crewNames: string[]
): boolean => {
  const titleNorm = normalize(title);
  const artistNames = artists.map(a => normalize(a.name));
//some() stops only if at least one element matches the condition (true).
  return crewNames.some(crew => {
    if (!isStrongName(crew)) return false;

    return (
      //here we check if the crew member we're iterating over is present in the title of the album/playlist.
      titleNorm.includes(crew) ||
      //Returns true if at least one element passes the test.
      //here we check if at least at least one of the artist in the spotify almbum/playlist matches the crew member we're iterating over.
      artistNames.some(a => a.includes(crew))
    );
  });
};

// --- SCORING ---
const computeScore = ({
  title,
  artists,
  movieWords,
  movieTitle,
  crewNames,
  itemYear,
  movieYear,
  isAlbum
}: {
  title: string;
  artists?: { name: string }[];
  movieWords: string[];
  movieTitle: string;
  crewNames: string[];
  itemYear: number | null;
  movieYear?: number;
  isAlbum: boolean;
}) => {
  let score = 0;

  // 🎼 CREW MATCH (strongest signal)
  if (matchesCrew(title, artists, crewNames)) {
    score += 10;
  }
// 🚫 WRONG SEQUEL — heavy penalty
const movieSequel = getSequelNumber(movieTitle);
const itemSequel  = getSequelNumber(title);

if (movieSequel !== null && itemSequel !== null && movieSequel !== itemSequel) {
  score -= 20;
}
// 🚫 SEQUEL MOVIE + UNNUMBERED ITEM — check what follows the base title
if (movieSequel !== null && itemSequel === null) {
  const base = normalize(movieTitle)
    .replace(/\s+(ii|iii|iv|v|vi|vii|viii|ix|x|\d+).*$/, "")
    .trim();
  const normalizedItem = normalize(title);
  const idx = normalizedItem.indexOf(base);
  if (idx !== -1) {
    const after = normalizedItem.slice(idx + base.length).trimStart();
    const firstWord = after.split(" ")[0].replace(/[^a-z]/g, "");
    if (firstWord && !OST_FOLLOWING_WORDS.has(firstWord)) {
      score -= 20;
    }
  }
}
  // 🎬 TITLE MATCH
  const wordMatches = countMatchingWords(title, movieWords);
  score += wordMatches * 2;

  // 🎯 FULL TITLE MATCH bonus
if (containsFullTitle(title, movieTitle)) {
  score += 5;
}

  // 📅 YEAR MATCH
  if (movieYear && itemYear && isAlbum) {
  const diff = Math.abs(itemYear - movieYear);
  if (diff === 0)              score += 5;
  else if (diff <= YEAR_TOLERANCE) score += 2;
  else if (diff > 10)          score -= 5;
}

  // 🎵 Prefer albums over playlists
  if (isAlbum) score += 2;

  return score;
};

// --- TOKEN ---
async function fetchSpotifyToken(): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
      },
      body: "grant_type=client_credentials"
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

// --- SEARCH CORE ---
async function searchOnce(
  token: string,
  query: string,
  movie: string,
  movieYear?: number,
  crew?: { name: string; job: string }[]
): Promise<SpotifyEmbed | null> {

  const params = new URLSearchParams({
    q: query,
    type: "album,playlist",
    limit: SEARCH_LIMIT.toString()
  });

  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return null;

  const data = await res.json();

  const movieWords = getMovieWords(movie);
  const crewNames = extractCrewNames(crew);

  const candidates: { embed: SpotifyEmbed; score: number }[] = [];

  // --- ALBUMS ---
  for (const album of data?.albums?.items ?? []) {
    if (!album?.name || !hasSoundtrackKeyword(album.name)) continue;

    const score = computeScore({
      title: album.name,
      artists: album.artists,
      movieWords,
      movieTitle: movie,
      crewNames,
      itemYear: getAlbumYear(album),
      movieYear,
      isAlbum: true
    });

    if (score > MIN_SCORE) {
      candidates.push({
        embed: toEmbed(album, "album"),
        score
      });
    }
  }

  // --- PLAYLISTS ---
  for (const playlist of data?.playlists?.items ?? []) {
    if (!playlist?.name || !hasSoundtrackKeyword(playlist.name)) continue;

    const score = computeScore({
      title: playlist.name,
      movieWords,
      movieTitle: movie,
      crewNames,
      itemYear: extractYearFromTitle(playlist.name),
      movieYear,
      isAlbum: false
    });

    if (score > MIN_SCORE) {
      candidates.push({
        embed: toEmbed(playlist, "playlist"),
        score
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  return candidates[0]?.embed ?? null;
}

// --- MAIN ---
export async function searchSpotify(
  rawQuery: string,
  year?: number,
  crew?: { name: string; job: string }[]
): Promise<SpotifyEmbed | null> {

  const token = await fetchSpotifyToken();
  if (!token) return null;

  const movie = rawQuery
    .split("\n")[0]
    .replace(/\(.*?\)/g, "")
    .replace(/\./g, " ")
    .trim();

  const queries = [
    `${movie} soundtrack`,
    `${movie} ost`,
    `${movie} score`,
    `${movie} original soundtrack`,
    `${movie} original score`
  ];

  for (const q of queries) {
    const result = await searchOnce(token, q, movie, year, crew);
    if (result) return result;
  }

  return null;
}