---
name: category-management
description: 카테고리 구조 및 메뉴 관리. 상품 분류, 계층 구조, 노출 설정, 카테고리 타입 관리 작업 시 사용합니다.
---

# 카테고리 관리 스킬

포토북/앨범 인쇄업체의 카테고리 및 메뉴 관리 가이드입니다.

## 카테고리 분류 코드 체계

### 코드 구조 (8자리)

```
XX000000 - 대분류
XXXX0000 - 중분류
XXXXXXXX - 소분류

예시:
29000000 - 메인페이지
65000000 - 디지털인쇄
├── 65010000 - HP인디고
├── 65020000 - 잉크젯출력
└── 65030000 - 고급출력
```

### 주요 카테고리 코드

| 코드 | 분류명 | 하위항목수 | 설명 |
|------|--------|------------|------|
| 29000000 | 메인페이지 | - | 메인 랜딩 |
| 65000000 | 디지털인쇄 | 4/9 | HP인디고, 잉크젯 출력 |
| 16000000 | 공지사항 | 0/0 | 상단메뉴 |
| 22000000 | 제품/회사정보 | 0/0 | 상단메뉴 |
| 56000000 | 디지털출력 | 0/75 | 출력 상품 |
| 57000000 | 압축앨범 | 0/753 | 앨범 상품 |
| 62000000 | 화보앨범 | 0/493 | 고급 앨범 |
| 63000000 | 포토북 | 0/56 | 포토북 상품 |
| 66000000 | 종업상품 | 0/18 | 굿즈 상품 |
| 64000000 | 액자 | 2/46 | 상단메뉴 |
| 58000000 | 반제품/기타 | 25/5 | 상단메뉴 |
| 20000000 | 마이메뉴 | 0/0 | 사용자 전용 |
| 67000000 | 이미지관리 | 0/0 | 상단메뉴 |

## 카테고리 타입

| 타입 | 코드 | 설명 | 용도 |
|------|------|------|------|
| HTML | HTML | 정적 콘텐츠 | 공지사항, 회사소개 등 |
| POD상품 | POD | Print On Demand | 주문제작 상품 |
| 편집상품 | EDITOR | 편집기 연동 | 온라인 편집 상품 |
| 반제품상품 | HALF | 반제품/유통상품 | 반제품 관리 |

## 노출 설정 옵션

### 기본 노출
- **노출**: 카테고리 활성화
- **숨김**: 카테고리 비활성화

### 상단메뉴 노출
- **노출**: GNB 메뉴에 표시
- **숨김**: GNB에서 숨김

### 로그인 메뉴 노출
| 옵션 | 설명 |
|------|------|
| 항상노출 | 로그인 여부와 관계없이 표시 |
| 로그인시 노출 | 로그인한 회원에게만 표시 |
| 비로그인시 노출 | 비회원에게만 표시 |

## 생산폼 옵션

카테고리별 생산폼 연동:

| 생산폼 | 설명 | 연동 카테고리 |
|--------|------|--------------|
| 디지털인쇄 | HP인디고/잉크젯 선택 | 출력, 앨범, 포토북 |
| 출력전용 | 낱장 출력 전용 | 디지털출력 |
| 앨범전용 | 앨범 옵션 세트 | 압축앨범, 화보앨범 |
| 액자전용 | 액자 옵션 세트 | 액자 |
| 굿즈전용 | 굿즈 옵션 세트 | 종업상품 |

### 외주생산 체크박스
- 체크 시: 외부 업체 생산 상품
- 미체크: 자체 생산 상품

## 데이터베이스 스키마 확장

### Category 모델 확장

