const fs = require('fs');
const filePath = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. 데이터 구조 변경
content = content.replace(
  /\/\/ \[2\.제본전용\] 구간별 Nup\+면당가격 필드\n\s+nupPageRanges: \[\] as Array<\{\n\s+specificationId: string;[^}]+\}>,\n\s+\}\);/,
  `// [2.제본전용] 구간별 Nup+면당가격 필드
    nupPageRanges: [] as Array<{
      specificationId: string;  // 규격 ID (Nup 정보 연동)
      pricePerPage: number;     // 1p당 추가 가격 (예: 500원)
      rangePrices: Record<number, number>;  // 구간별 가격 {20: 35000, 30: 40000, ...}
    }>,
    // 페이지 구간 설정 (전역)
    pageRanges: [20, 30, 40, 50, 60] as number[],
  });`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Step 1: Data structure updated');
