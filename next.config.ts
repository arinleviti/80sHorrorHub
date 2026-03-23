import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   images: {
    domains: ['lh3.googleusercontent.com',"image.tmdb.org", 'i.ytimg.com','i.ebayimg.com', 'example.com','via.placeholder.com','ik.imagekit.io','i.discogs.com','image-cdn-ak.spotifycdn.com','i.scdn.co', ], // ✅ allow TMDB, YouTube images
  },
};

export default nextConfig;
