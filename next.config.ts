import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully client-side app (Firebase Web SDK) -> export as static HTML for Cloudflare Pages.
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
