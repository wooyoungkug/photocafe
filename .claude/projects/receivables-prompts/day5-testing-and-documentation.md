# Day 5 프롬프트: 테스트, 버그 수정, 문서화

---

## 🎯 목표
전체 기능 통합 테스트, 버그 수정, API 문서화, 사용자 가이드 작성

---

## 📋 Backend 테스트 요구사항

### 1. Unit Tests

**apps/api/src/modules/accounting/services/receivables.service.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReceivablesService } from './receivables.service';
import { PrismaService } from '@/prisma/prisma.service';
import { JournalService } from './journal.service';

describe('ReceivablesService', () => {
  let service: ReceivablesService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReceivablesService,
        {
          provide: PrismaService,
          useValue: {
            receivable: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: JournalService,
          useValue: {
            createReceiptJournal: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ReceivablesService>(ReceivablesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('미수금을 생성해야 함', async () => {
      const dto = {
        clientId: 'client-1',
        originalAmount: 1000000,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      const mockReceivable = {
        id: 'receivable-1',
        ...dto,
        balance: dto.originalAmount,
        paidAmount: 0,
      };

      jest.spyOn(prisma.receivable, 'create').mockResolvedValue(mockReceivable as any);

      const result = await service.create(dto);

      expect(result).toEqual(mockReceivable);
      expect(result.balance).toBe(dto.originalAmount);
    });

    it('잘못된 거래처 ID로 생성 시 에러 발생', async () => {
      const dto = {
        clientId: 'invalid-client',
        originalAmount: 1000000,
        issueDate: new Date().toISOString(),
      };

      jest.spyOn(prisma.receivable, 'create').mockRejectedValue(new Error('Client not found'));

      await expect(service.create(dto)).rejects.toThrow();
    });
  });

  describe('createPayment', () => {
    it('수금 처리가 성공해야 함', async () => {
      const receivable = {
        id: 'receivable-1',
        clientId: 'client-1',
        balance: 1000000,
        issueDate: new Date(),
        client: { name: 'Test Client' },
      };

      const paymentDto = {
        amount: 500000,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER' as const,
      };

      jest.spyOn(prisma.receivable, 'findUnique').mockResolvedValue(receivable as any);
      jest.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        return callback(prisma);
      });

      const result = await service.createPayment('receivable-1', paymentDto, 'user-1');

      expect(result).toBeDefined();
    });

    it('수금액이 잔액 초과 시 에러 발생', async () => {
      const receivable = {
        id: 'receivable-1',
        balance: 100000,
        issueDate: new Date(),
      };

      const paymentDto = {
        amount: 200000, // 잔액 초과
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER' as const,
      };

      jest.spyOn(prisma.receivable, 'findUnique').mockResolvedValue(receivable as any);

      await expect(
        service.createPayment('receivable-1', paymentDto, 'user-1')
      ).rejects.toThrow('수금액이 잔액을 초과할 수 없습니다');
    });
  });

  describe('getAging', () => {
    it('Aging 분석 계산이 정확해야 함', async () => {
      const now = new Date();
      const receivables = [
        { balance: 100000, issueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) }, // 10일 전
        { balance: 200000, issueDate: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000) }, // 40일 전
        { balance: 300000, issueDate: new Date(now.getTime() - 70 * 24 * 60 * 60 * 1000) }, // 70일 전
        { balance: 400000, issueDate: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000) }, // 100일 전
      ];

      jest.spyOn(prisma.receivable, 'findMany').mockResolvedValue(receivables as any);

      const result = await service.getAging({});

      expect(result.current.amount).toBe(100000); // 30일 이내
      expect(result.days30.amount).toBe(200000);  // 31-60일
      expect(result.days60.amount).toBe(300000);  // 61-90일
      expect(result.days90Plus.amount).toBe(400000); // 90일 초과
    });
  });
});
```

**apps/api/src/modules/accounting/services/journal.service.spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { JournalService } from './journal.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('JournalService', () => {
  let service: JournalService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        {
          provide: PrismaService,
          useValue: {
            journal: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<JournalService>(JournalService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generateVoucherNo', () => {
    it('첫 전표번호는 V-YYYY-000001이어야 함', async () => {
      jest.spyOn(prisma.journal, 'findFirst').mockResolvedValue(null);

      const result = await service.generateVoucherNo();
      const year = new Date().getFullYear();

      expect(result).toBe(`V-${year}-000001`);
    });

    it('기존 전표가 있으면 순번을 증가시켜야 함', async () => {
      const year = new Date().getFullYear();
      const lastVoucher = {
        voucherNo: `V-${year}-000005`,
      };

      jest.spyOn(prisma.journal, 'findFirst').mockResolvedValue(lastVoucher as any);

      const result = await service.generateVoucherNo();

      expect(result).toBe(`V-${year}-000006`);
    });
  });

  describe('createReceiptJournal', () => {
    it('입금전표 생성 시 차대 균형이 맞아야 함', async () => {
      const params = {
        clientId: 'client-1',
        amount: new Prisma.Decimal(1000000),
        paymentMethod: 'BANK_TRANSFER' as const,
        paymentDate: new Date(),
        createdBy: 'user-1',
      };

      const mockJournal = {
        id: 'journal-1',
        voucherNo: 'V-2024-000001',
        entries: [
          {
            accountCode: '102',
            transactionType: 'DEBIT',
            amount: new Prisma.Decimal(1000000),
          },
          {
            accountCode: '110',
            transactionType: 'CREDIT',
            amount: new Prisma.Decimal(1000000),
          },
        ],
      };

      jest.spyOn(prisma.journal, 'create').mockResolvedValue(mockJournal as any);
      jest.spyOn(service, 'generateVoucherNo').mockResolvedValue('V-2024-000001');

      const result = await service.createReceiptJournal(params);

      expect(result.entries.length).toBe(2);

      const debitTotal = result.entries
        .filter(e => e.transactionType === 'DEBIT')
        .reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));

      const creditTotal = result.entries
        .filter(e => e.transactionType === 'CREDIT')
        .reduce((sum, e) => sum.add(e.amount), new Prisma.Decimal(0));

      expect(debitTotal.equals(creditTotal)).toBe(true);
    });
  });

  describe('validateBalance', () => {
    it('차대 균형이 맞으면 true 반환', () => {
      const entries = [
        { transactionType: 'DEBIT' as const, amount: new Prisma.Decimal(1000) },
        { transactionType: 'CREDIT' as const, amount: new Prisma.Decimal(1000) },
      ];

      const result = service.validateBalance(entries);

      expect(result).toBe(true);
    });

    it('차대 균형이 맞지 않으면 false 반환', () => {
      const entries = [
        { transactionType: 'DEBIT' as const, amount: new Prisma.Decimal(1000) },
        { transactionType: 'CREDIT' as const, amount: new Prisma.Decimal(500) },
      ];

      const result = service.validateBalance(entries);

      expect(result).toBe(false);
    });
  });
});
```

