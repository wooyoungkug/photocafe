# Printing114 - 주문 시스템 전체 문서

## 1. DB 모델 (Prisma Schema)

### 1.1 Order (주문)
**테이블**: `orders`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | String (CUID) | auto | PK |
| orderNumber | String (Unique) | - | 주문번호 `YYMMDD-NNN` |
| barcode | String (Unique) | - | 바코드 |
| clientId | String (FK) | - | 거래처 ID → Client |
| productPrice | Decimal(12,2) | - | 상품금액 (세전) |
| shippingFee | Decimal(10,2) | 0 | 배송비 |
| tax | Decimal(10,2) | 0 | 부가세 (productPrice * 10%) |
| adjustmentAmount | Decimal(10,2) | 0 | 할인/조정금액 |
| totalAmount | Decimal(12,2) | - | productPrice + tax + shippingFee |
| finalAmount | Decimal(12,2) | - | totalAmount - adjustmentAmount |
| paymentMethod | String | "postpaid" | prepaid, postpaid, card, transfer, mobile |
| paymentStatus | String | "pending" | pending, paid |
| status | String | "pending_receipt" | ORDER_STATUS enum |
| currentProcess | String | "receipt_pending" | PROCESS_STATUS enum |
| isUrgent | Boolean | false | 긴급 주문 여부 |
| isDuplicateOverride | Boolean | false | 중복 경고 무시 여부 |
| requestedDeliveryDate | DateTime? | - | 희망 배송일 |
| customerMemo | String? | - | 고객 메모 |
| productMemo | String? | - | 상품 사양 메모 |
| adminMemo | String? | - | 관리자 메모 |
| orderedAt | DateTime | now() | 접수일 (소급 가능) |
| createdAt | DateTime | now() | 생성일 |
| updatedAt | DateTime | auto | 수정일 |

**관계**: items[], shipping, client, processHistory[], salesLedger

**인덱스**: clientId, status, orderedAt, [clientId+orderedAt], [clientId+status], [status+orderedAt], [paymentStatus+orderedAt]

---

### 1.2 OrderItem (주문 항목)
**테이블**: `order_items`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | String (CUID) | auto | PK |
| orderId | String (FK) | - | → Order (Cascade 삭제) |
| productionNumber | String | - | 생산번호 `ORDERNUM-NN` |
| productId | String (FK) | - | → Product |
| productName | String | - | 상품명 스냅샷 |
| size | String | - | 규격 |
| pages | Int | - | 페이지 수 |
| printMethod | String | - | 인쇄방식 |
| paper | String | - | 용지 |
| bindingType | String | - | 제본방식 |
| coverMaterial | String? | - | 커버 소재 |
| foilName | String? | - | 박명 |
| foilColor | String? | - | 박 색상 |
| finishingOptions | String[] | [] | 후가공 옵션 |
| fabricName | String? | - | 원단명 |
| folderName | String? | - | 앨범 폴더명 (정규화됨) |
| pageLayout | String? | - | single / spread |
| bindingDirection | String? | - | 제본 순서 |
| quantity | Int | - | 수량 |
| unitPrice | Decimal(10,2) | - | 단가 |
| totalPrice | Decimal(12,2) | - | quantity * unitPrice |
| thumbnailUrl | String? | - | 대표 썸네일 |
| totalFileSize | BigInt | 0 | 업로드 파일 총 용량 (bytes) |
| pdfPath | String? | - | 생성된 PDF 경로 |
| pdfStatus | String? | - | pending, generating, completed, failed |
| pdfGeneratedAt | DateTime? | - | PDF 생성 시각 |
| originalsDeleted | Boolean | false | 원본 삭제 여부 |

**JDF 필드**: bindingIntentId, colorIntentId, fileSpecId, foldingIntentId, proofingIntentId, qualityControlId, jdfBindingSide, jdfBindingType, jdfCoatingBack, jdfCoatingFront, jdfNumColorsBack, jdfNumColorsFront

