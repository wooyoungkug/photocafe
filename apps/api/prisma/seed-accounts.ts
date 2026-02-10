import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 표준 계정과목 시드 데이터
 *
 * 인쇄업(포토북/앨범) ERP에 맞춘 한국 표준 계정과목표.
 * upsert를 사용하므로 여러 번 실행해도 안전합니다.
 *
 * 실행: npx ts-node apps/api/prisma/seed-accounts.ts
 */

// AccountType enum은 Prisma 스키마에 정의되어 있으므로 문자열 리터럴 사용
type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

interface AccountSeed {
  code: string;
  name: string;
  nameEn: string;
  type: AccountType;
  level: number;
  parentCode?: string; // 시딩 시 parentId 조회용
  description?: string;
  sortOrder: number;
}

// ============================================================
//  표준 계정과목 정의
// ============================================================

const accounts: AccountSeed[] = [
  // ==================== 자산 계정 (ASSET) ====================
  {
    code: '101',
    name: '현금',
    nameEn: 'Cash',
    type: 'ASSET',
    level: 1,
    description: '현금 및 현금성 자산',
    sortOrder: 101,
  },
  {
    code: '102',
    name: '보통예금',
    nameEn: 'Bank Deposits',
    type: 'ASSET',
    level: 1,
    description: '은행 보통예금 계좌 (복수 계좌 지원)',
    sortOrder: 102,
  },
  {
    code: '103',
    name: '정기예금',
    nameEn: 'Time Deposits',
    type: 'ASSET',
    level: 1,
    description: '정기예금 및 정기적금',
    sortOrder: 103,
  },
  {
    code: '108',
    name: '받을어음',
    nameEn: 'Notes Receivable',
    type: 'ASSET',
    level: 1,
    description: '받을어음 (약속어음, 환어음)',
    sortOrder: 108,
  },
  {
    code: '110',
    name: '외상매출금',
    nameEn: 'Accounts Receivable',
    type: 'ASSET',
    level: 1,
    description: '거래처별 외상매출금 (Trade Receivables)',
    sortOrder: 110,
  },
  {
    code: '111',
    name: '미수금',
    nameEn: 'Other Receivables',
    type: 'ASSET',
    level: 1,
    description: '영업 외 미수금',
    sortOrder: 111,
  },
  {
    code: '112',
    name: '선급금',
    nameEn: 'Advance Payments',
    type: 'ASSET',
    level: 1,
    description: '거래처에 선지급한 금액',
    sortOrder: 112,
  },
  {
    code: '113',
    name: '선급비용',
    nameEn: 'Prepaid Expenses',
    type: 'ASSET',
    level: 1,
    description: '미래 기간에 대한 선급 비용',
    sortOrder: 113,
  },
  {
    code: '120',
    name: '원재료',
    nameEn: 'Raw Materials',
    type: 'ASSET',
    level: 1,
    description: '용지, 잉크, 표지재 등 생산용 원재료',
    sortOrder: 120,
  },
  {
    code: '121',
    name: '재공품',
    nameEn: 'Work in Progress',
    type: 'ASSET',
    level: 1,
    description: '제작 중인 앨범, 인쇄물 등 미완성 제품',
    sortOrder: 121,
  },
  {
    code: '122',
    name: '제품',
    nameEn: 'Finished Goods',
    type: 'ASSET',
    level: 1,
    description: '완성된 앨범, 액자 등 판매 가능 제품',
    sortOrder: 122,
  },
  {
    code: '123',
    name: '상품',
    nameEn: 'Merchandise',
    type: 'ASSET',
    level: 1,
    description: '외부 구매 유통 상품',
    sortOrder: 123,
  },
  {
    code: '124',
    name: '저장품',
    nameEn: 'Supplies',
    type: 'ASSET',
    level: 1,
    description: '소모성 부자재 (포장재, 접착제 등)',
    sortOrder: 124,
  },
  {
    code: '130',
    name: '비품',
    nameEn: 'Furniture & Fixtures',
    type: 'ASSET',
    level: 1,
    description: '사무용 가구, 기기 등 비품',
    sortOrder: 130,
  },
  {
    code: '131',
    name: '기계장치',
    nameEn: 'Machinery',
    type: 'ASSET',
    level: 1,
    description: 'HP Indigo, 제본기, 코팅기 등 생산 설비',
    sortOrder: 131,
  },
  {
    code: '132',
    name: '차량운반구',
    nameEn: 'Vehicles',
    type: 'ASSET',
    level: 1,
    description: '배송 차량 및 운반 장비',
    sortOrder: 132,
  },
  {
    code: '139',
    name: '감가상각누계액',
    nameEn: 'Accumulated Depreciation',
    type: 'ASSET',
    level: 1,
    description: '유형자산 감가상각누계액 (차감 계정)',
    sortOrder: 139,
  },

  // ==================== 부채 계정 (LIABILITY) ====================
  {
    code: '201',
    name: '외상매입금',
    nameEn: 'Accounts Payable',
    type: 'LIABILITY',
    level: 1,
    description: '거래처별 외상매입금 (Trade Payables)',
    sortOrder: 201,
  },
  {
    code: '202',
    name: '미지급금',
    nameEn: 'Other Payables',
    type: 'LIABILITY',
    level: 1,
    description: '영업 외 미지급금',
    sortOrder: 202,
  },
  {
    code: '203',
    name: '선수금',
    nameEn: 'Advance Receipts',
    type: 'LIABILITY',
    level: 1,
    description: '거래처로부터 선수취한 금액',
    sortOrder: 203,
  },
  {
    code: '204',
    name: '예수금',
    nameEn: 'Withholdings',
    type: 'LIABILITY',
    level: 1,
    description: '원천세, 4대보험 등 예수금',
    sortOrder: 204,
  },
  {
    code: '205',
    name: '미지급비용',
    nameEn: 'Accrued Expenses',
    type: 'LIABILITY',
    level: 1,
    description: '발생했으나 미지급된 비용',
    sortOrder: 205,
  },
  {
    code: '208',
    name: '지급어음',
    nameEn: 'Notes Payable',
    type: 'LIABILITY',
    level: 1,
    description: '지급어음 (약속어음)',
    sortOrder: 208,
  },
  {
    code: '210',
    name: '단기차입금',
    nameEn: 'Short-term Borrowings',
    type: 'LIABILITY',
    level: 1,
    description: '1년 이내 상환 예정 차입금',
    sortOrder: 210,
  },
  {
    code: '220',
    name: '장기차입금',
    nameEn: 'Long-term Borrowings',
    type: 'LIABILITY',
    level: 1,
    description: '1년 초과 장기 차입금',
    sortOrder: 220,
  },

  // ==================== 자본 계정 (EQUITY) ====================
  {
    code: '301',
    name: '자본금',
    nameEn: 'Capital Stock',
    type: 'EQUITY',
    level: 1,
    description: '출자 자본금',
    sortOrder: 301,
  },
  {
    code: '331',
    name: '이익잉여금',
    nameEn: 'Retained Earnings',
    type: 'EQUITY',
    level: 1,
    description: '이월이익잉여금 및 당기순이익 누적',
    sortOrder: 331,
  },

  // ==================== 수익 계정 (REVENUE) ====================
  {
    code: '401',
    name: '상품매출',
    nameEn: 'Merchandise Sales',
    type: 'REVENUE',
    level: 1,
    description: '외부 구매 상품 유통 매출',
    sortOrder: 401,
  },
  {
    code: '402',
    name: '제품매출',
    nameEn: 'Product Sales',
    type: 'REVENUE',
    level: 1,
    description: '자체 제조 제품 매출 (앨범, 액자 등)',
    sortOrder: 402,
  },
  {
    code: '403',
    name: '출력매출',
    nameEn: 'Print Sales',
    type: 'REVENUE',
    level: 1,
    description: '대형출력, 사진인화, 디지털프린트 매출',
    sortOrder: 403,
  },
  {
    code: '404',
    name: '용역매출',
    nameEn: 'Service Revenue',
    type: 'REVENUE',
    level: 1,
    description: '디자인, 편집 등 용역 서비스 매출',
    sortOrder: 404,
  },
  {
    code: '409',
    name: '매출할인',
    nameEn: 'Sales Discounts',
    type: 'REVENUE',
    level: 1,
    description: '매출할인 (수익 차감 계정)',
    sortOrder: 409,
  },
  {
    code: '410',
    name: '매출환입',
    nameEn: 'Sales Returns',
    type: 'REVENUE',
    level: 1,
    description: '매출환입 및 에누리 (수익 차감 계정)',
    sortOrder: 410,
  },
  {
    code: '490',
    name: '잡이익',
    nameEn: 'Other Income',
    type: 'REVENUE',
    level: 1,
    description: '영업 외 기타 수익',
    sortOrder: 490,
  },

  // ==================== 비용 계정 - 매출원가 (EXPENSE) ====================
  {
    code: '501',
    name: '상품매출원가',
    nameEn: 'COGS - Merchandise',
    type: 'EXPENSE',
    level: 1,
    description: '상품(유통) 매출원가',
    sortOrder: 501,
  },
  {
    code: '510',
    name: '기초원재료재고',
    nameEn: 'Beginning Raw Materials',
    type: 'EXPENSE',
    level: 1,
    description: '기초 원재료 재고액',
    sortOrder: 510,
  },
  {
    code: '511',
    name: '원재료매입',
    nameEn: 'Raw Materials Purchases',
    type: 'EXPENSE',
    level: 1,
    description: '원재료 매입액 (용지, 잉크, 표지재 등)',
    sortOrder: 511,
  },
  {
    code: '512',
    name: '기말원재료재고',
    nameEn: 'Ending Raw Materials',
    type: 'EXPENSE',
    level: 1,
    description: '기말 원재료 재고액 (원가 차감 계정)',
    sortOrder: 512,
  },
  {
    code: '520',
    name: '직접노무비',
    nameEn: 'Direct Labor',
    type: 'EXPENSE',
    level: 1,
    description: '생산직 직접노무비',
    sortOrder: 520,
  },
  {
    code: '530',
    name: '제조경비',
    nameEn: 'Manufacturing Overhead',
    type: 'EXPENSE',
    level: 1,
    description: '간접재료비, 간접노무비, 감가상각비 등 제조간접비',
    sortOrder: 530,
  },
  {
    code: '540',
    name: '기초제품재고',
    nameEn: 'Beginning Finished Goods',
    type: 'EXPENSE',
    level: 1,
    description: '기초 제품(완성품) 재고액',
    sortOrder: 540,
  },
  {
    code: '541',
    name: '기말제품재고',
    nameEn: 'Ending Finished Goods',
    type: 'EXPENSE',
    level: 1,
    description: '기말 제품(완성품) 재고액 (원가 차감 계정)',
    sortOrder: 541,
  },

  // ==================== 비용 계정 - 판매비와관리비 (EXPENSE) ====================
  {
    code: '601',
    name: '급여',
    nameEn: 'Salaries',
    type: 'EXPENSE',
    level: 1,
    description: '임직원 급여',
    sortOrder: 601,
  },
  {
    code: '602',
    name: '퇴직급여',
    nameEn: 'Retirement Benefits',
    type: 'EXPENSE',
    level: 1,
    description: '퇴직급여 충당금 전입액',
    sortOrder: 602,
  },
  {
    code: '603',
    name: '복리후생비',
    nameEn: 'Employee Benefits',
    type: 'EXPENSE',
    level: 1,
    description: '4대보험 사업자부담금, 식대, 경조사비 등',
    sortOrder: 603,
  },
  {
    code: '604',
    name: '여비교통비',
    nameEn: 'Travel & Transportation',
    type: 'EXPENSE',
    level: 1,
    description: '출장비, 교통비, 주차비 등',
    sortOrder: 604,
  },
  {
    code: '605',
    name: '접대비',
    nameEn: 'Entertainment',
    type: 'EXPENSE',
    level: 1,
    description: '거래처 접대비',
    sortOrder: 605,
  },
  {
    code: '606',
    name: '통신비',
    nameEn: 'Communication',
    type: 'EXPENSE',
    level: 1,
    description: '전화, 인터넷, 우편 등 통신비',
    sortOrder: 606,
  },
  {
    code: '607',
    name: '수도광열비',
    nameEn: 'Utilities',
    type: 'EXPENSE',
    level: 1,
    description: '전기, 수도, 가스 등 유틸리티 비용',
    sortOrder: 607,
  },
  {
    code: '608',
    name: '세금과공과',
    nameEn: 'Taxes & Duties',
    type: 'EXPENSE',
    level: 1,
    description: '재산세, 자동차세, 면허세 등 공과금',
    sortOrder: 608,
  },
  {
    code: '609',
    name: '감가상각비',
    nameEn: 'Depreciation',
    type: 'EXPENSE',
    level: 1,
    description: '유형자산 감가상각비',
    sortOrder: 609,
  },
  {
    code: '610',
    name: '지급임차료',
    nameEn: 'Rent',
    type: 'EXPENSE',
    level: 1,
    description: '사무실, 공장 임차료',
    sortOrder: 610,
  },
  {
    code: '611',
    name: '수선비',
    nameEn: 'Repairs & Maintenance',
    type: 'EXPENSE',
    level: 1,
    description: '설비, 기계, 건물 수선 및 유지보수비',
    sortOrder: 611,
  },
  {
    code: '612',
    name: '보험료',
    nameEn: 'Insurance',
    type: 'EXPENSE',
    level: 1,
    description: '화재보험, 배상책임보험 등 보험료',
    sortOrder: 612,
  },
  {
    code: '613',
    name: '차량유지비',
    nameEn: 'Vehicle Maintenance',
    type: 'EXPENSE',
    level: 1,
    description: '차량 유류비, 정비비, 보험료 등',
    sortOrder: 613,
  },
  {
    code: '614',
    name: '운반비',
    nameEn: 'Shipping / Delivery',
    type: 'EXPENSE',
    level: 1,
    description: '택배비, 퀵서비스, 화물 운송비',
    sortOrder: 614,
  },
  {
    code: '615',
    name: '교육훈련비',
    nameEn: 'Training',
    type: 'EXPENSE',
    level: 1,
    description: '직원 교육 및 훈련비',
    sortOrder: 615,
  },
  {
    code: '616',
    name: '디자인외주비',
    nameEn: 'Design Outsourcing',
    type: 'EXPENSE',
    level: 1,
    description: '디자인, 편집 외주 용역비',
    sortOrder: 616,
  },
  {
    code: '617',
    name: '소모품비',
    nameEn: 'Consumables',
    type: 'EXPENSE',
    level: 1,
    description: '사무용품, 인쇄 소모품 등',
    sortOrder: 617,
  },
  {
    code: '618',
    name: '지급수수료',
    nameEn: 'Fees & Commissions',
    type: 'EXPENSE',
    level: 1,
    description: '카드수수료, 은행수수료, 중개수수료 등',
    sortOrder: 618,
  },
  {
    code: '619',
    name: '광고선전비',
    nameEn: 'Advertising',
    type: 'EXPENSE',
    level: 1,
    description: '온라인/오프라인 광고 및 홍보비',
    sortOrder: 619,
  },
  {
    code: '620',
    name: '대손상각비',
    nameEn: 'Bad Debt Expense',
    type: 'EXPENSE',
    level: 1,
    description: '회수 불능 채권 상각비',
    sortOrder: 620,
  },
  {
    code: '650',
    name: '잡손실',
    nameEn: 'Other Losses',
    type: 'EXPENSE',
    level: 1,
    description: '영업 외 기타 손실',
    sortOrder: 650,
  },
];