### 2. E2E Test

**apps/api/test/receivables.e2e-spec.ts**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Receivables E2E', () => {
  let app: INestApplication;
  let authToken: string;
  let clientId: string;
  let receivableId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 로그인 및 토큰 획득
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password',
      });

    authToken = loginRes.body.accessToken;

    // 테스트 거래처 생성
    const clientRes = await request(app.getHttpServer())
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Client',
        email: 'client@test.com',
      });

    clientId = clientRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('시나리오: 미수금 생성 → 조회 → 수금 → 잔액 확인', async () => {
    // 1. 미수금 생성
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/accounting/receivables')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        clientId,
        originalAmount: 1000000,
        issueDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Test 미수금',
      })
      .expect(201);

    receivableId = createRes.body.id;
    expect(createRes.body.balance).toBe(1000000);

    // 2. 미수금 조회
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/accounting/receivables/${receivableId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(getRes.body.id).toBe(receivableId);

    // 3. 부분 수금 (50만원)
    await request(app.getHttpServer())
      .post(`/api/v1/accounting/receivables/${receivableId}/payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 500000,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'BANK_TRANSFER',
        description: '1차 수금',
      })
      .expect(201);

    // 4. 잔액 확인 (50만원)
    const afterPayment1 = await request(app.getHttpServer())
      .get(`/api/v1/accounting/receivables/${receivableId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(afterPayment1.body.balance).toBe(500000);
    expect(afterPayment1.body.paidAmount).toBe(500000);

    // 5. 추가 수금 (50만원)
    await request(app.getHttpServer())
      .post(`/api/v1/accounting/receivables/${receivableId}/payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 500000,
        paymentDate: new Date().toISOString(),
        paymentMethod: 'CASH',
        description: '2차 수금 (완납)',
      })
      .expect(201);

    // 6. 완납 확인
    const afterPayment2 = await request(app.getHttpServer())
      .get(`/api/v1/accounting/receivables/${receivableId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(afterPayment2.body.balance).toBe(0);
    expect(afterPayment2.body.paidAmount).toBe(1000000);

    // 7. 수금 이력 확인
    const paymentsRes = await request(app.getHttpServer())
      .get(`/api/v1/accounting/receivables/${receivableId}/payments`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(paymentsRes.body.length).toBe(2);
  });

  it('수금액 초과 시 에러 발생', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/accounting/receivables/${receivableId}/payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        amount: 9999999, // 잔액보다 큰 금액
        paymentDate: new Date().toISOString(),
        paymentMethod: 'CASH',
      })
      .expect(400);
  });
});
```

---

## 📋 Frontend 테스트 요구사항

### 사용자 시나리오 체크리스트

```markdown
## 미수금 관리 기능 테스트

