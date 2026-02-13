# Day 1 프롬프트: DB 스키마 및 기본 CRUD API 구현

---

## 🎯 목표
미수금 관리를 위한 데이터베이스 스키마 완성 및 기본 CRUD API 구현

---

## 📋 요구사항

### 1. Prisma 스키마 설계 및 구현

**apps/api/prisma/schema.prisma** 파일에 다음 모델 추가:

#### A. Receivable 모델 (미수금)
```prisma
model Receivable {
  id              String        @id @default(cuid())

  // 거래처 정보
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])

  // 원천 정보
  orderId         String?       // 주문 ID (주문에서 발생한 경우)

  // 금액 정보
  originalAmount  Decimal       @db.Decimal(12, 2)  // 원금 (발생액)
  paidAmount      Decimal       @default(0) @db.Decimal(12, 2)  // 수금액
  balance         Decimal       @db.Decimal(12, 2)  // 잔액

  // 일자 정보
  issueDate       DateTime                          // 발생일
  dueDate         DateTime?                         // 수금예정일

  // 메모
  description     String?

  // 수금 이력
  payments        ReceivablePayment[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([clientId])
  @@index([issueDate])
  @@index([dueDate])
  @@map("receivables")
}
```

#### B. ReceivablePayment 모델 (수금 이력)
```prisma
model ReceivablePayment {
  id              String        @id @default(cuid())

  receivableId    String
  receivable      Receivable    @relation(fields: [receivableId], references: [id], onDelete: Cascade)

  amount          Decimal       @db.Decimal(12, 2)
  paymentDate     DateTime
  paymentMethod   String?       // 'CASH', 'BANK_TRANSFER', 'CARD'
  description     String?

  // 분개 연결 (나중에 추가)
  journalId       String?

  createdAt       DateTime      @default(now())

  @@index([receivableId])
  @@index([paymentDate])
  @@map("receivable_payments")
}
```

#### C. SalesLedger 모델 (매출원장)
```prisma
model SalesLedger {
  id              String        @id @default(cuid())

  // 거래 정보
  clientId        String
  client          Client        @relation(fields: [clientId], references: [id])

  orderId         String?

  // 금액
  amount          Decimal       @db.Decimal(12, 2)

  // 일자
  salesDate       DateTime

  // 적요
  description     String?

  createdAt       DateTime      @default(now())

  @@index([clientId])
  @@index([salesDate])
  @@map("sales_ledger")
}
```

#### D. Client 모델 수정
기존 Client 모델에 다음 관계 추가:
```prisma
model Client {
  // ... 기존 필드들

  receivables     Receivable[]
  salesLedger     SalesLedger[]
}
```

### 2. NestJS 모듈 구조

