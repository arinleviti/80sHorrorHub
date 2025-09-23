import Image from "next/image";
import { SpotifyPlaylistEmbed } from "@/app/services/spotify";

interface SpotifyEmbedProps {
  playlist: SpotifyPlaylistEmbed;
}

export function SpotifyEmbed({ playlist }: SpotifyEmbedProps) {
  return (
    <div className="spotify-embed">
      <h3>{playlist.name}</h3>
      <iframe
        src={playlist.embedUrl}
        width="300"
        height="380"
        frameBorder="0"
        allow="encrypted-media"
        title={playlist.name}
      ></iframe>
        {/* {playlist.imageUrl && (
        <div className="relative w-48 h-48">
          <Image
            src={playlist.imageUrl}
            alt={playlist.name}
            fill
            style={{ objectFit: "cover" }}
            priority
          />
        </div>
      )} */}
    </div>
  );
}