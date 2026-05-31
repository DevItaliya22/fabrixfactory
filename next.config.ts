import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-b4f23927ca0f40fd845118e82f854d7f.r2.dev",
      },
    ],
  },
};

export default nextConfig;
