import type { NextConfig } from "next";

const apiServerUrl = process.env.API_SERVER_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiServerUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
