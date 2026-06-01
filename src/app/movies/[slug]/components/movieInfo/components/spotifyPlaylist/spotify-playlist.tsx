"use client";

import { useState } from "react";
import styles from "./spotify-playlist.module.css";
import { SpotifyEmbed as SpotifyEmbedType } from "@/app/services/spotify";
import Image from "next/image";
interface SpotifyEmbedProps {
  playlist: SpotifyEmbedType;
}

export function SpotifyEmbed({ playlist }: SpotifyEmbedProps) {
  const [activated, setActivated] = useState(false);

  return (
    <div className={styles.spotifyEmbed}>
      <h3 className={`${styles.title} heading-secondary`}>
        {playlist.name}
      </h3>

      <div className={styles.iframeWrapper}>
        {activated ? (
          <iframe
            src={playlist.embedUrl}
            width="100%"
            height="380"
            allow="encrypted-media"
            title={playlist.name}
            className={styles.spotifyIframe}
          />
        ) : (
          <div
            className={styles.spotifyFacade}           
          >
            {playlist.imageUrl && (
              <Image 
  src={playlist.imageUrl} 
  alt={playlist.name}
  width={300}
  height={300}
  style={{ width: "100%", height: "auto" }}
/>
            )}
            <button 
            onClick={() => setActivated(true)}
            className={styles.playButton}>▶ Play on Spotify</button>
          </div>
        )}
      </div>
    </div>
  );
}