**관계**: order, files[], shipping (OrderItemShipping)

---

### 1.3 OrderFile (주문 파일)
**테이블**: `order_files`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | String (CUID) | auto | PK |
| orderItemId | String (FK) | - | → OrderItem (Cascade 삭제) |
| fileName | String | - | 원본 파일명 |
| fileUrl | String | - | 상대 경로 URL |
| originalPath | String? | - | 절대 경로 |
| thumbnailUrl | String? | - | 썸네일 상대 경로 |
| thumbnailPath | String? | - | 썸네일 절대 경로 |
| pageRange | String | - | "1-10", "1-20,25-30" |
| pageStart | Int | - | 시작 페이지 |
| pageEnd | Int | - | 끝 페이지 |
| width | Int | - | 가로 px |
| height | Int | - | 세로 px |
| widthInch | Float | - | 가로 인치 |
| heightInch | Float | - | 세로 인치 |
| dpi | Int | - | 해상도 |
| fileSize | Int | - | 파일 크기 (bytes) |
| sortOrder | Int | 0 | 정렬 순서 |
| storageStatus | String | "pending" | pending, uploaded, deleted |
| inspectionStatus | String | "pending" | pending, approved, rejected |
| inspectionNote | String? | - | 검수 메모 |
| uploadedAt | DateTime | now() | 업로드 시각 |
| deletedAt | DateTime? | - | 삭제 시각 |

---

### 1.4 OrderShipping (주문 레벨 배송)
**테이블**: `order_shippings`

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (CUID) | PK |
| orderId | String (Unique FK) | → Order (1:1) |
| recipientName | String | 수신자명 |
| phone | String | 연락처 |
| postalCode | String | 우편번호 |
| address | String | 주소 |
| addressDetail | String? | 상세주소 |
| courierCode | String? | 택배사 코드 |
| trackingNumber | String? | 송장번호 |
| shippedAt | DateTime? | 발송일 |
| deliveredAt | DateTime? | 배송완료일 |

---

### 1.5 OrderItemShipping (항목별 배송)
**테이블**: `order_item_shippings`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | String (CUID) | auto | PK |
| orderItemId | String (Unique FK) | - | → OrderItem (1:1) |
| senderType | String | - | company (포토미) / orderer (스튜디오) |
| senderName | String | - | 발송자명 |
| senderPhone | String | - | 발송자 연락처 |
| senderPostalCode | String? | - | 발송지 우편번호 |
| senderAddress | String? | - | 발송지 주소 |
| senderAddressDetail | String? | - | 발송지 상세주소 |
| receiverType | String | - | orderer (스튜디오) / direct_customer (앨범고객) |
| recipientName | String | - | 수신자명 |
| phone | String | - | 수신자 연락처 |
| postalCode | String | - | 수신지 우편번호 |
| address | String | - | 수신지 주소 |
| addressDetail | String? | - | 수신지 상세주소 |
| deliveryMethod | String | - | parcel, motorcycle, damas, freight, pickup |
| deliveryFee | Decimal(10,2) | 0 | 배송비 |
| deliveryFeeType | String? | - | free, conditional, standard |
| courierCode | String? | - | 택배사 코드 |
| trackingNumber | String? | - | 송장번호 |
| shippedAt | DateTime? | - | 발송일 |
| deliveredAt | DateTime? | - | 배송완료일 |

---

### 1.6 ProcessHistory (공정 이력)
**테이블**: `process_histories`

| 필드 | 타입 | 설명 |
|------|------|------|
| id | String (CUID) | PK |
| orderId | String (FK) | → Order (Cascade 삭제) |
| fromStatus | String? | 이전 상태 |
| toStatus | String | 새 상태 |
| processType | String | 이벤트 타입 (아래 참조) |
| note | String? | 상세 메모 |
| processedBy | String | 처리자 ID 또는 "system" |
| processedAt | DateTime | 처리 시각 |

