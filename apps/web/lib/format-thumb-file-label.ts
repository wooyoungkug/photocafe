/**
 * 썸네일·작업지 등에서 파일명을 짧게 표시할 때 사용.
 * 예: `01.002.jpg` → `01`, `12_foo.jpg`의 앞부분 `12` → `12`
 * `_`가 있으면 `_` 앞 구간만 보고, 그 안에서 `숫자.` 또는 `숫자_` 또는 선행 숫자를 추출.
 */
export function formatThumbFileLabel(fileName: string): string {
  const raw = fileName.trim();
  if (!raw) return '';
  const head = raw.includes('_') ? raw.slice(0, raw.indexOf('_')) : raw;
  const beforeDot = head.match(/^(\d+)\./);
  if (beforeDot) return beforeDot[1] ?? '';
  const beforeUnder = head.match(/^(\d+)_/);
  if (beforeUnder) return beforeUnder[1] ?? '';
  const lead = head.match(/^(\d+)/);
  if (lead) return lead[1] ?? '';
  return head;
}
