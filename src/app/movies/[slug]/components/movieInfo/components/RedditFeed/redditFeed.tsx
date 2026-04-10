"use client";

import React, { useEffect, useState } from "react";
import { Card, ListGroup, Spinner, Alert, Stack } from "react-bootstrap";
import { fetchRedditPosts, RedditPost, MovieForReddit } from "../../../../../../services/reddit";

/* interface MovieInput {
  title: string;
  releaseDate?: string | null;
  castMembers?: { actor: { name: string } }[];
} */

interface RedditFeedProps {
  movie: MovieForReddit;
  limit?: number;
}

export const RedditFeed: React.FC<RedditFeedProps> = ({ movie, limit = 5 }) => {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* useEffect(() => {
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
  }, [movie.title, movie.releaseDate, movie.castMembers, limit]); */

useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchRedditPosts(movie, limit);
        setPosts(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load Reddit posts.");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  },  [movie, limit]);

  if (loading)
    return (
      <div className="text-center my-3">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading Reddit posts...</span>
        </Spinner>
      </div>
    );

  if (error) return <Alert variant="danger">{error}</Alert>;
  if (posts.length === 0)
    return <Alert variant="info">No relevant Reddit discussions found.</Alert>;

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