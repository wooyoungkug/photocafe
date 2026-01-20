const fs = require('fs');
const path = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 인코딩 깨진 PRICING_TYPE_LABELS 수정
content = content.replace(
  /\/\/ 가[^\n]+계산 방식[^\n]+\nconst PRICING_TYPE_LABELS: Record<PricingType, string> = \{[^}]+\};/,
  `// 가격계산 방식 타입 라벨
const PRICING_TYPE_LABELS: Record<PricingType, string> = {
  paper_output_spec: "[1.출력전용] 용지별출력단가/규격별면",
  indigo_spec: "[1.출력전용] 인디고규격별 단가",
  nup_page_range: "[2.제본전용] 구간별 Nup+면당가격",
  binding_page: "[2.제본전용] 제본 페이지당",
  finishing_qty: "[3.후가공] 수량당",
  finishing_page: "[3.후가공] 페이지당",
  per_sheet: "장당가격(규격입력안함)",
};`
);

fs.writeFileSync(path, content);
console.log('Encoding fixed for PRICING_TYPE_LABELS');