```prisma
model Category {
  id              String     @id @default(cuid())
  code            String     @unique    // 8자리 코드: 65000000
  name            String
  depth           Int        @default(1) // 1: 대분류, 2: 중분류, 3: 소분류

  // 계층 구조
  parentId        String?
  parent          Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children        Category[] @relation("CategoryTree")

  // 노출 설정
  isVisible       Boolean    @default(true)  // 노출/숨김
  isTopMenu       Boolean    @default(false) // 상단메뉴 노출
  loginVisibility String     @default("always") // always, logged_in, logged_out

  // 카테고리 타입
  categoryType    String     @default("HTML") // HTML, POD, EDITOR, HALF

  // 생산 설정
  productionForm  String?    // 생산폼 옵션
  isOutsourced    Boolean    @default(false) // 외주생산 여부

  // 이동경로 (링크)
  linkUrl         String?    // 커스텀 링크 URL

  // 콘텐츠
  htmlContent     String?    @db.Text // HTML 내용

  // 정렬 및 상태
  sortOrder       Int        @default(0)
  isActive        Boolean    @default(true)

  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  // Relations
  products        Product[]
  halfProducts    HalfProduct[]

  @@index([parentId])
  @@index([categoryType])
  @@index([isTopMenu])
  @@map("categories")
}
```

### Enum 정의

```typescript
// 카테고리 타입
enum CategoryType {
  HTML = 'HTML',       // 정적 콘텐츠
  POD = 'POD',         // POD 상품
  EDITOR = 'EDITOR',   // 편집 상품
  HALF = 'HALF',       // 반제품 상품
}

// 로그인 노출 설정
enum LoginVisibility {
  ALWAYS = 'always',           // 항상 노출
  LOGGED_IN = 'logged_in',     // 로그인시 노출
  LOGGED_OUT = 'logged_out',   // 비로그인시 노출
}

// 생산폼 타입
enum ProductionFormType {
  DIGITAL_PRINT = 'digital_print',  // 디지털인쇄
  OUTPUT_ONLY = 'output_only',      // 출력전용
  ALBUM_ONLY = 'album_only',        // 앨범전용
  FRAME_ONLY = 'frame_only',        // 액자전용
  GOODS_ONLY = 'goods_only',        // 굿즈전용
}
```

## API 엔드포인트

### 카테고리 CRUD

```
GET    /api/v1/categories              # 전체 목록 (트리 구조)
GET    /api/v1/categories/flat         # 평면 목록
GET    /api/v1/categories/:id          # 상세 조회
POST   /api/v1/categories              # 생성
PUT    /api/v1/categories/:id          # 수정
DELETE /api/v1/categories/:id          # 삭제
```

### 카테고리 관리

```
PATCH  /api/v1/categories/:id/visibility    # 노출 설정 변경
PATCH  /api/v1/categories/:id/move          # 순서/위치 변경
POST   /api/v1/categories/:id/move-up       # 위로 이동
POST   /api/v1/categories/:id/move-down     # 아래로 이동
POST   /api/v1/categories/:id/move-to-top   # 최상위로 이동
GET    /api/v1/categories/top-menu          # 상단메뉴 목록
```

## DTO 정의

### CreateCategoryDto

```typescript
export class CreateCategoryDto {
  @IsString()
  @Length(8, 8)
  code: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsEnum(CategoryType)
  @IsOptional()
  categoryType?: CategoryType = CategoryType.HTML;

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean = true;

  @IsBoolean()
  @IsOptional()
  isTopMenu?: boolean = false;

  @IsEnum(LoginVisibility)
  @IsOptional()
  loginVisibility?: LoginVisibility = LoginVisibility.ALWAYS;

  @IsString()
  @IsOptional()
  productionForm?: string;

  @IsBoolean()
  @IsOptional()
  isOutsourced?: boolean = false;

  @IsString()
  @IsUrl()
  @IsOptional()
  linkUrl?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;
}
```

### UpdateCategoryDto

```typescript
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
```

### MoveCategoryDto

```typescript
export class MoveCategoryDto {
  @IsString()
  @IsOptional()
  newParentId?: string;

  @IsNumber()
  @IsOptional()
  newSortOrder?: number;
}
```

## 서비스 구현

### CategoryService