**processType 값**: order_created, status_change, delivery_completed, order_cancelled, admin_adjustment, bulk_status_change, bulk_order_cancelled, bulk_amount_reset, bulk_receipt_date_change, order_duplicated, originals_deleted, file_inspection_started, file_inspection_completed, file_approved, file_rejected, inspection_hold, inspection_sms_sent

---

### 1.7 SalesLedger (매출원장)
**테이블**: `sales_ledgers`

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | String (CUID) | auto | PK |
| ledgerNumber | String (Unique) | - | 매출전표번호 |
| ledgerDate | DateTime | - | 전표일 |
| salesDate | DateTime? | - | 매출일 |
| clientId | String (FK) | - | 거래처 ID |
| clientName | String | - | 거래처명 |
| clientBizNo | String? | - | 사업자번호 |
| orderId | String (Unique FK) | - | → Order |
| orderNumber | String | - | 주문번호 |
| salesType | SalesType enum | - | ALBUM, PRINT, FRAME, GOODS, BINDING, DESIGN, SHIPPING, OTHER |
| taxType | TaxType enum | - | TAXABLE, ZERO_RATED, EXEMPT |
| supplyAmount | Decimal(12,2) | - | 공급가액 |
| vatAmount | Decimal(10,2) | - | 부가세 |
| shippingFee | Decimal(10,2) | 0 | 배송비 |
| adjustmentAmount | Decimal(10,2) | 0 | 조정금액 |
| totalAmount | Decimal(12,2) | - | 합계 |
| receivedAmount | Decimal(12,2) | 0 | 수금액 |
| outstandingAmount | Decimal(12,2) | - | 미수금 |
| paymentMethod | String | "postpaid" | 결제방식 |
| paymentStatus | String | "unpaid" | unpaid, partial, paid, overdue |
| dueDate | DateTime? | - | 결제기한 |
| salesStatus | SalesStatus enum | REGISTERED | REGISTERED, CONFIRMED, CANCELLED |
| description | String? | - | 설명 |
| adminMemo | String? | - | 관리자 메모 |
| createdBy | String | - | 생성자 |
| confirmedBy | String? | - | 확정자 |
| confirmedAt | DateTime? | - | 확정일 |

---

## 2. 상태 Enum

### 2.1 ORDER_STATUS (주문 상태)
**파일**: `apps/api/src/modules/order/dto/order.dto.ts`

| 값 | 라벨 |
|----|------|
| pending_receipt | 접수대기 |
| receipt_completed | 접수완료 |
| in_production | 생산진행 |
| ready_for_shipping | 배송준비 |
| shipped | 배송완료 |
| cancelled | 취소 |

**상태 흐름**: `pending_receipt → receipt_completed → in_production → ready_for_shipping → shipped`
(어느 단계에서든 `cancelled` 전환 가능, 단 shipped 제외)

### 2.2 PROCESS_STATUS (공정 상태)
| 값 | 라벨 |
|----|------|
| receipt_pending | 접수대기 |
| post_processing | 후가공대기 |
| binding | 제본대기 |
| inspection | 검수대기 |
| completed | 완료 |

### 2.3 INSPECTION_PROCESS_TYPES (검수 이벤트)
| 값 | 설명 |
|----|------|
| file_inspection_started | 검수 시작 |
| file_inspection_completed | 검수 완료 |
| file_approved | 파일 승인 |
| file_rejected | 파일 거부 |
| inspection_hold | 검수 보류 |
| inspection_sms_sent | 보류 SMS 발송 |

### 2.4 결제 관련
**결제수단 (paymentMethod)**: prepaid(선입금), postpaid(외상), card(카드), transfer(계좌이체), mobile(모바일)

**결제상태 (paymentStatus)**: pending(미결), paid(결제완료)