### 1. 미수금 목록 페이지
- [ ] 페이지 접속 시 미수금 목록 로딩
- [ ] 거래처별 집계 데이터 표시
- [ ] 기간 필터 적용 시 데이터 갱신
- [ ] 거래처 필터 적용 시 데이터 갱신
- [ ] 페이지네이션 동작
- [ ] 정렬 기능 (잔액 많은 순)

### 2. Aging 분석
- [ ] 4개 구간별 금액/건수 정확히 표시
- [ ] 차트 렌더링 (색상 구분)
- [ ] 기준일 변경 시 재계산

### 3. 수금 처리
- [ ] 수금 모달 오픈
- [ ] 거래처명, 잔액 정확히 표시
- [ ] 수금액 입력 (양수만)
- [ ] 수금액 > 잔액 시 에러 메시지
- [ ] 수금일 선택 (발생일 이후만)
- [ ] 수금방법 선택 (현금/계좌이체/카드)
- [ ] 제출 버튼 클릭 시 mutation 실행
- [ ] 성공 토스트 메시지
- [ ] 목록 자동 갱신

### 4. 수금 이력
- [ ] 특정 미수금의 수금 이력 조회
- [ ] 최신순 정렬
- [ ] 총 수금액 표시

### 5. 대시보드
- [ ] 4개 KPI 카드 표시
  - [ ] 총 미수금
  - [ ] 연체 금액 (건수)
  - [ ] 금주 수금액
  - [ ] 금월 수금액
- [ ] Top 10 거래처 차트
- [ ] 월별 수금 추이 차트 (12개월)
- [ ] 자동 갱신 (5분마다)

### 6. 거래처별 명세서
- [ ] 거래처 선택
- [ ] 기간 선택
- [ ] 기초잔액, 당기발생, 당기수금, 기말잔액 표시
- [ ] 발생/수금 내역 테이블
- [ ] 인쇄 버튼 (window.print)
- [ ] PDF 다운로드 버튼

