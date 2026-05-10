import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.API_BASE_URL ||
  "http://localhost:3001";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};
export default nextConfig;