**매출장 결제상태**: unpaid(미결), partial(부분결제), paid(완결), overdue(연체)

### 2.5 배송 관련
**배송방법 (deliveryMethod)**: parcel(택배), motorcycle(오토바이퀵), damas(다마스), freight(화물), pickup(방문수령)

**발송자 타입 (senderType)**: company(제작회사), orderer(주문고객)

**수신자 타입 (receiverType)**: orderer(주문고객), direct_customer(앨범고객 직접입력)

**배송비 타입 (deliveryFeeType)**: free(무료), conditional(조건부), standard(표준)

### 2.6 파일 상태
**storageStatus**: pending(대기), uploaded(완료), deleted(삭제)

**inspectionStatus**: pending(대기), approved(승인), rejected(거부)

**pdfStatus**: pending(대기), generating(생성중), completed(완료), failed(실패)

---

## 3. API 엔드포인트

**Base**: `/orders` (JWT 인증 필수)
**파일**: `apps/api/src/modules/order/controllers/order.controller.ts`

### 3.1 조회
| Method | Endpoint | 설명 | 파라미터 |
|--------|----------|------|----------|
| GET | /orders | 주문 목록 | page, limit, search, clientId, status, startDate, endDate, isUrgent |
| GET | /orders/status-counts | 상태별 건수 | - |
| GET | /orders/monthly-summary | 월거래집계 | clientId, startDate, endDate |
| GET | /orders/:id | 주문 상세 | - |
| GET | /orders/:id/history | 공정 이력 | - |
| GET | /orders/:id/download-originals | 원본 ZIP 다운로드 | - |

### 3.2 생성/수정
| Method | Endpoint | 설명 | 제약 |
|--------|----------|------|------|
| POST | /orders | 주문 생성 | - |
| PUT | /orders/:id | 주문 수정 | 접수대기만 |
| PATCH | /orders/:id/status | 상태 변경 | - |
| PATCH | /orders/:id/adjust | 금액/수량 조정 | 관리자 |
| PATCH | /orders/:id/shipping | 배송정보 수정 | - |
| PATCH | /orders/:id/delivered | 배송완료 처리 | - |

### 3.3 삭제/취소
| Method | Endpoint | 설명 | 제약 |
|--------|----------|------|------|
| PATCH | /orders/:id/cancel | 주문 취소 | shipped 불가 |
| DELETE | /orders/:id | 주문 삭제 | 접수대기/취소만 |
| DELETE | /orders/:id/items/:itemId | 항목 삭제 | 접수대기/취소만 |

### 3.4 일괄 처리
| Method | Endpoint | 설명 | Body |
|--------|----------|------|------|
| POST | /orders/bulk/update-status | 상태 일괄 변경 | {orderIds, status, note?} |
| POST | /orders/bulk/cancel | 일괄 취소 | {orderIds, reason?} |
| POST | /orders/bulk/delete | 일괄 삭제 | {orderIds} |
| POST | /orders/bulk/duplicate | 일괄 복제 | {orderIds} |
| POST | /orders/bulk/reset-amount | 금액 0원 처리 | {orderIds} |
| POST | /orders/bulk/update-receipt-date | 접수일 변경 | {orderIds, receiptDate} |
| POST | /orders/bulk/data-cleanup | 기간별 정리 | {startDate, endDate, deleteThumbnails?} |
| POST | /orders/bulk/delete-originals | 원본 일괄 삭제 | {orderIds} |

### 3.5 검수/파일
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /orders/:id/start-inspection | 검수 시작 |
| PATCH | /orders/:id/files/:fileId/inspect | 파일 승인/거부 |
| POST | /orders/:id/hold-inspection | 검수 보류 (SMS 옵션) |
| POST | /orders/:id/complete-inspection | 검수 완료 → PDF 생성 |
| POST | /orders/:id/regenerate-pdf | PDF 재생성 |
| DELETE | /orders/:id/originals | 전체 원본 삭제 |
| DELETE | /orders/:id/items/:itemId/originals | 항목별 원본 삭제 |

