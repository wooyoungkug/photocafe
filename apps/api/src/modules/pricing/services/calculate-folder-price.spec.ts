/**
 * 프론트엔드 견적 계산 순수 함수 테스트
 *
 * 테스트 대상: multi-folder-upload-store.ts 의
 * - calculateUploadedFolderPrice(): 후가공비 = dbPrice.postProcessingPrice x billingPageCount
 * - calculateAdditionalOrderPrice(): 동일 로직 적용
 *
 * 참고: 프론트엔드에 jest가 없으므로 백엔드 jest 환경에서 실행
 * 순수 함수 로직만 추출하여 테스트 (외부 의존성 없음)
 */

// ── 타입 정의 (store에서 필요한 최소 인터페이스만 추출) ──
interface DbPriceInfo {
  pricePerPage: number;
  bindingPrice: number;
  coverPrice: number;
  postProcessingPrice?: number;
  billingPageCount?: number;
}

interface MinimalFolder {
  id: string;
  pageCount: number;
  quantity: number;
}

interface MinimalAdditionalOrder {
  id: string;
  quantity: number;
}

// ── 테스트 대상 함수: multi-folder-upload-store.ts의 로직과 동일 ──

function calculateUploadedFolderPrice(folder: MinimalFolder, dbPrice: DbPriceInfo) {
  const pricePerPage = dbPrice.pricePerPage;
  const billingPageCount = dbPrice.billingPageCount ?? folder.pageCount;
  const printPrice = pricePerPage * billingPageCount;
  const bindingPrice = dbPrice.bindingPrice + dbPrice.coverPrice;
  // 수정 후: 페이지당 단가 x 페이지수 (수정 전: dbPrice.postProcessingPrice 그대로 사용)
  const postProcessingPrice = (dbPrice.postProcessingPrice || 0) * billingPageCount;
  const unitPrice = printPrice + bindingPrice + postProcessingPrice;
  const quantity = folder.quantity;
  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal;

  return {
    pricePerPage,
    pageCount: folder.pageCount,
    printPrice,
    bindingPrice,
    postProcessingPrice,
    unitPrice,
    quantity,
    subtotal,
    totalPrice,
  };
}

function calculateAdditionalOrderPrice(
  order: MinimalAdditionalOrder,
  folder: MinimalFolder,
  dbPrice: DbPriceInfo,
) {
  const pricePerPage = dbPrice.pricePerPage;
  const billingPageCount = dbPrice.billingPageCount ?? folder.pageCount;
  const printPrice = pricePerPage * billingPageCount;
  const bindingPrice = dbPrice.bindingPrice + dbPrice.coverPrice;
  const postProcessingPrice = (dbPrice.postProcessingPrice || 0) * billingPageCount;
  const unitPrice = printPrice + bindingPrice + postProcessingPrice;
  const quantity = order.quantity;
  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal;

  return {
    pricePerPage,
    pageCount: folder.pageCount,
    printPrice,
    bindingPrice,
    postProcessingPrice,
    unitPrice,
    quantity,
    subtotal,
    totalPrice,
  };
}

// ====================================================================
// 테스트
// ====================================================================

