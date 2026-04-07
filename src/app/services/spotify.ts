const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";

// --- TYPES ---
interface SpotifyImage { url: string; }

interface SpotifyAlbumRaw {
  id: string;
  name: string;
  images: SpotifyImage[];
  artists: { name: string }[];
  total_tracks: number;
  release_date?: string; // YYYY-MM-DD
}

interface SpotifyPlaylistRaw {
  id: string;
  name: string;
  images: SpotifyImage[];
  tracks: { total: number };
}

export interface SpotifyEmbed {
  id: string;
  name: string;
  embedUrl: string;
  imageUrl?: string;
  type: "album" | "playlist";
}

// --- CONFIG ---
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
const SEARCH_LIMIT = 50;
const YEAR_TOLERANCE = 2;

// --- HELPERS ---
const normalize = (str: string) =>
  str?.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim() || "";

const hasSoundtrackKeyword = (title: string) =>
  SOUNDTRACK_KEYWORDS.some(k => normalize(title).includes(normalize(k)));

const getMovieWords = (movie: string) =>
  normalize(movie)
    .split(" ")
    .filter(w => w && !STOPWORDS.includes(w));

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
  if (!match) return null;
  const year = parseInt(match[1], 10);
  return isNaN(year) ? null : year;
};

const toEmbed = (item: SpotifyAlbumRaw | SpotifyPlaylistRaw, type: "album" | "playlist"): SpotifyEmbed => ({
  id: item.id,
  name: item.name,
  embedUrl: `https://open.spotify.com/embed/${type}/${item.id}`,
  imageUrl: item.images?.[0]?.url,
  type
});

// --- TOKEN ---
async function fetchSpotifyToken(): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
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

// --- SEARCH SINGLE QUERY ---
async function searchOnce(
  token: string,
  query: string,
  movie: string,
  movieYear?: number
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

  // --- FILTER ALBUMS ---
  const albums: { album: SpotifyAlbumRaw; year: number | null }[] =
  (data?.albums?.items ?? [])
    .filter((a: SpotifyAlbumRaw) => a?.name && hasSoundtrackKeyword(a.name))
    .map((a: SpotifyAlbumRaw) => ({ album: a, year: getAlbumYear(a) }))
    .filter((x: { album: SpotifyAlbumRaw; year: number | null }) => {
      const matches = countMatchingWords(x.album.name, movieWords);
      if (matches < movieWords.length) return false;
      if (movieYear && x.year) {
        return Math.abs(x.year - movieYear) <= YEAR_TOLERANCE;
      }
      return true;
    });

// --- FILTER PLAYLISTS ---
const playlists: { playlist: SpotifyPlaylistRaw; year: number | null }[] =
  (data?.playlists?.items ?? [])
    .filter((p: SpotifyPlaylistRaw) => p?.name && hasSoundtrackKeyword(p.name))
    .map((p: SpotifyPlaylistRaw) => ({ playlist: p, year: extractYearFromTitle(p.name) }))
    .filter((x: { playlist: SpotifyPlaylistRaw; year: number | null }) => {
      const matches = countMatchingWords(x.playlist.name, movieWords);
      if (matches < movieWords.length) return false;
      if (movieYear && x.year) {
        return Math.abs(x.year - movieYear) <= YEAR_TOLERANCE;
      }
      return false; // discard playlists without year
    });

  // --- PRIORITIZE ALBUMS ---
  const candidates: SpotifyEmbed[] = [
    ...albums.sort((a, b) => b.year ?? 0 - (a.year ?? 0)).map(a => toEmbed(a.album, "album")),
    ...playlists.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)).map(p => toEmbed(p.playlist, "playlist"))
  ];

  return candidates[0] ?? null;
}

// --- MAIN SEARCH ---
export async function searchSpotify(
  rawQuery: string,
  year?: number
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
    const result = await searchOnce(token, q.trim(), movie, year);
    if (result) return result;
  }

  return null;
}