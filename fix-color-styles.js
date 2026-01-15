const fs = require('fs');
const path = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // COLOR_GROUP_STYLES 수정
  if (line.includes("yellow:") && line.includes("label: '?") && line.includes("특수")) {
    lines[i] = "  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: '🟡 특수지' },";
  }
  if (line.includes("red:") && line.includes("label: '?") && line.includes("프리미엄") || line.includes("리미엄")) {
    lines[i] = "  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: '🔴 프리미엄' },";
  }
  if (line.includes("purple:") && line.includes("label: '?") && line.includes("캔버")) {
    lines[i] = "  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', label: '🟣 캔버스' },";
  }
  if (line.includes("default:") && line.includes("label: '?") && line.includes("기")) {
    lines[i] = "  default: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', label: '⚪ 기타' },";
  }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Color styles fixed');
