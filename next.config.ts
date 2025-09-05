import type { NextConfig } from "next";

const nextConfig: NextConfig = {
   images: {
    domains: ['image.tmdb.org', 'i.ytimg.com','i.ebayimg.com', 'example.com','via.placeholder.com'], // ✅ allow TMDB, YouTube images
  },
};

export default nextConfig;
