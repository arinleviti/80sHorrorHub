"use client";

import React, { useEffect, useState } from "react";
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
  castMembers?: { actor: { name: string }; character: string }[];
}

interface RedditChild {
  data: {
    id: string;
    title: string;
    author: string;
    subreddit: string;
    ups: number;
    permalink: string;
  };
}

/* ---------------- CONFIG ---------------- */

const allowedSubreddits = ["horror", "80shorror", "movies"];
const junkWords = /meme|shitpost|gif|funny|bot|disney/i;

const fuzzy = (str: string): string =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

/* ---------------- SCORING (UNCHANGED) ---------------- */

const scorePost = (post: RedditPost, movie: MovieForReddit): number => {
  let score = 0;
  const titleLower = post.title.toLowerCase();
  const movieYear = movie.releaseDate?.slice(0, 4);

  if (junkWords.test(titleLower)) return -100;

  if (fuzzy(post.title).includes(fuzzy(movie.title))) score += 3;

  if (movieYear && titleLower.includes(movieYear)) score += 2;

  if (movie.castMembers) {
    const topActors = movie.castMembers
      .slice(0, 5)
      .map(c => c.actor.name.toLowerCase());

    if (topActors.some(a => titleLower.includes(a))) score += 2;

    const topChars = movie.castMembers
      .slice(0, 5)
      .map(c => c.character.toLowerCase());

    if (topChars.some(c => titleLower.includes(c))) score += 2;
  }

  if (post.upvotes < 2) return -100;

  return score;
};

/* ---------------- FETCH (BROWSER ONLY) ---------------- */

const fetchRedditPosts = async (
  movie: MovieForReddit,
  limit: number
): Promise<RedditPost[]> => {
  console.log("[Reddit] CLIENT FETCH START", movie.title);

  try {
    const requests = allowedSubreddits.map(async subreddit => {
      const url = `https://api.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(movie.title)}&restrict_sr=1&sort=relevance&limit=15`;

      try {
        console.log(`[Reddit] FETCHING r/${subreddit}...`);
        const res = await fetch(url);

        if (!res.ok) {
          console.warn(`[Reddit] FAILED r/${subreddit}`);
          return [];
        }

        const json = await res.json();

        console.log(
          `[Reddit] SUCCESS r/${subreddit}`,
          json?.data?.children?.length ?? 0
        );

        return json?.data?.children ?? [];
      } catch (err) {
        console.warn(`[Reddit] ERROR r/${subreddit}`, err);
        return [];
      }
    });

    const results = await Promise.allSettled(requests);

    const allChildren: RedditChild[] = results
      .flatMap(r => (r.status === "fulfilled" ? r.value : []))
      .flat();

    /* ---------------- TRANSFORM ---------------- */

    const allPosts: RedditPost[] = allChildren.map(child => ({
      id: child.data.id,
      title: child.data.title,
      author: child.data.author,
      subreddit: child.data.subreddit,
      upvotes: child.data.ups || 0,
      url: `https://reddit.com${child.data.permalink}`,
    }));

    /* ---------------- SCORE + FILTER ---------------- */

    const scored = allPosts
      .map(post => ({
        post,
        score: scorePost(post, movie),
      }))
      .filter(({ score }) => score > 0);

    /* ---------------- DEDUPE ---------------- */

    const unique = Array.from(
      new Map(scored.map(s => [s.post.id, s])).values()
    );

    /* ---------------- SORT ---------------- */

    unique.sort(
      (a, b) =>
        b.score - a.score || b.post.upvotes - a.post.upvotes
    );

    console.log("[Reddit] FINAL", {
      raw: allChildren.length,
      posts: allPosts.length,
      scored: scored.length,
    });

    return unique.slice(0, limit).map(u => u.post);
  } catch (err) {
    console.warn("[Reddit] GLOBAL ERROR", err);
    return [];
  }
};

/* ---------------- COMPONENT ---------------- */

interface RedditFeedProps {
  movie: MovieForReddit;
  limit?: number;
}

export const RedditFeed = ({ movie, limit = 5 }: RedditFeedProps) => {
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      setLoading(true);

      try {
        const data = await fetchRedditPosts(movie, limit);
        if (!cancelled) setPosts(data);
      } catch (err) {
        console.error("[RedditFeed]", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, [movie.title, movie.releaseDate, limit]); // 👈 safer deps

  if (loading) return null;
  if (!posts.length) return null;

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
};