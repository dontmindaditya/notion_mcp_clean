import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "../.."),
  },

  /**
   * Rewrite rules to proxy API requests to the backend server.
   * This ensures:
   *   - Frontend can use relative URLs (/api/*)
   *   - Session cookies work correctly (same origin)
   *   - CORS is not needed between frontend and backend
   *
   * All backend routes are proxied through /api/*:
   *   /api/auth/notion/connect -> http://localhost:4000/auth/notion/connect
   *   /api/notion/status       -> http://localhost:4000/notion/status
   *   etc.
   */
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000";

    return [
      {
        source: "/api/auth/:path*",
        destination: `${backendUrl}/auth/:path*`,
      },
      {
        source: "/api/notion/:path*",
        destination: `${backendUrl}/notion/:path*`,
      },
      {
        source: "/api/health",
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;

