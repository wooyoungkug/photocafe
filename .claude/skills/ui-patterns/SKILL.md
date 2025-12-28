---
name: ui-patterns
description: ERP/어드민 UI 패턴. 레이아웃, 네비게이션, 테이블, 폼, 모달 등 UI 컴포넌트 패턴 작업 시 사용합니다.
---

# ERP/어드민 UI 패턴 스킬

인쇄업 ERP 시스템의 UI 패턴 가이드입니다.

## 기술 스택

| 기술 | 용도 |
|------|------|
| **Next.js 15** | App Router, 서버 컴포넌트 |
| **React 19** | UI 라이브러리 |
| **shadcn/ui** | UI 컴포넌트 |
| **Tailwind CSS** | 스타일링 |
| **TanStack Query v5** | 서버 상태 관리 |
| **TanStack Table v8** | 데이터 테이블 |
| **Zustand** | 클라이언트 상태 |
| **React Hook Form + Zod** | 폼 관리/검증 |

---

## 1. 레이아웃 패턴

### 기본 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 헤더 (Header)                                            [사용자] [알림] │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  사이드바   │                    메인 콘텐츠                              │
│  (Sidebar) │                    (Main Content)                          │
│            │                                                            │
│  - 대시보드 │  ┌──────────────────────────────────────────────────────┐  │
│  - 주문관리 │  │ 페이지 헤더 (Page Header)                [액션버튼]   │  │
│  - 상품관리 │  ├──────────────────────────────────────────────────────┤  │
│  - 거래처   │  │                                                      │  │
│  - 가격관리 │  │                  페이지 콘텐츠                        │  │
│  - 생산관리 │  │                  (Page Content)                       │  │
│  - 배송관리 │  │                                                      │  │
│  - 통계    │  │                                                      │  │
│  - 설정    │  │                                                      │  │
│            │  └──────────────────────────────────────────────────────┘  │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 레이아웃 컴포넌트

```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 2. 사이드바 네비게이션

### 메뉴 구조

```typescript
interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  children?: NavItem[];
}

