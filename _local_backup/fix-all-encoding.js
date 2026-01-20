const fs = require('fs');
const path = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 모든 인코딩 깨진 주석/문자열 수정
const replacements = [
  // 주석들
  [/\/\/ ?�디고[^\n]+계산[^\n]+/, '// 인디고 단가 계산 함수'],
  [/\/\/ ?�디고[^\n]+315x467mm[^\n]+/, '// 인디고 규격: 315x467mm (연지 4절 기준)'],
  [/\/\/ 연지[^\n]+500매[^\n]+/, '// 연지 1연 = 500매, 4절이므로 500 * 4 = 2000장'],
  [/\/\/ ?�체 ?��?[^\n]+/, '// 업체 타입 라벨'],
  [/outsourced: "?�주"/, 'outsourced: "외주"'],
  [/\/\/ ?�쇄방식[^\n]+/, '// 인쇄방식(용도) 라벨'],
  [/indigo: "?�디고",/, 'indigo: "인디고",'],
  [/inkjet: "?�크젯",/, 'inkjet: "잉크젯",'],
  [/album: "?�범",/, 'album: "앨범",'],
  [/frame: "?�자",/, 'frame: "액자",'],
  [/\/\/ ?��? 그룹 컬러 ?�서[^\n]+/, '// 단가 그룹 컬러 순서 (자동 배정)'],
  [/\/\/ ?��? 그룹 컬러 스타일[^\n]*/, '// 단가 그룹 컬러 스타일'],
];

replacements.forEach(([pattern, replacement]) => {
  content = content.replace(pattern, replacement);
});

fs.writeFileSync(path, content);
console.log('All encoding issues fixed');
