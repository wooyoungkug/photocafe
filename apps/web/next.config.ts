import type { NextConfig } from "next";
import { join } from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";
const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  // unsafe-eval: Next.js 번들링 요구사항; unsafe-inline: 인라인 이벤트 핸들러
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  // localhost:9199 = 로컬 프린트 에이전트 (PC별 설치). 운영에서도 브라우저가 자기 PC의 에이전트로 직접 호출해야 하므로 허용.
  isDev
    ? "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* https: wss:"
    : "connect-src 'self' https: wss: http://localhost:9199 http://127.0.0.1:9199",
  "worker-src 'self' blob:",
  "media-src 'self' blob: https:",
  "form-action 'self'",
].join("; ");

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
    remotePatterns: [
      // Backblaze B2 + Cloudflare CDN (운영)
      {
        protocol: "https",
        hostname: "cdn.photocafe.co.kr",
        pathname: "/**",
      },
      // Backblaze B2 직접 (백업/임시)
      {
        protocol: "https",
        hostname: "f005.backblazeb2.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.backblazeb2.com",
        pathname: "/**",
      },
      // Railway API (프리사인드 URL/이미지 서빙)
      {
        protocol: "https",
        hostname: "api.photocafe.co.kr",
        pathname: "/**",
      },
      // 카카오 프로필 이미지 (소셜 로그인)
      {
        protocol: "https",
        hostname: "k.kakaocdn.net",
        pathname: "/**",
      },
      // 구글 프로필 이미지
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      // 네이버 프로필 이미지
      {
        protocol: "https",
        hostname: "phinf.pstatic.net",
        pathname: "/**",
      },
    ],
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
        destination: `${apiBase}/api/v1/upload/serve/:path*`,
      },
      {
        source: "/upload/:path*",
        destination: `${apiBase}/api/v1/upload/serve/:path*`,
      },
    ];
  },

  // 전역 보안 헤더 (Vercel/Cloudflare 와 충돌 없도록 보수적 설정)
  // CSP 는 별도로 적용 (의도치 않은 차단 방지를 위해 본 단계에서는 미포함)
  async headers() {
    const securityHeaders = [
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: [
          "accelerometer=()",
          "autoplay=()",
          "camera=()",
          "display-capture=()",
          "encrypted-media=()",
          "fullscreen=(self)",
          "geolocation=()",
          "gyroscope=()",
          "magnetometer=()",
          "microphone=()",
          "midi=()",
          "payment=()",
          "picture-in-picture=()",
          "publickey-credentials-get=()",
          "screen-wake-lock=()",
          "sync-xhr=()",
          "usb=()",
          "xr-spatial-tracking=()",
        ].join(", "),
      },
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },
      {
        key: "Cross-Origin-Resource-Policy",
        value: "same-site",
      },
      {
        key: "Content-Security-Policy",
        value: cspDirectives,
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Service Worker 전체 origin 제어 허용
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
