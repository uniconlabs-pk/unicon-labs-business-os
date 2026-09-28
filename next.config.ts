import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore type checking errors during production builds on Vercel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;