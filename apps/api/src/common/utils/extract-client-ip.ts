import { Request } from 'express';

/**
 * 운영 클라이언트 IP 추출 (Cloudflare/Vercel/리버스 프록시 환경 대응).
 *
 * 운영 흐름: 사용자 → Cloudflare(Proxied) → Railway(Express, trust proxy=1)
 *   - `req.ip` 는 trust proxy 1 설정상 X-Forwarded-For 의 마지막 hop 을 반환 →
 *     보통 Cloudflare edge 의 IP가 잡혀 사용자 IP 식별 불가.
 *   - Cloudflare 가 직접 set 하는 `cf-connecting-ip` 가 진짜 클라이언트 IP.
 *     (Cloudflare 우회 직접 호출 시에는 헤더 부재 → 다른 fallback 사용)
 *
 * 우선순위:
 *   1. cf-connecting-ip            — Cloudflare 가 직접 set, 가장 신뢰
 *   2. x-vercel-forwarded-for      — Vercel SSR 프록시 경유 시
 *   3. x-forwarded-for (가장 왼쪽) — 일반 reverse proxy 체인의 원본 IP
 *   4. req.ip                       — Express trust proxy 결과
 *   5. req.socket.remoteAddress    — 직접 연결
 *
 * 반환값은 IPv4-mapped IPv6 (::ffff:1.2.3.4) 정규화 후 trim 된 단일 IP 문자열.
 *
 * 보안 노트: cf-connecting-ip 등 헤더는 클라이언트가 위조 가능하지만, 운영은
 *   Cloudflare 가 모든 트래픽을 강제 통과(Proxied)시키므로 원본 헤더는 덮어써진다.
 *   레거시 NAS 직접 노출 등 Cloudflare 우회 경로가 있으면 같은 헤더를 신뢰하면 안 된다.
 */
export function extractClientIp(req: Request): string | null {
  const headerVal = (key: string): string => {
    const v = req.headers[key];
    if (Array.isArray(v)) return (v[0] || '').trim();
    return (v || '').toString().trim();
  };

  const cf = headerVal('cf-connecting-ip');
  if (cf) return normalizeIp(cf);

  const vercelXff = headerVal('x-vercel-forwarded-for');
  if (vercelXff) return normalizeIp(vercelXff.split(',')[0]);

  const xff = headerVal('x-forwarded-for');
  if (xff) return normalizeIp(xff.split(',')[0]);

  if (req.ip) return normalizeIp(req.ip);

  const remote = req.socket?.remoteAddress;
  return remote ? normalizeIp(remote) : null;
}

function normalizeIp(raw: string): string {
  return raw.replace(/^::ffff:/, '').trim();
}
