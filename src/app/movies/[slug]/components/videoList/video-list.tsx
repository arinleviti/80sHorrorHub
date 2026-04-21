// src/app/movies/[slug]/components/videoList/video-list.tsx
'use client';
import { useState } from "react";
import { Row, Col, Modal, Stack } from "react-bootstrap";
import ReactPlayer from "react-player"; // NOT "react-player/youtube"
import Image from "next/image";
import { YouTubeVideo } from "@/app/services/youtube";
import styles from "./video-list.module.css";

interface VideoListProps {
  videos: YouTubeVideo[];
  title: string;
}
function decodeHtml(html: string) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
export default function VideoList({ videos, title }: VideoListProps) {
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
const handleClose = () => setSelectedVideo(null);
const showModal = selectedVideo !== null;

  if (!videos || videos.length === 0) {
    return <p className="text-muted-custom">No {title} available</p>;
  }

  return (
    <Stack gap={4}>
      <h2 className="heading-secondary">{title}</h2>

      <Row className="g-2 justify-content-center">
  {videos.map((v) => (
    <Col key={v.youtubeId} xs={6} sm={6} md={4} lg={3}>
      <div className={styles.videoCard} onClick={() => setSelectedVideo(v)} style={{ cursor: "pointer" }}>
        {v.thumbnail ? (
          <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%" }}>
            <Image
              src={v.thumbnail}
              alt={v.title}
              fill
              sizes="(max-width: 576px) 50vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, 25vw"
              style={{ objectFit: "cover", borderRadius: "0.25rem" }}
            />
          </div>
        ) : (
          <div className="placeholder-img" style={{ height: "180px", background: "#333" }} />
        )}
        <div className={styles.videoInfo}>
         <p className={styles.videoTitle}>
  {decodeHtml(v.title)}
</p>
        </div>
      </div>
    </Col>
  ))}
</Row>

      {/* Modal */}
  <Modal
  show={showModal}
  onHide={handleClose}
  size="xl"
  centered
  dialogClassName="youtube-modal"
>
  <Modal.Header
    closeButton
    style={{ 
      backgroundColor: '#111', // same as modal background
      borderBottom: 'none',
      padding: '0.5rem 1rem'
    }}
    closeVariant="white" // <-- makes the X white
  >
    {/* optional title */}
  </Modal.Header>
  <Modal.Body style={{ padding: 0, backgroundColor: '#111' }}>
    {selectedVideo && (
      <ReactPlayer
        src={selectedVideo.url}
        controls
        width="100%"
        height="100%"
        style={{ aspectRatio: "16/9" }}
      />
    )}
  </Modal.Body>
</Modal>
    </Stack>
  );
}