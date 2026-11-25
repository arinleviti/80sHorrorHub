"use client";

import Image from "next/image";
import Card from "react-bootstrap/Card";
import ListGroup from "react-bootstrap/ListGroup";
import Stack from "react-bootstrap/Stack";
import styles from "./discogs-list.module.css";

export interface DiscogsListItem {
  title: string;
  year: number | null;
  format: string[];
  thumb?: string;
  url: string; // absolute discogs.com URL, built on the server
}

interface DiscogsListProps {
  results: DiscogsListItem[] | null;
}

export function DiscogsList({ results }: DiscogsListProps) {
  // 1. Guard clause for empty/null states
  if (!results || results.length === 0) {
  return null;
}

  return (
    <Card className="contributioncard">
      <Card.Header className="heading-secondary">Discogs Releases</Card.Header>
      
      <ListGroup variant="flush">
        {results.map((item, index) => (
          <ListGroup.Item key={index} className="d-flex align-items-center">
            
            {/* Thumbnail Logic */}
            {item.thumb && (
              <div className={styles.thumbWrapper}>
                <Image
                  src={item.thumb}
                  alt={item.title}
                  fill
                  sizes="50px"
                  style={{ objectFit: "cover", borderRadius: "4px" }}
                />
              </div>
            )}

            {/* Info Stack */}
            <Stack gap={1}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent fw-bold"
              >
                {item.title}
              </a>
              
              {item.year && (
                <small className="text-muted-custom">Year: {item.year}</small>
              )}
              
              {item.format && item.format.length > 0 && (
                <small className="text-muted-custom">
                  Format: {item.format.join(", ")}
                </small>
              )}
            </Stack>

          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
}