### 3.6 유틸리티
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /orders/check-duplicates | 중복 주문 체크 |

---

## 4. DTO 구조

**파일**: `apps/api/src/modules/order/dto/order.dto.ts`

### 4.1 CreateOrderDto
```typescript
{
  clientId: string;              // 필수
  paymentMethod?: string;        // 기본 "postpaid"
  isUrgent?: boolean;
  requestedDeliveryDate?: Date;
  customerMemo?: string;
  productMemo?: string;
  shippingFee?: number;
  isDuplicateOverride?: boolean;
  items: CreateOrderItemDto[];   // 필수, 최소 1개
  shipping: OrderShippingDto;    // 필수
}
```

### 4.2 CreateOrderItemDto
```typescript
{
  productId: string;
  productName: string;
  size: string;
  pages: number;            // min 1
  printMethod: string;
  paper: string;
  bindingType: string;
  quantity: number;          // min 1
  unitPrice: number;         // min 0
  coverMaterial?: string;
  foilName?: string;
  foilColor?: string;
  finishingOptions?: string[];
  thumbnailUrl?: string;
  totalFileSize?: number;
  fabricName?: string;
  folderName?: string;
  pageLayout?: string;       // single / spread
  bindingDirection?: string;
  files?: OrderFileDto[];
  shipping?: OrderItemShippingDto;
}
```

### 4.3 OrderFileDto
```typescript
{
  fileName: string;
  fileUrl: string;
  pageRange: string;
  pageStart: number;
  pageEnd: number;
  width: number;
  height: number;
  widthInch: number;
  heightInch: number;
  dpi: number;
  fileSize: number;
  thumbnailUrl?: string;
  sortOrder?: number;
}
```

### 4.4 OrderItemShippingDto
```typescript
{
  senderType: 'company' | 'orderer';
  senderName: string;
  senderPhone: string;
  senderPostalCode?: string;
  senderAddress?: string;
  senderAddressDetail?: string;
  receiverType: 'orderer' | 'direct_customer';
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  deliveryMethod: 'parcel' | 'motorcycle' | 'damas' | 'freight' | 'pickup';
  deliveryFee: number;
  deliveryFeeType?: 'free' | 'conditional' | 'standard';
}
```

### 4.5 AdjustOrderDto
```typescript
{
  adjustmentAmount?: number;
  adjustmentReason?: string;
  itemUpdates?: Array<{
    itemId: string;
    quantity?: number;
    unitPrice?: number;
  }>;
}
```

### 4.6 검수 DTO
```typescript
// InspectFileDto
{ inspectionStatus: 'approved' | 'rejected', inspectionNote?: string }

// HoldInspectionDto
{ reason: string, sendSms?: boolean }

// CompleteInspectionDto
{ note?: string }
```

### 4.7 일괄처리 DTO
```typescript
// BulkUpdateStatusDto
{ orderIds: string[], status: string }

// BulkCancelDto
{ orderIds: string[], reason?: string }

// BulkUpdateReceiptDateDto
{ orderIds: string[], receiptDate: string }

// BulkDataCleanupDto
{ startDate: string, endDate: string, deleteThumbnails?: boolean }

// CheckDuplicateOrderDto
{ clientId: string, folderNames: string[] }
```

---

## 5. 프론트엔드 훅

### 5.1 use-orders.ts
**파일**: `apps/web/hooks/use-orders.ts`

