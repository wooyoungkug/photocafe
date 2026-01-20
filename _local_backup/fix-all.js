const fs = require('fs');
const path = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// 1. 1229-1239 라인 (DB 로드 부분) 수정
const dbLoadStart = lines.findIndex(l => l.includes('const nupPageRangesFromDB = setting.pricingType'));
if (dbLoadStart !== -1) {
  // 해당 블록 끝 찾기 (: [];)
  let dbLoadEnd = dbLoadStart;
  for (let i = dbLoadStart; i < lines.length; i++) {
    if (lines[i].includes(': [];')) {
      dbLoadEnd = i;
      break;
    }
  }

  const newDbLoad = [
    '      const nupPageRangesFromDB = setting.pricingType === "nup_page_range"',
    '        ? prices',
    '            .filter((p: any) => p.specificationId)',
    '            .map((p: any) => ({',
    '              specificationId: p.specificationId,',
    '              pricePerPage: Number(p.pricePerPage) || 0,',
    '              rangePrices: p.rangePrices || {},',
    '            }))',
    '        : [];',
    '',
    '      // 페이지 구간 설정 로드',
    '      const pageRangesFromDB = (setting as any).pageRanges || [20, 30, 40, 50, 60];'
  ];

  lines.splice(dbLoadStart, dbLoadEnd - dbLoadStart + 1, ...newDbLoad);
  console.log('1. DB load part updated');
}

// 다시 파일 내용 갱신
let content = lines.join('\n');

// 2. setSettingForm에 pageRanges 추가
content = content.replace(
  /nupPageRanges: nupPageRangesFromDB,\n(\s+)\}\);/,
  'nupPageRanges: nupPageRangesFromDB,\n$1pageRanges: pageRangesFromDB,\n$1});'
);
console.log('2. setSettingForm pageRanges added');

// 3. 초기화 부분 찾아서 pageRanges 추가
content = content.replace(
  /nupPageRanges: \[\],\n(\s+)}\);(\s+)setIsSettingDialogOpen/,
  'nupPageRanges: [],\n$1pageRanges: [20, 30, 40, 50, 60],\n$1});$2setIsSettingDialogOpen'
);
console.log('3. Init pageRanges added');

fs.writeFileSync(path, content);
console.log('All done!');
