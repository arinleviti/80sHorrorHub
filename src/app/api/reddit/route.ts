import { NextRequest, NextResponse } from "next/server";
import { fetchRedditPosts } from "@/app/services/reddit";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  const limitParam = req.nextUrl.searchParams.get("limit");

  if (!title) {
    return NextResponse.json({ error: "Missing title" }, { status: 400 });
  }

  const limit = limitParam ? parseInt(limitParam) : 5;

  try {
    const posts = await fetchRedditPosts({ title }, limit);

    return NextResponse.json(posts);
  } catch (err) {
    console.error("Reddit API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch Reddit posts" },
      { status: 500 }
    );
  }
}