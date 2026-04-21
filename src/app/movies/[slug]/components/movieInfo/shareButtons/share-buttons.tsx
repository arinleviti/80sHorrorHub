"use client";

import { XShareButton, FacebookShareButton, WhatsappShareButton, XIcon, FacebookIcon, WhatsappIcon } from "react-share";
import styles from "./share-buttons.module.css";

interface ShareButtonsProps {
  title: string;
}

export default function ShareButtons({ title }: ShareButtonsProps) {
  const url = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className={styles.shareWrapper}>
      <span className={styles.shareLabel}>Share</span>
      <XShareButton url={url} title={title}>
        <XIcon size={32} round bgStyle={{ fill: "transparent" }} iconFillColor="var(--color-accent)" />
      </XShareButton>
      <FacebookShareButton url={url}>
        <FacebookIcon size={32} round bgStyle={{ fill: "transparent" }} iconFillColor="var(--color-accent)" />
      </FacebookShareButton>
      <WhatsappShareButton url={url} title={title}>
        <WhatsappIcon size={32} round bgStyle={{ fill: "transparent" }} iconFillColor="var(--color-accent)" />
      </WhatsappShareButton>
    </div>
  );
}