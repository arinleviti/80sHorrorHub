import Image from "next/image";
import {YouTubeVideo} from "@/app/services/youtube";

export default function VideoList({ videos, title }: { videos: YouTubeVideo[]; title: string }) {
  if (videos.length === 0) return <p>No {title} available</p>;
  return (
    <>
      <h2>{title}</h2>
      <div style={{ display: "flex", gap: "1rem", overflowX: "auto" }}>
        {videos.map(v => (
          <div key={v.youtubeId} style={{ minWidth: "300px" }}>
            <h3>{v.title}</h3>
            {v.url && v.thumbnail ? (  // <-- only render if both exist
              <a href={v.url} target="_blank" rel="noopener noreferrer">
                <Image src={v.thumbnail} alt={v.title} width={300} height={169} priority />
              </a>
            ) : (
              <p>{v.title} — video unavailable</p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
