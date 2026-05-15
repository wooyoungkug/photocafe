/**
 * Photocafe Upload Proxy Worker
 *
 * 흐름:
 *   브라우저 (서울)
 *     → Cloudflare 서울 edge (RTT 1~5ms, HTTP/2 멀티플렉싱)
 *       → Worker (이 코드)
 *         → R2 binding (Cloudflare 내부망, 인터넷 미경유)
 *           → R2 저장소
 *
 * 엔드포인트:
 *   PUT  /parts?key=<urlencoded>&uploadId=<id>&partNumber=<N>&exp=<unixSec>&sig=<base64url>
 *   OPTIONS /parts   (CORS preflight)
 *
 * 인증:
 *   API 서버가 HMAC-SHA256 서명한 URL 만 수락한다.
 *   payload = `${key}|${uploadId}|${partNumber}|${exp}`
 *   sig = base64url( HMAC_SHA256(UPLOAD_SECRET, payload) )
 *
 * 응답:
 *   200 OK + `ETag: "<r2-etag>"` 헤더 (S3 와이어 형식 호환)
 */

export interface Env {
  PHOTOCAFE_BUCKET: R2Bucket;
  UPLOAD_SECRET: string;
  ALLOWED_ORIGINS?: string;
}

interface CorsContext {
  origin: string | null;
  allowed: string[];
}

function parseAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS || "https://photocafe.co.kr";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildCorsHeaders(ctx: CorsContext): Record<string, string> {
  const allow = ctx.origin && ctx.allowed.includes(ctx.origin) ? ctx.origin : ctx.allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-amz-content-sha256, x-amz-date",
    "Access-Control-Expose-Headers": "ETag, etag",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function base64urlDecodeToBytes(s: string): Uint8Array {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifySignature(secret: string, payload: string, sigB64u: string): Promise<boolean> {
  if (!secret) return false;
  const enc = new TextEncoder();
  let provided: Uint8Array;
  try {
    provided = base64urlDecodeToBytes(sigB64u);
  } catch {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return timingSafeEqual(expected, provided);
}

function jsonError(status: number, message: string, cors: Record<string, string>): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = buildCorsHeaders({
      origin: request.headers.get("Origin"),
      allowed: parseAllowedOrigins(env),
    });

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return new Response("ok", { status: 200, headers: cors });
    }

    if (url.pathname !== "/parts") {
      return jsonError(404, "Not Found", cors);
    }

    if (request.method !== "PUT") {
      return jsonError(405, "Method Not Allowed", cors);
    }

    const key = url.searchParams.get("key");
    const uploadId = url.searchParams.get("uploadId");
    const partNumberStr = url.searchParams.get("partNumber");
    const expStr = url.searchParams.get("exp");
    const sig = url.searchParams.get("sig");

    if (!key || !uploadId || !partNumberStr || !expStr || !sig) {
      return jsonError(400, "Missing required query params (key, uploadId, partNumber, exp, sig)", cors);
    }

    const partNumber = Number.parseInt(partNumberStr, 10);
    if (!Number.isFinite(partNumber) || partNumber < 1 || partNumber > 10000) {
      return jsonError(400, "Invalid partNumber", cors);
    }

    const exp = Number.parseInt(expStr, 10);
    if (!Number.isFinite(exp)) {
      return jsonError(400, "Invalid exp", cors);
    }
    if (exp * 1000 < Date.now()) {
      return jsonError(403, "Expired", cors);
    }

    if (key.includes("..") || key.includes("\0")) {
      return jsonError(400, "Invalid key", cors);
    }

    const payload = `${key}|${uploadId}|${partNumber}|${exp}`;
    const sigOk = await verifySignature(env.UPLOAD_SECRET, payload, sig);
    if (!sigOk) {
      return jsonError(403, "Invalid signature", cors);
    }

    if (!request.body) {
      return jsonError(400, "Missing request body", cors);
    }

    try {
      const mu = env.PHOTOCAFE_BUCKET.resumeMultipartUpload(key, uploadId);
      const uploaded = await mu.uploadPart(partNumber, request.body);
      const raw = uploaded.etag || "";
      const etagHeader = raw.startsWith('"') ? raw : `"${raw.replace(/^"|"$/g, "")}"`;
      return new Response(null, {
        status: 200,
        headers: {
          ...cors,
          ETag: etagHeader,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonError(500, `uploadPart failed: ${msg}`, cors);
    }
  },
} satisfies ExportedHandler<Env>;