// ============================================================
//  시드 실행
// ============================================================

async function seedAccounts() {
  console.log('========================================');
  console.log('  표준 계정과목 시드 시작');
  console.log('========================================');
  console.log(`총 ${accounts.length}개 계정과목을 등록합니다.\n`);

  let created = 0;
  let updated = 0;

  for (const account of accounts) {
    // parentCode가 지정된 경우 parentId 조회
    let parentId: string | undefined;
    if (account.parentCode) {
      const parent = await prisma.account.findUnique({
        where: { code: account.parentCode },
        select: { id: true },
      });
      if (parent) {
        parentId = parent.id;
      } else {
        console.warn(`  [WARN] 상위 계정 '${account.parentCode}'을 찾을 수 없습니다. (계정: ${account.code} ${account.name})`);
      }
    }

    const existing = await prisma.account.findUnique({
      where: { code: account.code },
    });

    await prisma.account.upsert({
      where: { code: account.code },
      update: {
        name: account.name,
        nameEn: account.nameEn,
        type: account.type,
        level: account.level,
        parentId: parentId ?? null,
        description: account.description ?? null,
        sortOrder: account.sortOrder,
        isActive: true,
      },
      create: {
        code: account.code,
        name: account.name,
        nameEn: account.nameEn,
        type: account.type,
        level: account.level,
        parentId: parentId ?? null,
        description: account.description ?? null,
        sortOrder: account.sortOrder,
        isActive: true,
      },
    });

    if (existing) {
      updated++;
      console.log(`  [UPDATE] ${account.code} ${account.name} (${account.nameEn})`);
    } else {
      created++;
      console.log(`  [CREATE] ${account.code} ${account.name} (${account.nameEn})`);
    }
  }

  console.log('\n========================================');
  console.log('  계정과목 시드 완료');
  console.log(`  신규: ${created}개 / 갱신: ${updated}개 / 합계: ${accounts.length}개`);
  console.log('========================================');

  // 유형별 요약
  const summary = accounts.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log('\n[유형별 계정 수]');
  console.log(`  ASSET     (자산)  : ${summary.ASSET || 0}개`);
  console.log(`  LIABILITY (부채)  : ${summary.LIABILITY || 0}개`);
  console.log(`  EQUITY    (자본)  : ${summary.EQUITY || 0}개`);
  console.log(`  REVENUE   (수익)  : ${summary.REVENUE || 0}개`);
  console.log(`  EXPENSE   (비용)  : ${summary.EXPENSE || 0}개`);
}

async function main() {
  await seedAccounts();
}

main()
  .catch((e) => {
    console.error('계정과목 시드 실행 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
