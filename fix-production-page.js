const fs = require('fs');
const path = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. DB 로드 부분 수정
content = content.replace(
  /\/\/ prices [^\n]+nup_page_range[^\n]*\n\s+const nupPageRangesFromDB = setting\.pricingType === "nup_page_range"\n\s+\? prices\n\s+\.filter\(\(p: any\) => p\.specificationId\)\n\s+\.map\(\(p: any\) => \(\{\n\s+specificationId: p\.specificationId,\n\s+basePages:[^\}]+\}\)\)\n\s+: \[\];/,
  `// prices 배열에서 구간별 Nup+면당가격 변환 (nup_page_range)
      const nupPageRangesFromDB = setting.pricingType === "nup_page_range"
        ? prices
            .filter((p) => p.specificationId)
            .map((p) => ({
              specificationId: p.specificationId,
              pricePerPage: Number(p.pricePerPage) || 0,
              rangePrices: p.rangePrices || {},
            }))
        : [];

      // 페이지 구간 설정 로드
      const pageRangesFromDB = (setting).pageRanges || [20, 30, 40, 50, 60];`
);

// 2. setSettingForm에 pageRanges 추가
content = content.replace(
  /nupPageRanges: nupPageRangesFromDB,\n\s+\}\);/,
  `nupPageRanges: nupPageRangesFromDB,
        pageRanges: pageRangesFromDB,
      });`
);

// 3. 초기화 부분에 pageRanges 추가 - nupPageRanges: [], 뒤에
content = content.replace(
  /nupPageRanges: \[\],\n\s+\}\);[\s\S]*?setIsSettingDialogOpen/,
  (match) => {
    if (!match.includes('pageRanges:')) {
      return match.replace('nupPageRanges: [],', 'nupPageRanges: [],\n        pageRanges: [20, 30, 40, 50, 60],');
    }
    return match;
  }
);

fs.writeFileSync(path, content);
console.log('DB load and init parts updated');
