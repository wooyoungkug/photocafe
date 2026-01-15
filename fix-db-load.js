const fs = require('fs');
const filePath = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 2. DB 로드 부분 수정
content = content.replace(
  /\/\/ prices 배열에서 구간별 Nup\+면당가격 변환 \(nup_page_range용\)\n\s+const nupPageRangesFromDB = setting\.pricingType === "nup_page_range"\n\s+\? prices\n\s+\.filter\(\(p: any\) => p\.specificationId\)\n\s+\.map\(\(p: any\) => \(\{\n\s+specificationId: p\.specificationId,\n\s+basePages: Number\(p\.basePages\) \|\| 30,\n\s+basePrice: Number\(p\.basePrice\) \|\| Number\(p\.price\) \|\| 0,\n\s+pricePerPage: Number\(p\.pricePerPage\) \|\| 0,\n\s+\}\)\)\n\s+: \[\];/,
  `// prices 배열에서 구간별 Nup+면당가격 변환 (nup_page_range용)
      const nupPageRangesFromDB = setting.pricingType === "nup_page_range"
        ? prices
            .filter((p: any) => p.specificationId)
            .map((p: any) => ({
              specificationId: p.specificationId,
              pricePerPage: Number(p.pricePerPage) || 0,
              rangePrices: p.rangePrices || {},
            }))
        : [];

      // 페이지 구간 설정 로드
      const pageRangesFromDB = (setting as any).pageRanges || [20, 30, 40, 50, 60];`
);

// 3. setSettingForm에 pageRanges 추가
content = content.replace(
  /nupPageRanges: nupPageRangesFromDB,\n\s+\}\);/,
  `nupPageRanges: nupPageRangesFromDB,
        pageRanges: pageRangesFromDB,
      });`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Step 2: DB load logic updated');