### 7. 엣지 케이스
- [ ] 잔액 0원인 미수금 필터링
- [ ] 거래처 삭제 시 미수금 처리
- [ ] 동시 수금 요청 (Race condition)
- [ ] 네트워크 에러 처리
- [ ] 로딩 상태 표시
- [ ] 빈 데이터 상태 (No data)

### 8. 반응형
- [ ] PC (1920x1080)
- [ ] 태블릿 (768x1024)
- [ ] 모바일 (375x667)

### 9. 성능
- [ ] 1000+ 건 데이터 페이지네이션
- [ ] 차트 렌더링 < 1초
- [ ] API 응답 시간 < 500ms
```

---

## 📋 버그 수정 체크리스트

```markdown
## 알려진 버그 및 수정 사항

### Backend
- [ ] 금액 계산 시 소수점 처리 (Decimal 사용)
- [ ] 날짜 필터 범위 오류 (시작일 > 종료일)
- [ ] 권한 체크 (@UseGuards 누락)
- [ ] 트랜잭션 롤백 미처리
- [ ] N+1 쿼리 문제 (include 최적화)
- [ ] 전표번호 중복 생성 (Race condition)

### Frontend
- [ ] 모바일에서 테이블 깨짐 (scroll-x 추가)
- [ ] 차트 반응형 (ResponsiveContainer)
- [ ] 날짜 포맷 (로케일 설정)
- [ ] 금액 포맷 (천 단위 콤마)
- [ ] 수금 모달 재오픈 시 이전 값 유지 (reset 필요)
- [ ] Optimistic update 롤백 오류
```

---

## 📋 API 문서화 (Swagger)

**모든 Controller에 다음 추가**:

```typescript
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Receivables')
@ApiBearerAuth()
@Controller('accounting/receivables')
export class ReceivablesController {
  @Post()
  @ApiOperation({ summary: '미수금 생성' })
  @ApiResponse({ status: 201, description: '생성 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 404, description: '거래처 없음' })
  create(@Body() dto: CreateReceivableDto) {
    // ...
  }

  @Get()
  @ApiOperation({ summary: '미수금 목록 조회' })
  @ApiResponse({ status: 200, description: '조회 성공' })
  findAll(@Query() query: QueryReceivablesDto) {
    // ...
  }

  @Post(':id/payment')
  @ApiOperation({ summary: '수금 처리' })
  @ApiResponse({ status: 201, description: '수금 성공' })
  @ApiResponse({ status: 400, description: '수금액 초과 또는 잘못된 요청' })
  @ApiResponse({ status: 404, description: '미수금 없음' })
  createPayment(
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto
  ) {
    // ...
  }
}
```

**모든 DTO에 @ApiProperty 추가**:

```typescript
export class CreateReceivableDto {
  @ApiProperty({
    description: '거래처 ID',
    example: 'client-123'
  })
  @IsString()
  clientId: string;

  @ApiProperty({
    description: '발생액',
    example: 1000000,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  // ...
}
```

---

## 📋 README 작성

**apps/api/src/modules/accounting/README.md**

```markdown
# 회계 모듈 - 미수금 관리

## 개요

인쇄업 ERP 시스템의 매출채권(미수금) 관리 모듈입니다.

## 주요 기능

- 미수금 자동 생성 (주문 완료 시)
- 수금 처리 및 입금전표 자동 분개
- Aging 분석 (30/60/90일 기준)
- 거래처별 채권 현황
- 대시보드 및 통계

## API 엔드포인트

### 미수금 관리
- `POST /api/v1/accounting/receivables` - 미수금 생성
- `GET /api/v1/accounting/receivables` - 목록 조회
- `GET /api/v1/accounting/receivables/:id` - 상세 조회
- `PUT /api/v1/accounting/receivables/:id` - 수정
- `POST /api/v1/accounting/receivables/:id/payment` - 수금 처리

### 조회 및 분석
- `GET /api/v1/accounting/receivables/summary` - 거래처별 요약
- `GET /api/v1/accounting/receivables/aging` - Aging 분석
- `GET /api/v1/accounting/receivables/stats` - 통계

### 대시보드 및 리포트
- `GET /api/v1/accounting/dashboard/receivables` - 대시보드
- `GET /api/v1/accounting/reports/receivable-statement/:clientId` - 명세서

## 데이터베이스 스키마

### Receivable (미수금)
- `id`: PK
- `clientId`: 거래처 ID (FK)
- `orderId`: 주문 ID (FK, nullable)
- `originalAmount`: 원금
- `paidAmount`: 수금액
- `balance`: 잔액
- `issueDate`: 발생일
- `dueDate`: 수금예정일

### ReceivablePayment (수금 이력)
- `id`: PK
- `receivableId`: 미수금 ID (FK)
- `amount`: 수금액
- `paymentDate`: 수금일
- `paymentMethod`: 수금방법 (CASH/BANK_TRANSFER/CARD)
- `journalId`: 입금전표 ID (FK, nullable)

### Journal (분개장)
- `id`: PK
- `voucherNo`: 전표번호 (V-YYYY-NNNNNN)
- `voucherType`: 전표 유형 (RECEIPT/PAYMENT/TRANSFER)
- `journalDate`: 전표 일자
- `entries`: 분개 상세 (JournalEntry[])

## 사용 예시

### 수금 처리
```typescript
POST /api/v1/accounting/receivables/:id/payment
{
  "amount": 500000,
  "paymentDate": "2024-01-15",
  "paymentMethod": "BANK_TRANSFER",
  "description": "1차 수금"
}
```

### Aging 분석 조회
```typescript
GET /api/v1/accounting/receivables/aging
{
  "current": { "count": 15, "amount": 5000000 },
  "days30": { "count": 8, "amount": 3000000 },
  "days60": { "count": 3, "amount": 1500000 },
  "days90Plus": { "count": 2, "amount": 800000 }
}
```

## 테스트

```bash
# Unit 테스트
npm test receivables.service

# E2E 테스트
npm run test:e2e receivables

# 커버리지
npm run test:cov
```

## 주의사항

- 모든 금액은 Decimal(12,2) 타입 사용
- 수금 처리는 트랜잭션 필수
- 입금전표 자동 생성 시 차대 균형 검증
```

---

## ✅ 완료 조건

1. **테스트 통과**
   - Unit Tests: 80% 커버리지
   - E2E Tests: 주요 시나리오 통과

2. **버그 수정**
   - 알려진 버그 0건
   - 엣지 케이스 처리

3. **문서화**
   - Swagger 문서 완성
   - README 작성
   - 코드 주석 추가

4. **성능 최적화**
   - N+1 쿼리 제거
   - 인덱스 최적화
   - 캐싱 전략

---

## 📝 Claude에게 요청할 내용

```
미수금 관리 Day 5 작업을 진행해주세요.

Backend:
1. receivables.service.spec.ts 테스트 파일 생성
2. journal.service.spec.ts 테스트 파일 생성
3. receivables.e2e-spec.ts E2E 테스트 생성
4. 모든 Controller에 Swagger 문서 추가 (@ApiTags, @ApiOperation)
5. 모든 DTO에 @ApiProperty 추가
6. README.md 작성

Frontend:
1. 사용자 시나리오 테스트 (체크리스트 기반)
2. 버그 수정 (모바일 반응형, 차트 최적화 등)
3. 에러 처리 강화

테스트 실행:
1. npm test (Unit Tests)
2. npm run test:e2e (E2E Tests)
3. npm run test:cov (커버리지)

모든 테스트가 통과하고, Swagger 문서가 완성되면 완료입니다.
최종적으로 사용자 시나리오 테스트를 통해 전체 기능을 검증해주세요.
```
