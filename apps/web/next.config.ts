import type { NextConfig } from "next";
import { join } from 'path';

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Performance optimizations
  // `swcMinify` is no longer a valid top-level Next config key in newer Next versions
  // (Next uses the SWC toolchain by default). Remove the option to avoid invalid-config warnings.
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  generateEtags: true, // Generate ETags for better caching

  // When Next.js infers a workspace root (monorepo), it may warn about multiple lockfiles.
  // Set `outputFileTracingRoot` to the repository root to silence the warning and ensure
  // standalone output traces are resolved from the workspace root.
  outputFileTracingRoot: join(__dirname, '..', '..'),

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;