```typescript
@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // 트리 구조로 카테고리 조회
  async findAllAsTree(): Promise<CategoryTreeNode[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
      include: {
        _count: {
          select: { products: true, halfProducts: true }
        }
      }
    });

    return this.buildTree(categories);
  }

  private buildTree(categories: Category[], parentId: string | null = null): CategoryTreeNode[] {
    return categories
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        ...cat,
        children: this.buildTree(categories, cat.id),
        productCount: cat._count.products,
        halfProductCount: cat._count.halfProducts,
      }));
  }

  // 상단메뉴용 카테고리 조회
  async findTopMenuCategories(): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        isTopMenu: true,
        isVisible: true,
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // 로그인 상태에 따른 카테고리 필터링
  async findVisibleCategories(isLoggedIn: boolean): Promise<Category[]> {
    const visibilityConditions = isLoggedIn
      ? ['always', 'logged_in']
      : ['always', 'logged_out'];

    return this.prisma.category.findMany({
      where: {
        isActive: true,
        isVisible: true,
        loginVisibility: { in: visibilityConditions },
      },
      orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  // 카테고리 이동 (순서 변경)
  async moveCategory(id: string, dto: MoveCategoryDto): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('카테고리를 찾을 수 없습니다.');
    }

    // 부모 변경 시 depth 재계산
    let newDepth = category.depth;
    if (dto.newParentId !== undefined) {
      if (dto.newParentId === null) {
        newDepth = 1;
      } else {
        const parent = await this.prisma.category.findUnique({
          where: { id: dto.newParentId },
        });
        if (!parent) {
          throw new NotFoundException('부모 카테고리를 찾을 수 없습니다.');
        }
        newDepth = parent.depth + 1;
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        parentId: dto.newParentId,
        depth: newDepth,
        sortOrder: dto.newSortOrder ?? category.sortOrder,
      },
    });
  }

  // 최상위로 이동
  async moveToTop(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: {
        parentId: null,
        depth: 1,
      },
    });
  }

  // 카테고리 코드 생성 (자동)
  async generateCode(parentId?: string): Promise<string> {
    if (!parentId) {
      // 대분류 코드 생성
      const lastCategory = await this.prisma.category.findFirst({
        where: { depth: 1 },
        orderBy: { code: 'desc' },
      });

      const lastCode = lastCategory ? parseInt(lastCategory.code.substring(0, 2)) : 0;
      return `${String(lastCode + 1).padStart(2, '0')}000000`;
    }

    // 하위 카테고리 코드 생성
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException('부모 카테고리를 찾을 수 없습니다.');
    }

    const prefix = parent.code.substring(0, parent.depth * 2);
    const lastChild = await this.prisma.category.findFirst({
      where: { parentId },
      orderBy: { code: 'desc' },
    });

    const lastChildCode = lastChild
      ? parseInt(lastChild.code.substring(parent.depth * 2, (parent.depth + 1) * 2))
      : 0;

    const newCodePart = String(lastChildCode + 1).padStart(2, '0');
    const remainingZeros = '0'.repeat(8 - (parent.depth + 1) * 2);

    return `${prefix}${newCodePart}${remainingZeros}`;
  }
}
```

## 프론트엔드 컴포넌트

### CategoryTree 컴포넌트