| 훅 | 타입 | 설명 |
|----|------|------|
| useOrders(params) | Query | 주문 목록 (관리자) |
| useMyOrders(clientId, params) | Query | 내 주문 목록 (고객) |
| useOrder(id) | Query | 주문 상세 |
| useOrderStatusCounts() | Query | 상태별 건수 |
| useOrderHistory(orderId) | Query | 공정 이력 |
| useCreateOrder() | Mutation | 주문 생성 |
| useUpdateOrderStatus() | Mutation | 상태 변경 |
| useCancelOrder() | Mutation | 주문 취소 |
| useAdjustOrder() | Mutation | 금액/수량 조정 |
| useStartInspection() | Mutation | 검수 시작 |
| useInspectFile() | Mutation | 파일 승인/거부 |
| useHoldInspection() | Mutation | 검수 보류 |
| useCompleteInspection() | Mutation | 검수 완료 |

### 5.2 use-order-bulk-actions.ts
**파일**: `apps/web/hooks/use-order-bulk-actions.ts`

| 훅 | 설명 |
|----|------|
| useBulkUpdateStatus() | 상태 일괄 변경 |
| useBulkCancel() | 일괄 취소 |
| useBulkDelete() | 일괄 삭제 |
| useBulkDuplicate() | 일괄 복제 |
| useBulkResetAmount() | 금액 0원 처리 |
| useBulkUpdateReceiptDate() | 접수일 변경 |
| useDataCleanup() | 기간별 정리 |
| useDeleteOrderOriginals() | 원본 삭제 (단건) |
| useBulkDeleteOriginals() | 원본 일괄 삭제 |

### 5.3 use-shipping-data.ts
**파일**: `apps/web/hooks/use-shipping-data.ts`

| 데이터 | 설명 |
|--------|------|
| CompanyShippingInfo | 제작회사 정보 (발송지 드롭다운) |
| OrdererShippingInfo | 고객/스튜디오 정보 (배송지 드롭다운) |
| DeliveryPricingMap | 배송방법별 요금 |

---

## 6. 스토어 (Zustand)

### 6.1 cart-store.ts
**파일**: `apps/web/stores/cart-store.ts`
**저장**: IndexedDB (localStorage 폴백)

```typescript
interface CartItem {
  id: string;
  productId: string;
  productType: 'product' | 'half_product' | 'album-order';
  name: string;
  thumbnailUrl?: string;
  basePrice: number;
  quantity: number;
  options: CartItemOption[];
  totalPrice: number;
  addedAt: string;
  copperPlateInfo?: CopperPlateCartInfo;
  albumOrderInfo?: AlbumOrderCartInfo;
  shippingInfo?: CartShippingInfo;
  isDuplicateOverride?: boolean;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  uploadProgress?: number;        // 0-100
  uploadedFileCount?: number;
  totalFileCount?: number;
  serverFiles?: Array<{...}>;
  tempFolderId?: string;
}
```

**주요 액션**: addItem, removeItem, updateQuantity, updateOptions, updateItemShipping, updateAllItemsShipping, updateAlbumInfo, updateUploadStatus, reorderItems, clearCart

### 6.2 album-order-store.ts
**파일**: `apps/web/stores/album-order-store.ts`
**저장**: localStorage

**5단계 워크플로우**:
1. `print-method` → indigo/inkjet, 4c/6c
2. `page-layout` → single/spread, 제본방향
3. `data-upload` → 폴더/파일 업로드
4. `folder-analysis` → 폴더 검증, 규격 설정
5. `specification` → 출력 규격 선택, 수량 확정

```typescript
interface AlbumFolderData {
  id: string;
  folderName: string;
  folderPath: string;
  files: AlbumUploadedFile[];
  representativeSpec: { widthInch, heightInch, widthPx, heightPx };
  totalSize: number;
  fileCount: number;
  pageCount: number;
  quantity: number;
  hasRatioMismatch: boolean;
}
```

### 6.3 photobook-order-store.ts
**파일**: `apps/web/stores/photobook-order-store.ts`
**저장**: localStorage

**워크플로우**: 편집옵션 → 소재선택 → 수량 → 데이터업로드 → 추가주문 → 장바구니

