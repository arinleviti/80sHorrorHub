const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";

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

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}
export interface SpotifyPlaylistEmbed {
  id: string;
  name: string;
  embedUrl: string; // the URL you can use in <iframe>
  imageUrl?: string; // optional, cover image
}
export async function SearchSpotifyPlaylist(query: string, limit: number): Promise<SpotifyPlaylistEmbed | null> {
  console.log("Searching Spotify for playlist:", query); // 1️⃣
  const token = await fetchSpotifyToken();
  // Sanitize query: remove dots, extra spaces
  const sanitizedQuery = query.replace(/\./g, " ").trim();
  const params = new URLSearchParams({
    q: `${sanitizedQuery}" soundtrack`,
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
  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  console.log("Raw data from Spotify:", data); // 2️⃣

  // Filter out null items before type checking
  if (data?.playlists?.items) {
    //removes any null or undefined items from the array
    data.playlists.items = data.playlists.items.filter(Boolean);
  }
  //  Type guards for playlists and albums
  const hasValidPlaylists = isSpotifyPlaylistSearchRaw(data);
  const hasValidAlbums = isSpotifyAlbumSearchRaw(data);
  //  Search albums first
  if (hasValidAlbums && data.albums?.items?.length) {
    const albumMatch = data.albums.items
  .filter(a => a.total_tracks >= 5) // 🔹 only keep albums with 5+ tracks
  .find(a =>
    a.name.toLowerCase().includes(query.toLowerCase()) &&
    a.name.toLowerCase().includes("soundtrack")
  );

    if (albumMatch) {
      console.log("Album found:", albumMatch.name, albumMatch.id);
      return {
        id: albumMatch.id,
        name: albumMatch.name,
        embedUrl: `https://open.spotify.com/embed/album/${albumMatch.id}`,
        imageUrl: albumMatch.images[0]?.url,
      };
    }
  }

  //  Post-filter playlists if no album matched
  if (hasValidPlaylists && data.playlists?.items?.length) {
   const filtered = data.playlists.items
  .filter(p => p.tracks.total >= 3)
  .filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) &&
    p.name.toLowerCase().includes("soundtrack")
  );

    const playlist = filtered[0] || null;
    if (playlist) {
      console.log("Playlist found:", playlist.name, playlist.id);
      return {
        id: playlist.id,
        name: playlist.name,
        embedUrl: `https://open.spotify.com/embed/playlist/${playlist.id}`,
        imageUrl: playlist.images[0]?.url,
      };
    }
  }
   // MISSING RETURN for cases where nothing is found
  console.warn("No matching album or playlist found for query:", query);
  return null;
}
  function isSpotifyPlaylistSearchRaw(data: unknown): data is SpotifyPlaylistSearchRaw {
    if (typeof data !== "object" || data === null) return false;
    const playlists = (data as { playlists?: unknown }).playlists;
    if (typeof playlists !== "object" || playlists === null) return false;

    const items = (playlists as { items?: unknown }).items;
    if (!Array.isArray(items)) return false;

    // Check each item
    return items.every(isSpotifyPlaylistRaw);
  }
  function isSpotifyPlaylistRaw(item: unknown): item is SpotifyPlaylistRaw {
    if (typeof item !== "object" || item === null) return false;

    const obj = item as {
      id?: unknown;
      name?: unknown;
      description?: unknown;
      external_urls?: unknown;
      images?: unknown;
      owner?: unknown;
      tracks?: unknown;
    };

    if (typeof obj.id !== "string") return false;
    if (typeof obj.name !== "string") return false;
    if (typeof obj.description !== "string") return false;

    if (typeof obj.external_urls !== "object" || obj.external_urls === null) return false;
    if (typeof (obj.external_urls as { spotify?: unknown }).spotify !== "string") return false;

    if (!Array.isArray(obj.images) || !obj.images.every(isSpotifyImage)) return false;

    if (typeof obj.owner !== "object" || obj.owner === null) return false;
    const owner = obj.owner as {
      display_name?: unknown;
      external_urls?: unknown;
    };
    if (typeof owner.display_name !== "string") return false;
    if (typeof owner.external_urls !== "object" || owner.external_urls === null) return false;
    if (typeof (owner.external_urls as { spotify?: unknown }).spotify !== "string") return false;

    if (typeof obj.tracks !== "object" || obj.tracks === null) return false;
    if (typeof (obj.tracks as { total?: unknown }).total !== "number") return false;

    return true;
  }

  function isSpotifyImage(item: unknown): item is SpotifyImage {
    if (typeof item !== "object" || item === null) return false;
    const obj = item as { url?: unknown; height?: unknown; width?: unknown };
    if (typeof obj.url !== "string") return false;
    if (obj.height !== null && typeof obj.height !== "number") return false;
    if (obj.width !== null && typeof obj.width !== "number") return false;
    return true;
  }
  async function fetchSpotifyToken(): Promise<string> {
    console.log("Attempting to fetch Spotify token...");
    console.log("CLIENT_ID:", CLIENT_ID, "CLIENT_SECRET length:", CLIENT_SECRET?.length);

    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Authorization": "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")
        },
        body: "grant_type=client_credentials"
      });

      console.log("Spotify token response status:", response.status, response.statusText);

      const text = await response.text();
      console.log("Spotify token response body:", text);

      let tokenData: unknown;
      try {
        tokenData = JSON.parse(text);
      } catch (err) {
        console.error("Failed to parse token response as JSON:", err);
        throw new Error("Spotify token response is not valid JSON");
      }

      if (
        typeof tokenData !== "object" ||
        tokenData === null ||
        !("access_token" in tokenData) ||
        typeof (tokenData as { access_token?: unknown }).access_token !== "string"
      ) {
        throw new Error("Spotify API returned invalid token data");
      }

      const accessToken = (tokenData as { access_token: string }).access_token;
      console.log("Successfully fetched Spotify token:", accessToken.slice(0, 5) + "..."); // just show first 5 chars
      return accessToken;

    } catch (err) {
      console.error("Error fetching Spotify token:", err);
      throw err;
    }
  }

  function isSpotifyAlbumSearchRaw(data: unknown): data is SpotifyAlbumSearchRaw {
    if (typeof data !== "object" || data === null) return false;

    const albums = (data as { albums?: unknown }).albums;
    if (typeof albums !== "object" || albums === null) return false;

    const items = (albums as { items?: unknown }).items;
    if (!Array.isArray(items)) return false;

    // Check each item
    return items.every(isSpotifyAlbumRaw);
  }

  // 🔹 Type guard for a single album
  function isSpotifyAlbumRaw(item: unknown): item is SpotifyAlbumRaw {
    if (typeof item !== "object" || item === null) return false;

    const obj = item as {
      id?: unknown;
      name?: unknown;
      images?: unknown;
      external_urls?: unknown;
      artists?: unknown;
      total_tracks?: unknown;
    };

    if (typeof obj.id !== "string") return false;
    if (typeof obj.name !== "string") return false;

    if (!Array.isArray(obj.images) || !obj.images.every(isSpotifyImage)) return false;

    if (typeof obj.external_urls !== "object" || obj.external_urls === null) return false;
    if (typeof (obj.external_urls as { spotify?: unknown }).spotify !== "string") return false;

    if (!Array.isArray(obj.artists)) return false;
    if (!obj.artists.every(a =>
      typeof a === "object" &&
      a !== null &&
      typeof (a as { name?: unknown }).name === "string" &&
      typeof (a as { external_urls?: unknown }).external_urls === "object" &&
      (a as { external_urls: { spotify: string } }).external_urls.spotify
    )) return false;

    if (typeof obj.total_tracks !== "number") return false;

    return true;
  }