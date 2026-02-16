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

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
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
    // INTERNAL_API_URL: Docker 컨테이너 간 내부 통신용 (서버사이드 전용)
    // NEXT_PUBLIC_API_URL: 클라이언트/서버 공용 폴백
    const apiBase = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1").replace(/\/api\/v1\/?$/, "");
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