```typescript
EditStyle: 'SINGLE' | 'SPREAD'
BindingDirection: 'LEFT_START_RIGHT_END' | 'LEFT_START_LEFT_END' | 'RIGHT_START_LEFT_END' | 'RIGHT_START_RIGHT_END'
CoatingType: 'NONE' | 'MATTE' | 'GLOSSY' | 'VELVET'
ValidationStatus: 'PENDING' | 'PASS' | 'APPROVED' | 'REJECTED'
```

---

## 7. 페이지 라우트

### 7.1 관리자 대시보드

| 라우트 | 설명 | 주요 기능 |
|--------|------|-----------|
| /dashboard/orders | 주문 관리 | 목록, 필터, 페이지네이션, 일괄처리, 검수, 원본관리, 퀵에딧 |

**컴포넌트**:
- `order-quick-edit-dialog.tsx` - 항목 사양/수량/가격 퀵에딧
- `bulk-action-toolbar.tsx` - 일괄 작업 UI
- `confirm-action-dialog.tsx` - 확인 모달
- `change-receipt-date-dialog.tsx` - 접수일 변경
- `data-cleanup-dialog.tsx` - 기간별 정리

### 7.2 쇼핑몰

| 라우트 | 설명 |
|--------|------|
| /shop/cart | 장바구니 |
| /shop/order | 주문서 (결제) |
| /shop/order/complete | 주문 완료 |
| /shop/mypage/orders | 내 주문 목록 |
| /shop/mypage/orders/[id] | 주문 상세 |
| /shop/mypage/orders/[id]/receipt | 주문서/영수증 |

**장바구니 컴포넌트** (`apps/web/app/(shop)/cart/_components/`):
- cart-item-card.tsx - 항목 카드 (배송 섹션 포함)
- cart-order-summary.tsx - 가격 요약
- cart-global-shipping.tsx - 전체 배송정보 일괄 적용
- cart-select-bar.tsx - 선택/해제
- cart-thumbnail-gallery.tsx - 썸네일 캐러셀
- cart-step-indicator.tsx - 진행 단계
- cart-mobile-checkout-bar.tsx - 모바일 결제 바
- cart-item-drag-overlay.tsx - 드래그 오버레이
- cart-empty-state.tsx - 빈 장바구니
- cart-delete-dialog.tsx - 삭제 확인

---

## 8. 비즈니스 로직

### 8.1 주문번호 생성
- **형식**: `YYMMDD-NNN` (예: 260216-001)
- **원자성**: PostgreSQL advisory lock (`pg_advisory_xact_lock`)
- **일일 한도**: 999건
- **생산번호**: `주문번호-NN` (예: 260216-001-01)

### 8.2 가격 계산
```
productPrice = SUM(unitPrice * quantity)   # 각 항목 합계
tax = productPrice * 0.1                    # 부가세 10%
totalAmount = productPrice + tax + shippingFee
finalAmount = totalAmount - adjustmentAmount
```

- 선입금/카드 → paymentStatus = "paid"
- 외상/이체 → paymentStatus = "pending" (미납금 = totalAmount)

### 8.3 중복 주문 체크
- **범위**: 시스템설정 `order_duplicate_check_months` (기본 3개월) 또는 거래처별 `duplicateCheckMonths`
- **기준**: folderName (정규화: trim + 연속 공백 → 단일 공백)
- **제외**: 취소 주문
- **처리**: Raw SQL 사용 (성능), isDuplicateOverride로 무시 가능

### 8.4 파일 검수 워크플로우
```
1. startInspection() → currentProcess = "inspection"
2. inspectFile() → 개별 파일 approved/rejected
3. 모든 파일 approved → 자동 completeInspection()
4. holdInspection() → pending_receipt로 롤백 (SMS 옵션)
5. completeInspection() → status = "receipt_completed" + 비동기 PDF 생성
```

