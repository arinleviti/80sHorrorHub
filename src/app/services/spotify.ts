const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";

// --- ALL ORIGINAL INTERFACES ---
interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyPlaylistRaw {
  id: string;
  name: string;
  description: string;
  external_urls: {
    spotify: string;
  };
  images: SpotifyImage[];
  owner: {
    display_name: string;
    external_urls: {
      spotify: string;
    };
  };
  tracks: {
    total: number;
  };
}

interface SpotifyAlbumRaw {
  id: string;
  name: string;
  images: SpotifyImage[];
  external_urls: {
    spotify: string;
  };
  artists: {
    name: string;
    external_urls: {
      spotify: string;
    };
  }[];
  total_tracks: number;
}

interface SpotifyPlaylistSearchRaw {
  playlists: {
    items: SpotifyPlaylistRaw[];
  };
}

interface SpotifyAlbumSearchRaw {
  albums: {
    items: SpotifyAlbumRaw[];
  };
}

export interface SpotifyPlaylistEmbed {
  id: string;
  name: string;
  embedUrl: string;
  imageUrl?: string;
}

// --- MAIN SEARCH FUNCTION ---
export async function SearchSpotifyPlaylist(query: string, limit: number): Promise<SpotifyPlaylistEmbed | null> {
  console.log("🔍 Searching Spotify for playlist:", query);
  
  try {
    const token = await fetchSpotifyToken();
    if (!token) return null;

    const sanitizedQuery = query.replace(/\./g, " ").trim();
    const params = new URLSearchParams({
      q: `${sanitizedQuery} soundtrack`,
      type: "playlist,album",
      limit: limit.toString(),
      market: "US",
      locale: "en_US",
    });

    const response = await fetch(`${SEARCH_URL}?${params.toString()}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      },
    });

    if (response.status === 429) {
      console.warn(`⚠️ Rate limited. Retry-After: ${response.headers.get("Retry-After")}s`);
      return null;
    }

    if (response.status === 403) {
      console.error("🚫 403 Forbidden: Check Premium status of Dev Account.");
      return null;
    }

    if (!response.ok) {
      console.error(`❌ Spotify API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    // Logic for null-filtering
    if (data?.playlists?.items) {
      data.playlists.items = data.playlists.items.filter((item: SpotifyPlaylistRaw | null) => item !== null);
    }

    const hasValidPlaylists = isSpotifyPlaylistSearchRaw(data);
    const hasValidAlbums = isSpotifyAlbumSearchRaw(data);

    // 1. Search Albums (Original Logic)
    if (hasValidAlbums && data.albums.items.length > 0) {
      const albumMatch = data.albums.items
        .filter(a => a.total_tracks >= 5)
        .find(a =>
          a.name.toLowerCase().includes(query.toLowerCase()) &&
          a.name.toLowerCase().includes("soundtrack")
        );

      if (albumMatch) {
        return {
          id: albumMatch.id,
          name: albumMatch.name,
          embedUrl: `https://open.spotify.com/embed/album/${albumMatch.id}`,
          imageUrl: albumMatch.images[0]?.url,
        };
      }
    }

    // 2. Search Playlists (Original Logic)
    if (hasValidPlaylists && data.playlists.items.length > 0) {
      const filtered = data.playlists.items
        .filter(p => p.tracks.total >= 3)
        .filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) &&
          p.name.toLowerCase().includes("soundtrack")
        );

      const playlist = filtered[0] || null;
      if (playlist) {
        return {
          id: playlist.id,
          name: playlist.name,
          embedUrl: `https://open.spotify.com/embed/playlist/${playlist.id}`,
          imageUrl: playlist.images[0]?.url,
        };
      }
    }

    return null;

  } catch (error) {
    console.error("🚨 Spotify Service Error:", error);
    return null;
  }
}

// --- TOKEN FETCH ---
async function fetchSpotifyToken(): Promise<string | null> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
      },
      body: "grant_type=client_credentials"
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token;
  } catch (err) {
    return null;
  }
}

// --- STRICT TYPE GUARDS (NO ANY) ---
function isSpotifyPlaylistSearchRaw(data: unknown): data is SpotifyPlaylistSearchRaw {
  const d = data as SpotifyPlaylistSearchRaw;
  return (
    d !== null &&
    typeof d === "object" &&
    d.playlists !== undefined &&
    Array.isArray(d.playlists.items) &&
    d.playlists.items.every(isSpotifyPlaylistRaw)
  );
}

function isSpotifyPlaylistRaw(item: unknown): item is SpotifyPlaylistRaw {
  const i = item as SpotifyPlaylistRaw;
  return (
    i !== null &&
    typeof i === "object" &&
    typeof i.id === "string" &&
    typeof i.name === "string" &&
    i.tracks !== undefined &&
    typeof i.tracks.total === "number"
  );
}

function isSpotifyAlbumSearchRaw(data: unknown): data is SpotifyAlbumSearchRaw {
  const d = data as SpotifyAlbumSearchRaw;
  return (
    d !== null &&
    typeof d === "object" &&
    d.albums !== undefined &&
    Array.isArray(d.albums.items) &&
    d.albums.items.every(isSpotifyAlbumRaw)
  );
}

function isSpotifyAlbumRaw(item: unknown): item is SpotifyAlbumRaw {
  const i = item as SpotifyAlbumRaw;
  return (
    i !== null &&
    typeof i === "object" &&
    typeof i.id === "string" &&
    typeof i.name === "string" &&
    typeof i.total_tracks === "number"
  );
}

function isSpotifyImage(item: unknown): item is SpotifyImage {
  const i = item as SpotifyImage;
  return i !== null && typeof i.url === "string";
}