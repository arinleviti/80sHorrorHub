import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   images: {
    domains: ['image.tmdb.org', 'i.ytimg.com','i.ebayimg.com', 'example.com','via.placeholder.com','ik.imagekit.io','i.discogs.com'], // ✅ allow TMDB, YouTube images
  },
};

export default nextConfig;