```tsx
interface CategoryTreeNode {
  id: string;
  code: string;
  name: string;
  depth: number;
  children: CategoryTreeNode[];
  productCount: number;
  halfProductCount: number;
  isTopMenu: boolean;
}

interface CategoryTreeProps {
  data: CategoryTreeNode[];
  selectedId?: string;
  onSelect: (category: CategoryTreeNode) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}

export function CategoryTree({ data, selectedId, onSelect, onMove }: CategoryTreeProps) {
  const renderNode = (node: CategoryTreeNode, level: number = 0) => (
    <div key={node.id} className="category-node">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted",
          selectedId === node.id && "bg-primary/10"
        )}
        style={{ paddingLeft: `${level * 20 + 12}px` }}
        onClick={() => onSelect(node)}
      >
        {node.children.length > 0 && (
          <ChevronRight className="h-4 w-4" />
        )}

        <span className="text-sm text-muted-foreground">{node.code}</span>

        <span className="flex-1">
          {node.name}
          {node.isTopMenu && (
            <Badge variant="secondary" className="ml-2 text-xs">
              상단메뉴
            </Badge>
          )}
        </span>

        <span className="text-xs text-muted-foreground">
          {node.productCount}/{node.halfProductCount}
        </span>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMove(node.id, 'up');
            }}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onMove(node.id, 'down');
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="category-children">
          {node.children.map(child => renderNode(child, level + 1))}
        </div>
      )}
    </div>
  );

  return (
    <div className="category-tree border rounded-lg">
      {data.map(node => renderNode(node))}
    </div>
  );
}
```

### CategoryEditForm 컴포넌트

```tsx
const categoryTypeOptions = [
  { value: 'HTML', label: 'HTML' },
  { value: 'POD', label: 'POD상품' },
  { value: 'EDITOR', label: '편집상품' },
  { value: 'HALF', label: '반제품상품 (유통상품)' },
];

const loginVisibilityOptions = [
  { value: 'always', label: '항상노출' },
  { value: 'logged_in', label: '로그인시 노출' },
  { value: 'logged_out', label: '비로그인시 노출' },
];

const productionFormOptions = [
  { value: 'digital_print', label: '디지털인쇄' },
  { value: 'output_only', label: '출력전용' },
  { value: 'album_only', label: '앨범전용' },
  { value: 'frame_only', label: '액자전용' },
  { value: 'goods_only', label: '굿즈전용' },
];

export function CategoryEditForm({ category, onSubmit }: CategoryEditFormProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      code: category?.code ?? '',
      name: category?.name ?? '',
      categoryType: category?.categoryType ?? 'HTML',
      isVisible: category?.isVisible ?? true,
      isTopMenu: category?.isTopMenu ?? false,
      loginVisibility: category?.loginVisibility ?? 'always',
      productionForm: category?.productionForm ?? '',
      isOutsourced: category?.isOutsourced ?? false,
      linkUrl: category?.linkUrl ?? '',
      htmlContent: category?.htmlContent ?? '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 부모/선택 카테고리 표시 */}
        <div className="grid grid-cols-2 gap-4">
          <FormItem>
            <FormLabel>부모카테고리</FormLabel>
            <Input value={category?.parent?.code ?? '(00000000)'} disabled />
          </FormItem>
          <FormItem>
            <FormLabel>선택카테고리</FormLabel>
            <Input value={category?.code ?? '(00000000)'} disabled />
          </FormItem>
        </div>

        {/* 카테고리명 + 생산폼옵션 */}
        <div className="flex gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>카테고리명</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="productionForm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>생산폼옵션</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {productionFormOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isOutsourced"
            render={({ field }) => (
              <FormItem className="flex items-end gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel>외주생산</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* 노출/숨김 */}
        <FormField
          control={form.control}
          name="isVisible"
          render={({ field }) => (
            <FormItem>
              <FormLabel>노출/숨김</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value ? 'visible' : 'hidden'}
                  onValueChange={(v) => field.onChange(v === 'visible')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="visible" />
                    <Label>노출</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="hidden" />
                    <Label>숨김</Label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* 상단메뉴 */}
        <FormField
          control={form.control}
          name="isTopMenu"
          render={({ field }) => (
            <FormItem>
              <FormLabel>상단메뉴</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value ? 'visible' : 'hidden'}
                  onValueChange={(v) => field.onChange(v === 'visible')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="visible" />
                    <Label>노출</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="hidden" />
                    <Label>숨김</Label>
                  </div>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* 로그인메뉴 */}
        <FormField
          control={form.control}
          name="loginVisibility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>로그인메뉴</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-4"
                >
                  {loginVisibilityOptions.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.value} />
                      <Label>{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* 카테고리타입 */}
        <FormField
          control={form.control}
          name="categoryType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리타입</FormLabel>
              <FormControl>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex gap-4"
                >
                  {categoryTypeOptions.map(opt => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <RadioGroupItem value={opt.value} />
                      <Label>{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />

        {/* 이동경로 (링크) */}
        <FormField
          control={form.control}
          name="linkUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>이동경로</FormLabel>
              <div className="flex gap-2">
                <span className="text-sm text-muted-foreground">- 링크입력 :</span>
                <FormControl>
                  <Input {...field} placeholder="링크값이 없으면 자동으로 페이지가 생성됩니다." />
                </FormControl>
                <Button type="button" variant="destructive" size="sm">
                  내용삭제
                </Button>
              </div>
              <p className="text-xs text-orange-500">
                - 링크값이 없으면 자동으로 페이지가 생성됩니다.
              </p>
            </FormItem>
          )}
        />

        {/* HTML 에디터 */}
        <FormField
          control={form.control}
          name="htmlContent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>내용입력 (HTML)</FormLabel>
              <FormControl>
                <HtmlEditor value={field.value} onChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* 버튼 */}
        <div className="flex justify-center gap-2">
          <Button type="submit">저장하기</Button>
          <Button type="button" variant="outline">취소하기</Button>
        </div>
      </form>
    </Form>
  );
}
```