**apps/api/src/modules/accounting/** 디렉토리에 다음 구조 생성:

```
accounting/
├── controllers/
│   └── receivables.controller.ts
├── services/
│   └── receivables.service.ts
├── dto/
│   ├── create-receivable.dto.ts
│   ├── update-receivable.dto.ts
│   └── query-receivables.dto.ts
└── accounting.module.ts
```

### 3. DTO 정의

#### create-receivable.dto.ts
```typescript
import { IsString, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReceivableDto {
  @ApiProperty({ description: '거래처 ID' })
  @IsString()
  clientId: string;

  @ApiProperty({ description: '주문 ID (선택)', required: false })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiProperty({ description: '발생액' })
  @IsNumber()
  @Min(0)
  originalAmount: number;

  @ApiProperty({ description: '발생일' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ description: '수금예정일 (선택)', required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: '비고 (선택)', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
```

#### update-receivable.dto.ts
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateReceivableDto } from './create-receivable.dto';

export class UpdateReceivableDto extends PartialType(CreateReceivableDto) {}
```

#### query-receivables.dto.ts
```typescript
import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryReceivablesDto {
  @ApiPropertyOptional({ description: '거래처 ID' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: '시작일' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '종료일' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '상태 (pending: 미수, paid: 완료)' })
  @IsOptional()
  @IsString()
  status?: 'pending' | 'paid';
}
```

### 4. Service 구현

**receivables.service.ts**에 다음 메서드 구현:

- `create(dto: CreateReceivableDto)` - 미수금 생성
- `findAll(query: QueryReceivablesDto)` - 미수금 목록 조회 (필터링)
- `findOne(id: string)` - 미수금 상세 조회
- `update(id: string, dto: UpdateReceivableDto)` - 미수금 수정
- `remove(id: string)` - 미수금 삭제 (soft delete 권장)

**비즈니스 로직**:
- 생성 시 balance = originalAmount 자동 설정
- 거래처 존재 여부 검증
- 발생일 > 수금예정일 검증

### 5. Controller 구현

**receivables.controller.ts**에 다음 엔드포인트 구현:

```typescript
@Controller('accounting/receivables')
@UseGuards(JwtAuthGuard)
export class ReceivablesController {
  // POST /api/v1/accounting/receivables
  @Post()
  create(@Body() dto: CreateReceivableDto)

  // GET /api/v1/accounting/receivables
  @Get()
  findAll(@Query() query: QueryReceivablesDto)

  // GET /api/v1/accounting/receivables/:id
  @Get(':id')
  findOne(@Param('id') id: string)

  // PUT /api/v1/accounting/receivables/:id
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReceivableDto)

  // DELETE /api/v1/accounting/receivables/:id
  @Delete(':id')
  remove(@Param('id') id: string)
}
```

### 6. 주문 완료 시 자동 미수금 생성

**apps/api/src/modules/order/services/order.service.ts** 수정:

주문 완료 처리 메서드에 다음 로직 추가:

```typescript
async completeOrder(orderId: string): Promise<Order> {
  const order = await this.prisma.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' },
    include: { client: true }
  });

  // 미수금 자동 생성
  await this.receivablesService.create({
    clientId: order.clientId,
    orderId: order.id,
    originalAmount: order.totalAmount,
    issueDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
    description: `주문 ${order.orderNo} 매출`
  });

  return order;
}
```

---

## ✅ 완료 조건

1. **스키마 적용**
   ```bash
   cd apps/api
   npx prisma db push
   npx prisma generate
   ```

2. **API 테스트**
   - POST /api/v1/accounting/receivables (미수금 생성)
   - GET /api/v1/accounting/receivables (목록 조회)
   - GET /api/v1/accounting/receivables/:id (상세 조회)
   - PUT /api/v1/accounting/receivables/:id (수정)
   - DELETE /api/v1/accounting/receivables/:id (삭제)

3. **통합 테스트**
   - 주문 완료 시 미수금 자동 생성 확인
   - 거래처 필터링 동작 확인
   - 기간 필터링 동작 확인

---

## 🔧 실행 명령어

```bash
# 1. Prisma 스키마 적용
cd /c/dev/printing114/apps/api
npx prisma db push

# 2. Prisma Client 재생성
npx prisma generate

# 3. API 서버 재시작
cd /c/dev/printing114
npm run dev

# 4. API 테스트 (Swagger)
# 브라우저에서 http://localhost:3001/api/docs 열기
```

---

## 🚨 주의사항

1. **기존 데이터 백업**: 스키마 변경 전 DB 백업 필수
2. **Decimal 타입**: 금액은 반드시 Decimal 타입 사용 (Float 금지)
3. **트랜잭션**: 주문 완료 + 미수금 생성은 하나의 트랜잭션으로 처리
4. **에러 처리**:
   - 거래처 미존재 시 404 에러
   - 중복 생성 방지 (orderId 기준)
   - 음수 금액 입력 방지

---

## 📝 Claude에게 요청할 내용

```
미수금 관리 기능의 Day 1 작업을 진행해주세요.

1. Prisma 스키마에 Receivable, ReceivablePayment, SalesLedger 모델 추가
2. Client 모델에 receivables, salesLedger 관계 추가
3. apps/api/src/modules/accounting 디렉토리 구조 생성
4. DTO 파일 3개 생성 (create, update, query)
5. ReceivablesService 구현 (CRUD 메서드)
6. ReceivablesController 구현 (5개 엔드포인트)
7. AccountingModule에 의존성 등록
8. OrderService에 주문 완료 시 미수금 자동 생성 로직 추가

모든 파일에 TypeScript 타입 안전성, Swagger 문서화, 에러 처리를 포함해주세요.
완료 후 Prisma db push 및 API 테스트를 실행해주세요.
```
