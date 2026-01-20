const fs = require('fs');
const path = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // PRICE_GROUP_STYLES dot 값 수정
  if (line.includes("dot: '?")) {
    if (line.includes('green:')) {
      lines[i] = "  green: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700', label: '그룹1', dot: '🟢' },";
    } else if (line.includes('blue:')) {
      lines[i] = "  blue: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', label: '그룹2', dot: '🔵' },";
    } else if (line.includes('yellow:')) {
      lines[i] = "  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', label: '그룹3', dot: '🟡' },";
    } else if (line.includes('red:')) {
      lines[i] = "  red: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: '그룹4', dot: '🔴' },";
    } else if (line.includes('purple:')) {
      lines[i] = "  purple: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', label: '그룹5', dot: '🟣' },";
    } else if (line.includes('none:')) {
      lines[i] = "  none: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', label: '미지정', dot: '⚪' },";
    }
  }

  // COLOR_GROUP_STYLES label 수정
  if (line.includes("label: '?") && line.includes('광택지')) {
    lines[i] = "  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: '🟢 광택지' },";
  }
  if (line.includes("label: '?") && line.includes('무광지')) {
    lines[i] = "  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', label: '🔵 무광지' },";
  }
  if (line.includes("label: '?") && line.includes('특수지')) {
    lines[i] = "  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: '🟡 특수지' },";
  }

  // 주석 수정
  if (line.includes('// ?') && line.includes('컬러 그룹')) {
    lines[i] = '// 용지 컬러 그룹 스타일 (기존 호환)';
  }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Styles fixed');
