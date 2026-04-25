"use client";

import { Card, ListGroup, Stack } from "react-bootstrap";

/* ---------------- TYPES ---------------- */

export interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  upvotes: number;
  url: string;
}

export interface MovieForReddit {
  title: string;
  releaseDate?: string | null;
}

interface Props {
  posts: RedditPost[];
}

/* ---------------- UI ONLY ---------------- */

export default function RedditFeed({ posts }: Props) {
  if (!posts?.length) return null;

  return (
    <Card className="contributioncard my-3">
      <Card.Header className="heading-secondary">
        Reddit Discussions
      </Card.Header>

      <ListGroup variant="flush">
        {posts.map(post => (
          <ListGroup.Item key={post.id}>
            <Stack gap={1}>
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent fw-bold text-decoration-none"
              >
                {post.title}
              </a>

              <small className="text-content-muted">
                u/{post.author} · r/{post.subreddit} · {post.upvotes} upvotes
              </small>
            </Stack>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Card>
  );
}