### CategoryPage 레이아웃

```tsx
export default function CategoryManagementPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { data: categories } = useCategories();
  const { mutate: updateCategory } = useUpdateCategory();
  const { mutate: moveCategory } = useMoveCategory();

  return (
    <div className="container py-6">
      <PageHeader
        title="홈페이지 메뉴관리"
        description="메뉴별 타입을 설정하여 시스템에 적용합니다."
      />

      <div className="grid grid-cols-[400px_1fr] gap-6 mt-6">
        {/* 좌측: 카테고리 트리 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-3 text-sm font-medium">
                <span>분류코드</span>
                <span>분류명 (반제수/제품수)</span>
                <span className="text-right">이동</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <CategoryTree
              data={categories}
              selectedId={selectedCategory?.id}
              onSelect={setSelectedCategory}
              onMove={(id, direction) => {
                moveCategory({ id, direction });
              }}
            />
          </CardContent>
        </Card>

        {/* 우측: 카테고리 편집 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>카테고리 편집</CardTitle>
              <Button
                variant="link"
                className="text-red-500"
                onClick={() => setSelectedCategory(null)}
              >
                최상위로 이동 ▲
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedCategory ? (
              <CategoryEditForm
                category={selectedCategory}
                onSubmit={(data) => {
                  updateCategory({ id: selectedCategory.id, ...data });
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-12">
                좌측에서 카테고리를 선택하세요.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

## API 훅 (TanStack Query)

```typescript
// hooks/useCategories.ts
export function useCategories() {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: () => api.get<CategoryTreeNode[]>('/categories'),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCategoryInput) =>
      api.put(`/categories/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useMoveCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      api.post(`/categories/${id}/move-${direction}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}
```

## 체크리스트

카테고리 관리 기능 구현 시 확인사항:

- [ ] 카테고리 트리 컴포넌트 (좌측 패널)
- [ ] 카테고리 편집 폼 (우측 패널)
- [ ] 8자리 코드 자동 생성
- [ ] 계층 구조 (대/중/소분류)
- [ ] 노출/숨김 설정
- [ ] 상단메뉴 노출 설정
- [ ] 로그인 메뉴 노출 설정 (항상/로그인시/비로그인시)
- [ ] 카테고리 타입 (HTML/POD/편집/반제품)
- [ ] 생산폼 옵션 연동
- [ ] 외주생산 체크박스
- [ ] 이동경로 (링크) 설정
- [ ] HTML 에디터 연동
- [ ] 순서 이동 (위/아래/최상위)
- [ ] 상품 수 표시 (반제품수/완제품수)
