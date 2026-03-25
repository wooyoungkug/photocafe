/**
 * PricingService - 후가공비(코팅) 가격 계산 테스트
 *
 * 테스트 대상: getAlbumPagePrice(), calculateAlbumOrderPrice()의
 * ProductFinishing → ProductionSetting 이름 매칭 + 규격별 단가 조회 로직
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PrismaService } from '@/common/prisma/prisma.service';

// ── 헬퍼: Prisma mock 생성 ──
function createPrismaMock() {
  const mockModel = () => ({
    findFirst: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
  });

  return {
    productFinishing: mockModel(),
    productionSetting: mockModel(),
    productionSettingPrice: mockModel(),
    specification: mockModel(),
    clientProductionSettingPrice: mockModel(),
    groupProductionSettingPrice: mockModel(),
    client: mockModel(),
    product: mockModel(),
    specificationPrice: mockModel(),
    clientGroup: mockModel(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

// 출력 단가 표준 레코드 (calculateAlbumOrderPrice 4-3 단계에서 반환되는 형태)
// 출력 단가 표준 레코드 - colorMode='4c' + pageLayout='spread' → fourColorDoublePrice 사용
const STANDARD_OUTPUT_PRICE = {
  doubleSidedPrice: 100,
  singleSidedPrice: 80,
  fourColorDoublePrice: 100,  // 4도 양면 단가
  fourColorSinglePrice: 80,
  sixColorDoublePrice: null,
  sixColorSinglePrice: null,
  basePrice: null,
  rangePrices: null,
  pricePerPage: null,
  productionSettingId: 'ps-001',
};

describe('PricingService - 후가공비(코팅) 계산', () => {
  let service: PricingService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  // ====================================================================
  // getAlbumPagePrice() - 후가공비 조회 (페이지당 단가 반환)
  // ====================================================================
  describe('getAlbumPagePrice() - 후가공비 조회', () => {
    const baseDto = {
      productionSettingId: 'ps-001',
      specificationId: 'spec-001',
      colorMode: '4c' as const,
      pageLayout: 'spread' as const,
      productId: 'product-001',
    };

    // 공통 설정: 기본 Prisma mock 반환값
    function setupBasePricingMocks() {
      // 규격 정보
      prisma.specification.findUnique.mockResolvedValue({
        name: '12x12인치',
        widthInch: 12,
        heightInch: 12,
        forIndigoAlbum: true,
        nup: '1up',
      });

      // 생산설정 이름
      prisma.productionSetting.findUnique.mockResolvedValue({
        settingName: 'HP Indigo 출력',
      });

      // 출력 단가 (거래처 개별 단가)
      prisma.clientProductionSettingPrice.findFirst.mockResolvedValue({
        doubleSidedPrice: 100,
        singleSidedPrice: null,
        basePrice: null,
        rangePrices: null,
        pricePerPage: null,
      });
    }

    it('이름 매칭: ProductFinishing.name과 ProductionSetting.settingName이 일치하면 해당 설정의 단가를 반환해야 한다', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '수성무광코팅', price: 0, productionGroupId: 'group-coating' },
      ]);

      // 이름 매칭: "수성무광코팅" 설정 존재
      prisma.productionSetting.findFirst.mockResolvedValue({ id: 'setting-matt' });

      // 규격별 단가: 150원/p
      prisma.productionSettingPrice.findFirst.mockResolvedValue({
        pricePerPage: 150,
        basePrice: 0,
      });

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert
      expect(result.postProcessingPrice).toBe(150);

      // 이름 매칭으로 찾았으므로 settingIds는 [setting-matt]만 포함
      expect(prisma.productionSetting.findFirst).toHaveBeenCalledWith({
        where: { groupId: 'group-coating', settingName: '수성무광코팅' },
        select: { id: true },
      });

      // productionSettingPrice 조회 시 매칭된 설정 ID만 사용
      expect(prisma.productionSettingPrice.findFirst).toHaveBeenCalledWith({
        where: {
          productionSettingId: { in: ['setting-matt'] },
          specificationId: 'spec-001',
        },
        select: { pricePerPage: true, basePrice: true },
      });
    });

    it('이름 매칭: 그룹에 여러 설정이 있을 때, 이름이 일치하는 설정의 단가만 반환해야 한다', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '수성무광코팅', price: 0, productionGroupId: 'group-coating' },
      ]);

      prisma.productionSetting.findFirst.mockResolvedValue({ id: 'setting-matt' });

      prisma.productionSettingPrice.findFirst.mockResolvedValue({
        pricePerPage: 150,
        basePrice: 0,
      });

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert - 150원 반환 (200원인 "라미네이팅코팅 유광"이 아닌)
      expect(result.postProcessingPrice).toBe(150);
    });

    it('fallback: 이름 매칭 실패 시 그룹 전체 설정에서 조회해야 한다', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '특수코팅', price: 0, productionGroupId: 'group-coating' },
      ]);

      prisma.productionSetting.findFirst.mockResolvedValue(null);

      prisma.productionSetting.findMany.mockResolvedValue([
        { id: 'setting-matt' },
        { id: 'setting-gloss' },
      ]);

      prisma.productionSettingPrice.findFirst.mockResolvedValue({
        pricePerPage: 180,
        basePrice: 0,
      });

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert
      expect(result.postProcessingPrice).toBe(180);

      expect(prisma.productionSetting.findMany).toHaveBeenCalledWith({
        where: { groupId: 'group-coating' },
        select: { id: true },
      });

      expect(prisma.productionSettingPrice.findFirst).toHaveBeenCalledWith({
        where: {
          productionSettingId: { in: ['setting-matt', 'setting-gloss'] },
          specificationId: 'spec-001',
        },
        select: { pricePerPage: true, basePrice: true },
      });
    });

    it('productionGroupId 없는 경우: ProductFinishing.price를 직접 사용해야 한다', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '엠보싱', price: 300, productionGroupId: null },
      ]);

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert
      expect(result.postProcessingPrice).toBe(300);
    });

    it('productionGroupId 있지만 규격별 단가가 없을 때: ProductFinishing.price를 fallback으로 사용해야 한다', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '코팅X', price: 50, productionGroupId: 'group-coating' },
      ]);

      prisma.productionSetting.findFirst.mockResolvedValue(null);
      prisma.productionSetting.findMany.mockResolvedValue([{ id: 'setting-a' }]);
      prisma.productionSettingPrice.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert
      expect(result.postProcessingPrice).toBe(50);
    });

    it('여러 후가공이 있을 때: 각 후가공 단가를 합산해야 한다', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '수성무광코팅', price: 0, productionGroupId: 'group-coating' },
        { name: '엠보싱', price: 250, productionGroupId: null },
      ]);

      prisma.productionSetting.findFirst.mockResolvedValue({ id: 'setting-matt' });
      prisma.productionSettingPrice.findFirst.mockResolvedValue({
        pricePerPage: 150,
        basePrice: 0,
      });

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert - 수성무광코팅(150) + 엠보싱(250) = 400
      expect(result.postProcessingPrice).toBe(400);
    });

    it('productId가 없을 때: 후가공비 0원이어야 한다', async () => {
      // Arrange
      setupBasePricingMocks();
      const dtoWithoutProduct = { ...baseDto, productId: undefined };

      // Act
      const result = await service.getAlbumPagePrice('client-001', dtoWithoutProduct);

      // Assert
      expect(result.postProcessingPrice).toBe(0);
      expect(prisma.productFinishing.findMany).not.toHaveBeenCalled();
    });

    it('후가공이 없는 상품: 후가공비 0원이어야 한다', async () => {
      // Arrange
      setupBasePricingMocks();
      prisma.productFinishing.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert
      expect(result.postProcessingPrice).toBe(0);
    });

    it('pricePerPage가 0이고 basePrice가 있을 때: basePrice를 사용해야 한다', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '특수코팅', price: 0, productionGroupId: 'group-special' },
      ]);

      prisma.productionSetting.findFirst.mockResolvedValue({ id: 'setting-special' });

      prisma.productionSettingPrice.findFirst.mockResolvedValue({
        pricePerPage: 0,
        basePrice: 200,
      });

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert
      expect(result.postProcessingPrice).toBe(200);
    });

    it('getAlbumPagePrice는 페이지당 단가(pricePerPage)를 반환해야 한다 (페이지수 곱셈 없음)', async () => {
      // Arrange
      setupBasePricingMocks();

      prisma.productFinishing.findMany.mockResolvedValue([
        { name: '수성무광코팅', price: 0, productionGroupId: 'group-coating' },
      ]);

      prisma.productionSetting.findFirst.mockResolvedValue({ id: 'setting-matt' });
      prisma.productionSettingPrice.findFirst.mockResolvedValue({
        pricePerPage: 150,
        basePrice: 0,
      });

      // Act
      const result = await service.getAlbumPagePrice('client-001', baseDto);

      // Assert - 150원/p 그대로 반환 (페이지수 곱셈 없음)
      expect(result.postProcessingPrice).toBe(150);
    });
  });

  // ====================================================================
  // calculateAlbumOrderPrice() - 후가공비 총액 계산 (단가 x 페이지수)
  // ====================================================================
  describe('calculateAlbumOrderPrice() - 후가공비 총액 계산', () => {
    const baseOrderDto = {
      productId: 'product-001',
      widthInch: 12,
      heightInch: 12,
      pageCount: 44,
      colorMode: '4c' as const,
      pageLayout: 'spread' as const,
    };

    /**
     * calculateAlbumOrderPrice의 Prisma 호출 흐름:
     * 1) product.findUnique → 상품 조회
     * 2) specification.findFirst → 규격 매칭
     * 3) productionSettingPrice.findFirst → 출력 표준 단가 (4-3)
     * 4) specification.findFirst → 제본용 규격 (7단계)
     * 5) productFinishing.findMany → 후가공 목록 (8단계)
     * 6) productionSetting.findFirst → 후가공 이름매칭 (8단계)
     * 7) productionSettingPrice.findFirst → 후가공 규격별 단가 (8단계)
     *
     * productionSettingPrice.findFirst는 출력(3)과 후가공(7)에서 두 번 호출되므로
     * mockImplementation으로 인자 기반 분기 처리.
     */
    function setupCalculateAlbumMocks(options?: {
      finishings?: Array<{ name: string; price: number; productionGroupId: string | null }>;
      finishingNameMatch?: { id: string } | null;
      finishingPrice?: { pricePerPage: number; basePrice: number } | null;
      finishingGroupSettings?: Array<{ id: string }>;
    }) {
      const {
        finishings = [{ name: '수성무광코팅', price: 0, productionGroupId: 'group-coating' }],
        finishingNameMatch = { id: 'setting-matt' },
        finishingPrice = { pricePerPage: 150, basePrice: 0 },
        finishingGroupSettings = [],
      } = options || {};

      // 1) 상품 조회
      prisma.product.findUnique.mockResolvedValue({
        id: 'product-001',
        productName: '프리미엄 앨범',
        outputPriceSettings: [
          { productionSettingId: 'ps-001', outputMethod: 'INDIGO' },
        ],
        bindings: [{ isDefault: true, productionSettingId: 'binding-ps-001', price: 0 }],
      });

      // 2) 규격 매칭 - findFirst가 두 번 호출됨 (인디고앨범 규격 + 제본용 규격)
      prisma.specification.findFirst.mockResolvedValue({
        id: 'spec-001',
        code: 'A4',
        name: '12x12인치',
        widthInch: 12,
        heightInch: 12,
        forIndigoAlbum: true,
        nup: '1up',
        isActive: true,
      });

      // 3+7) productionSettingPrice.findFirst: 인자 기반 분기
      // - 출력 단가: productionSettingId가 { in: ['ps-001'] }인 경우
      // - 후가공 단가: productionSettingId가 { in: ['setting-matt'] } 등인 경우
      prisma.productionSettingPrice.findFirst.mockImplementation((args: any) => {
        const psIds = args?.where?.productionSettingId?.in;
        // 출력 단가 조회 (ps-001 포함)
        if (psIds && psIds.includes('ps-001')) {
          return Promise.resolve(STANDARD_OUTPUT_PRICE);
        }
        // 후가공 규격별 단가 조회
        return Promise.resolve(finishingPrice);
      });

      // 5) 후가공 목록
      prisma.productFinishing.findMany.mockResolvedValue(finishings);

      // 6) 후가공 이름 매칭
      prisma.productionSetting.findFirst.mockResolvedValue(finishingNameMatch);

      // fallback: 그룹 전체 설정 조회
      if (finishingGroupSettings.length > 0) {
        prisma.productionSetting.findMany.mockResolvedValue(finishingGroupSettings);
      }
    }

    it('후가공비는 페이지당 단가 x 페이지수로 총액을 반환해야 한다', async () => {
      // Arrange
      setupCalculateAlbumMocks();

      // Act
      const result = await service.calculateAlbumOrderPrice(baseOrderDto);

      // Assert - 후가공비 = 150원/p x 44p = 6,600원
      expect(result.postProcessingPrice).toBe(6600);
    });

    it('후가공비가 unitPrice(총 단가)에 포함되어야 한다', async () => {
      // Arrange
      setupCalculateAlbumMocks();

      // Act
      const result = await service.calculateAlbumOrderPrice(baseOrderDto);

      // Assert
      const expectedUnitPrice =
        result.printPrice + result.paperPrice + result.bindingPrice + result.postProcessingPrice;
      expect(result.unitPrice).toBe(expectedUnitPrice);
    });

    it('후가공이 없을 때: 후가공비 0원이어야 한다', async () => {
      // Arrange
      setupCalculateAlbumMocks({ finishings: [] });

      // Act
      const result = await service.calculateAlbumOrderPrice(baseOrderDto);

      // Assert
      expect(result.postProcessingPrice).toBe(0);
    });

    it('productionGroupId 없는 후가공: price x 페이지수로 계산해야 한다', async () => {
      // Arrange
      setupCalculateAlbumMocks({
        finishings: [{ name: '엠보싱', price: 50, productionGroupId: null }],
      });

      // Act
      const result = await service.calculateAlbumOrderPrice(baseOrderDto);

      // Assert - 50원 x 44p = 2,200원
      expect(result.postProcessingPrice).toBe(2200);
    });

    it('productionGroupId 있지만 규격별 단가 없을 때: ProductFinishing.price x 페이지수를 사용해야 한다', async () => {
      // Arrange
      setupCalculateAlbumMocks({
        finishings: [{ name: '코팅미등록', price: 80, productionGroupId: 'group-coating' }],
        finishingNameMatch: null, // 이름 매칭 실패
        finishingPrice: null,     // 규격별 단가 없음
        finishingGroupSettings: [{ id: 'setting-a' }],
      });

      // Act
      const result = await service.calculateAlbumOrderPrice(baseOrderDto);

      // Assert - 80원 x 44p = 3,520원
      expect(result.postProcessingPrice).toBe(3520);
    });

    it('ProductFinishing.price가 0이고 규격별 단가도 없을 때: 후가공비 0원이어야 한다', async () => {
      // Arrange
      setupCalculateAlbumMocks({
        finishings: [{ name: '빈코팅', price: 0, productionGroupId: 'group-coating' }],
        finishingNameMatch: null,
        finishingPrice: null,
        finishingGroupSettings: [], // 빈 배열 → settingIds가 비어서 조회 안됨
      });

      // Act
      const result = await service.calculateAlbumOrderPrice(baseOrderDto);

      // Assert
      expect(result.postProcessingPrice).toBe(0);
    });
  });
});
