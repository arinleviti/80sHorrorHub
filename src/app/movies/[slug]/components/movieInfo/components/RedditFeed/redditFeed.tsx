"use client";

import React, { useEffect, useState } from "react";
import { Card, ListGroup, Stack } from "react-bootstrap";
import { RedditPost, MovieForReddit, fetchRedditPosts } from "../../../../../../services/reddit";

/* interface MovieInput {
  title: string;
  releaseDate?: string | null;
  castMembers?: { actor: { name: string } }[];
} */

interface RedditFeedProps {
  movie: MovieForReddit;
  limit?: number;
}

export const RedditFeed = ({ movie, limit = 5 }: RedditFeedProps) => {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);

 /*  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/reddit?title=${encodeURIComponent(movie.title)}&limit=${limit}`
        );
        if (!res.ok) throw new Error("Failed to fetch Reddit posts");

        const data: RedditPost[] = await res.json();
        setPosts(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load Reddit posts.");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [movie.title,limit]); */

// Fetching from the client directly, no API route, to avoid CORS and add better logging and control
useEffect(() => {

   let cancelled = false;
    const loadPosts = async () => {     
      try {
        const data = await fetchRedditPosts(movie, limit);
         if (!cancelled) {
          setPosts(data);
        }
      } catch (err) {
        console.error(err);
        console.warn("[RedditFeed] Silent failure:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPosts();
    return () => {
      cancelled = true;
    };
  },  [movie, limit]);

  // 🔥 KEY CHANGE: render NOTHING if no data
  if (loading) return null;
  if (!posts || posts.length === 0) return null;

  return (
    <Card className="contributioncard my-3">
      <Card.Header className="heading-secondary">Reddit Discussions</Card.Header>

      <ListGroup variant="flush">
        {posts.map((post) => (
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
};