### 8.5 파일 관리 정책
- **업로드**: 임시폴더 → 주문 디렉토리로 이동
- **원본 삭제**: shipped 상태만 가능
- **ZIP 다운로드**: orderNumber_originals.zip (folderName별 정리)
- **PDF 생성**: 검수 완료 시 비동기 트리거, 실패 시 수동 재생성

### 8.6 삭제 정책
- **주문 삭제**: pending_receipt 또는 cancelled만
- **항목 삭제**: pending_receipt 또는 cancelled 주문만
- **디스크 정리**: DB 삭제 성공 후 실행
- **원본 삭제**: shipped 후만, ProcessHistory에 기록 (파일 수, 절약 MB)

### 8.7 매출원장 연동
- 주문 생성 시 SalesLedger 자동 생성
- 금액 변경 시 원장 동기화
- 취소 시 상쇄 레코드 생성
- 원장 실패해도 주문 처리는 진행 (폴백)

---

## 9. 파일 저장 경로 구조

```
orders/
└── YYYY/
    └── MM/
        └── DD/
            └── {거래처명}/
                └── {주문번호}/
                    ├── originals/    # 원본 이미지
                    ├── pdf/          # 생성된 PDF
                    └── temp/         # 임시 파일
```

**URL 형식**: `/orders/2026/02/16/포토미/260216-001/originals/image001.jpg`

---

## 10. 배송비 설정 모델

**테이블**: `delivery_pricings`

| 필드 | 타입 | 설명 |
|------|------|------|
| deliveryMethod | String (Unique) | parcel, motorcycle, damas, freight, pickup |
| name | String | 표시명 |
| baseFee | Decimal(10,2) | 기본요금 |
| distanceRanges | Json? | 거리별 구간 [{minDistance, maxDistance, price}] |
| extraPricePerKm | Decimal(10,2)? | km당 추가요금 |
| maxBaseDistance | Int? | 기본요금 적용 최대 거리 (km) |
| nightSurchargeRate | Decimal(5,2)? | 야간 할증 (0.3 = 30%) |
| nightStartHour | Int | 야간 시작 (기본 22시) |
| nightEndHour | Int | 야간 종료 (기본 6시) |
| weekendSurchargeRate | Decimal(5,2)? | 주말 할증 |
| sizeRanges | Json? | 화물 크기/무게 구간 |
| islandFee | Decimal(10,2)? | 도서산간 추가요금 |
| freeThreshold | Decimal(10,2)? | 무료배송 기준금액 |
| packagingFee | Decimal(10,2)? | 포장비 |
| shippingFee | Decimal(10,2)? | 배송비 |

---

## 11. 주요 파일 경로

### Backend
| 파일 | 설명 |
|------|------|
| `apps/api/prisma/schema.prisma` | DB 스키마 |
| `apps/api/src/modules/order/controllers/order.controller.ts` | API 컨트롤러 |
| `apps/api/src/modules/order/services/order.service.ts` | 비즈니스 로직 |
| `apps/api/src/modules/order/dto/order.dto.ts` | DTO + Enum 정의 |

### Frontend
| 파일 | 설명 |
|------|------|
| `apps/web/hooks/use-orders.ts` | 주문 API 훅 |
| `apps/web/hooks/use-order-bulk-actions.ts` | 일괄처리 훅 |
| `apps/web/hooks/use-shipping-data.ts` | 배송 데이터 훅 |
| `apps/web/stores/cart-store.ts` | 장바구니 스토어 |
| `apps/web/stores/album-order-store.ts` | 앨범 주문 스토어 |
| `apps/web/stores/photobook-order-store.ts` | 포토북 주문 스토어 |
| `apps/web/app/(dashboard)/orders/page.tsx` | 관리자 주문 페이지 |
| `apps/web/app/(shop)/cart/page.tsx` | 장바구니 페이지 |
| `apps/web/app/(shop)/order/page.tsx` | 주문서 페이지 |
| `apps/web/app/(shop)/mypage/orders/page.tsx` | 내 주문 목록 |
