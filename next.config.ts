import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: process.env.NEXT_ADMIN_ORIGIN
    ? [new URL(process.env.NEXT_ADMIN_ORIGIN).hostname]
    : [],
};

export default nextConfig;
