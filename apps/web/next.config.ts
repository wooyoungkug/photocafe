import type { NextConfig } from "next";
import { join } from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,

  // Cache directory
  distDir: ".next",

  // Performance optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header
  generateEtags: true, // Generate ETags for better caching

  // Development mode optimizations
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // When Next.js infers a workspace root (monorepo), it may warn about multiple lockfiles.
  outputFileTracingRoot: join(__dirname, "..", ".."),

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },

  // Compiler optimizations
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Webpack configuration for cache optimization
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // Optimize filesystem cache for Windows
      config.cache = {
        type: "filesystem",
        cacheDirectory: join(__dirname, ".next/cache/webpack"),
        // Use fixed version to prevent unnecessary restarts
        version: process.env.NODE_ENV || "development",
      };
    }
    return config;
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