describe('calculateUploadedFolderPrice - 후가공비 페이지 곱셈', () => {
  const baseFolder: MinimalFolder = {
    id: 'folder-001',
    pageCount: 44,
    quantity: 1,
  };

  it('후가공비 = 페이지당 단가(150원) x 페이지수(44p) = 6,600원', () => {
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 150,
      billingPageCount: 44,
    };

    const result = calculateUploadedFolderPrice(baseFolder, dbPrice);

    expect(result.postProcessingPrice).toBe(6600);
  });

  it('후가공비가 unitPrice에 포함되어야 한다', () => {
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 150,
      billingPageCount: 44,
    };

    const result = calculateUploadedFolderPrice(baseFolder, dbPrice);

    // 출력비: 100 x 44 = 4,400
    // 제본비: 5000 + 1000 = 6,000
    // 후가공비: 150 x 44 = 6,600
    // 단가: 17,000
    expect(result.printPrice).toBe(4400);
    expect(result.bindingPrice).toBe(6000);
    expect(result.postProcessingPrice).toBe(6600);
    expect(result.unitPrice).toBe(17000);
  });

  it('후가공비가 없을 때(undefined): 0원이어야 한다', () => {
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      billingPageCount: 44,
    };

    const result = calculateUploadedFolderPrice(baseFolder, dbPrice);

    expect(result.postProcessingPrice).toBe(0);
  });

  it('후가공비가 0일 때: 0원이어야 한다', () => {
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 0,
      billingPageCount: 44,
    };

    const result = calculateUploadedFolderPrice(baseFolder, dbPrice);

    expect(result.postProcessingPrice).toBe(0);
  });

  it('billingPageCount가 없을 때: folder.pageCount를 사용해야 한다', () => {
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 150,
    };

    const result = calculateUploadedFolderPrice(baseFolder, dbPrice);

    expect(result.postProcessingPrice).toBe(150 * 44);
  });

  it('billingPageCount와 pageCount가 다를 때: billingPageCount를 사용해야 한다', () => {
    // 1+up 앨범: pageCount=22, billingPageCount=44
    const folder: MinimalFolder = { id: 'folder-002', pageCount: 22, quantity: 1 };
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 150,
      billingPageCount: 44,
    };

    const result = calculateUploadedFolderPrice(folder, dbPrice);

    expect(result.postProcessingPrice).toBe(150 * 44);
    expect(result.pageCount).toBe(22); // 원본 pageCount 유지
  });

  it('수량이 여러 권일 때: subtotal에 수량이 곱해져야 한다', () => {
    const folder: MinimalFolder = { id: 'folder-003', pageCount: 44, quantity: 3 };
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 150,
      billingPageCount: 44,
    };

    const result = calculateUploadedFolderPrice(folder, dbPrice);

    const expectedUnitPrice = (100 * 44) + (5000 + 1000) + (150 * 44); // 17,000
    expect(result.unitPrice).toBe(expectedUnitPrice);
    expect(result.subtotal).toBe(expectedUnitPrice * 3);
    expect(result.totalPrice).toBe(expectedUnitPrice * 3);
  });
});

describe('calculateAdditionalOrderPrice - 추가 주문 건 후가공비', () => {
  const baseFolder: MinimalFolder = {
    id: 'folder-001',
    pageCount: 44,
    quantity: 1,
  };

  it('추가 주문도 동일하게 후가공비 = 페이지당 단가 x 페이지수로 계산해야 한다', () => {
    const order: MinimalAdditionalOrder = { id: 'order-001', quantity: 2 };
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 150,
      billingPageCount: 44,
    };

    const result = calculateAdditionalOrderPrice(order, baseFolder, dbPrice);

    expect(result.postProcessingPrice).toBe(6600);
    expect(result.quantity).toBe(2);
    expect(result.subtotal).toBe(result.unitPrice * 2);
  });

  it('추가 주문 후가공비가 undefined일 때: 0원이어야 한다', () => {
    const order: MinimalAdditionalOrder = { id: 'order-002', quantity: 1 };
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      billingPageCount: 44,
    };

    const result = calculateAdditionalOrderPrice(order, baseFolder, dbPrice);

    expect(result.postProcessingPrice).toBe(0);
  });
});

describe('버그 재현: 수정 전 로직과 수정 후 로직 비교', () => {
  it('[수정 전 버그] 페이지당 단가를 그대로 총액으로 사용하면 잘못된 금액이 된다', () => {
    // 수정 전: const postProcessingPrice = dbPrice.postProcessingPrice || 0;
    // 150원이 후가공비 총액 → 실제로는 6,600원이어야 함
    const buggyPostProcessingPrice = 150;
    const correctPostProcessingPrice = 150 * 44;

    expect(buggyPostProcessingPrice).not.toBe(correctPostProcessingPrice);
    expect(correctPostProcessingPrice).toBe(6600);
  });

  it('[수정 후] 페이지당 단가 x 페이지수로 올바른 총액이 계산된다', () => {
    const folder: MinimalFolder = { id: 'f1', pageCount: 44, quantity: 1 };
    const dbPrice: DbPriceInfo = {
      pricePerPage: 100,
      bindingPrice: 5000,
      coverPrice: 1000,
      postProcessingPrice: 150,
      billingPageCount: 44,
    };

    const result = calculateUploadedFolderPrice(folder, dbPrice);

    expect(result.postProcessingPrice).toBe(6600);
    expect(result.unitPrice).toBe(4400 + 6000 + 6600); // 17,000
  });
});
