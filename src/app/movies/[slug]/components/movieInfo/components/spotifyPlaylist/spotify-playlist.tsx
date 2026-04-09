"use client";

import React from "react";
import { SpotifyEmbed as SpotifyEmbedType } from "@/app/services/spotify";
import styles from "./spotify-playlist.module.css";

interface SpotifyEmbedProps {
  playlist: SpotifyEmbedType;
}

export function SpotifyEmbed({ playlist }: SpotifyEmbedProps) {
  return (
    <div className={styles.spotifyEmbed}>
      {/* Combining the global 'heading-secondary' for base styles 
        with our local 'title' for the specific sizing 
      */}
      <h3 className={`${styles.title} heading-secondary`}>
        {playlist.name}
      </h3>
      
      <div className={styles.iframeWrapper}>
        <iframe
          src={playlist.embedUrl}
          width="300"
          height="380"
          allow="encrypted-media"
          title={playlist.name}
          className={styles.spotifyIframe}
          loading="lazy"
        ></iframe>
      </div>
    </div>
  );
}