const navigation: NavItem[] = [
  { title: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  {
    title: '주문관리',
    href: '/orders',
    icon: ShoppingCart,
    badge: 5,  // 신규 주문 수
    children: [
      { title: '주문목록', href: '/orders', icon: List },
      { title: '주문등록', href: '/orders/new', icon: Plus },
    ],
  },
  {
    title: '상품관리',
    href: '/products',
    icon: Package,
    children: [
      { title: '완제품', href: '/products', icon: Box },
      { title: '반제품', href: '/products/half', icon: Layers },
      { title: '카테고리', href: '/products/categories', icon: FolderTree },
    ],
  },
  { title: '거래처', href: '/clients', icon: Building2 },
  { title: '가격관리', href: '/pricing', icon: DollarSign },
  { title: '생산관리', href: '/production', icon: Factory },
  { title: '배송관리', href: '/delivery', icon: Truck },
  { title: '통계', href: '/statistics', icon: BarChart3 },
  { title: '설정', href: '/settings', icon: Settings },
];
```

### 사이드바 컴포넌트

```tsx
// components/layout/sidebar.tsx
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-white flex flex-col">
      {/* 로고 */}
      <div className="h-16 flex items-center px-6 border-b">
        <Logo />
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={pathname.startsWith(item.href)}
            />
          ))}
        </ul>
      </nav>

      {/* 하단 사용자 정보 */}
      <div className="p-4 border-t">
        <UserMenu />
      </div>
    </aside>
  );
}
```

---

## 3. 페이지 헤더 패턴

### 기본 페이지 헤더

```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* 브레드크럼 */}
      {breadcrumbs && (
        <nav className="mb-2">
          <ol className="flex items-center space-x-2 text-sm text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="w-4 h-4 mx-2" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-gray-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* 타이틀 + 액션 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

### 사용 예시

```tsx
<PageHeader
  title="주문관리"
  description="주문 목록을 조회하고 관리합니다."
  breadcrumbs={[
    { label: '홈', href: '/' },
    { label: '주문관리' },
  ]}
  actions={
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      신규 주문
    </Button>
  }
/>
```

---

## 4. 데이터 테이블 패턴

### 테이블 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [검색창____________] [필터▼] [기간선택] [내보내기]     [+ 신규등록] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ [전체:150] [접수대기:12] [접수완료:8] [생산진행:5] [배송완료:125]        │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌────┬──────────┬────────┬────────┬────────┬────────┬────────┬──────┐ │
│ │ □  │ 주문번호  │ 거래처  │ 상품    │ 금액    │ 상태    │ 주문일 │ 액션 │ │
│ ├────┼──────────┼────────┼────────┼────────┼────────┼────────┼──────┤ │
│ │ □  │ORD-001   │ A업체  │ 압축앨범 │ 50,000 │ 접수대기 │ 12/28 │ ⋮   │ │
│ │ □  │ORD-002   │ B업체  │ 포토북  │120,000 │ 생산중  │ 12/27 │ ⋮   │ │
│ │ □  │ORD-003   │ C업체  │ 액자    │ 35,000 │ 배송완료 │ 12/26 │ ⋮   │ │
│ └────┴──────────┴────────┴────────┴────────┴────────┴────────┴──────┘ │
├─────────────────────────────────────────────────────────────────────────┤
│ 선택: 2건 [상태변경] [삭제]          [<] 1 2 3 ... 10 [>]  페이지당 [20▼]│
└─────────────────────────────────────────────────────────────────────────┘
```

### TanStack Table 설정

```tsx
// hooks/use-data-table.ts
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from '@tanstack/react-table';

export function useDataTable<T>({
  data,
  columns,
  pageSize = 20,
}: {
  data: T[];
  columns: ColumnDef<T>[];
  pageSize?: number;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
    initialState: {
      pagination: { pageSize },
    },
  });

  return { table, rowSelection };
}
```

### 상태 배지 컴포넌트

```tsx
// components/ui/status-badge.tsx
const statusConfig: Record<string, { label: string; variant: string }> = {
  PENDING: { label: '접수대기', variant: 'warning' },
  RECEIVED: { label: '접수완료', variant: 'info' },
  IN_PRODUCTION: { label: '생산중', variant: 'purple' },
  READY_TO_SHIP: { label: '배송준비', variant: 'cyan' },
  DELIVERED: { label: '배송완료', variant: 'success' },
  CANCELLED: { label: '취소', variant: 'destructive' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: 'default' };

  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
```

---

## 5. 폼 패턴

### 폼 레이아웃

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 주문 등록                                                    [X 닫기]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  거래처 *                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 거래처 검색...                                              [▼] │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  상품 선택 *                                                            │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 상품 유형        [앨범    ▼]  │  │ 앨범 종류      [압축앨범  ▼]  │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 규격              [8x10   ▼]  │  │ 페이지수       [   20    ▼]  │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                         │
│  ┌───────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 수량              [    1    ] │  │ 단가            ₩50,000       │  │
│  └───────────────────────────────┘  └───────────────────────────────┘  │
│                                                                         │
│  메모                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                    [취소]  [주문 등록]  │
└─────────────────────────────────────────────────────────────────────────┘
```

### React Hook Form + Zod

```tsx
// schemas/order.schema.ts
import { z } from 'zod';

export const orderSchema = z.object({
  clientId: z.string().min(1, '거래처를 선택해주세요'),
  productType: z.enum(['OUTPUT', 'ALBUM', 'FRAME', 'GOODS']),
  albumType: z.enum(['PREMIUM_PHOTO', 'COMPRESSED', 'PHOTOBOOK']).optional(),
  spec: z.string().min(1, '규격을 선택해주세요'),
  pages: z.number().min(2).optional(),
  quantity: z.number().min(1, '수량은 1 이상이어야 합니다'),
  memo: z.string().optional(),
});

export type OrderFormData = z.infer<typeof orderSchema>;
```

```tsx
// components/forms/order-form.tsx
export function OrderForm({ onSubmit }: { onSubmit: (data: OrderFormData) => void }) {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: 1,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>거래처 *</FormLabel>
              <FormControl>
                <ClientCombobox
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 나머지 필드들 */}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline">취소</Button>
          <Button type="submit">주문 등록</Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## 6. 모달/시트 패턴

### Dialog (모달)

```tsx
// 확인 다이얼로그
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">삭제</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>
        이 작업은 되돌릴 수 없습니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Sheet (슬라이드 패널)

```tsx
// 상세보기 시트
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">상세보기</Button>
  </SheetTrigger>
  <SheetContent side="right" className="w-[600px]">
    <SheetHeader>
      <SheetTitle>주문 상세</SheetTitle>
      <SheetDescription>주문번호: ORD-2024-001234</SheetDescription>
    </SheetHeader>
    <div className="py-6">
      {/* 상세 내용 */}
    </div>
  </SheetContent>
</Sheet>
```

---

## 7. 필터/검색 패턴

### 검색 + 필터 바

```tsx
export function SearchFilterBar({
  onSearch,
  onFilter,
  filters,
}: SearchFilterBarProps) {
  return (
    <div className="flex items-center gap-4 mb-4">
      {/* 검색 */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="검색..."
          className="pl-10"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* 상태 필터 */}
      <Select onValueChange={(value) => onFilter('status', value)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="상태" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          <SelectItem value="PENDING">접수대기</SelectItem>
          <SelectItem value="RECEIVED">접수완료</SelectItem>
          <SelectItem value="IN_PRODUCTION">생산중</SelectItem>
        </SelectContent>
      </Select>

      {/* 날짜 필터 */}
      <DateRangePicker
        onChange={(range) => onFilter('dateRange', range)}
      />

      {/* 내보내기 */}
      <Button variant="outline">
        <Download className="w-4 h-4 mr-2" />
        내보내기
      </Button>
    </div>
  );
}
```

---

## 8. 탭 패턴

### 상태별 탭

```tsx
export function StatusTabs({
  counts,
  activeStatus,
  onStatusChange,
}: StatusTabsProps) {
  const statuses = [
    { value: 'all', label: '전체', count: counts.total },
    { value: 'PENDING', label: '접수대기', count: counts.pending },
    { value: 'RECEIVED', label: '접수완료', count: counts.received },
    { value: 'IN_PRODUCTION', label: '생산중', count: counts.inProduction },
    { value: 'DELIVERED', label: '배송완료', count: counts.delivered },
  ];

  return (
    <div className="flex items-center gap-1 border-b mb-4">
      {statuses.map((status) => (
        <button
          key={status.value}
          onClick={() => onStatusChange(status.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            activeStatus === status.value
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          )}
        >
          {status.label}
          <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            {status.count}
          </span>
        </button>
      ))}
    </div>
  );
}
```

---

## 9. 로딩/에러 상태

### 스켈레톤 로딩

```tsx
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
```

### 빈 상태

```tsx
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      {action}
    </div>
  );
}
```

---

## 체크리스트

UI 구현 시 확인사항:

- [ ] 반응형 레이아웃 (모바일/태블릿/데스크톱)
- [ ] 다크모드 지원 (선택)
- [ ] 접근성 (키보드 네비게이션, ARIA)
- [ ] 로딩/에러/빈 상태 처리
- [ ] 토스트 알림 (성공/에러)
- [ ] 폼 유효성 검증 메시지
- [ ] 페이지네이션
- [ ] 정렬/필터 상태 URL 동기화
