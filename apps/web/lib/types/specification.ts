export type Orientation = 'landscape' | 'portrait' | 'square';

// ==================== 용도별규격 공통 상수 ====================
// 규격관리(master/specifications)가 기준. 순서/라벨 변경 시 이곳만 수정하면 전체 반영됨.

/** 용도별규격 키 (DB: forIndigoAlbum, forIndigo, ...) */
export type SpecPurposeKey = 'indigoAlbum' | 'indigo' | 'inkjet' | 'album' | 'frame' | 'booklet';

/** DB 필드명 → 용도별규격 키 매핑 */
export const SPEC_PURPOSE_DB_FIELD: Record<SpecPurposeKey, string> = {
    indigoAlbum: 'forIndigoAlbum',
    indigo: 'forIndigo',
    inkjet: 'forInkjet',
    album: 'forAlbum',
    frame: 'forFrame',
    booklet: 'forBooklet',
};

/** 용도별규격 한글 라벨 (정규 순서 유지) */
export const SPEC_PURPOSE_LABELS: Record<SpecPurposeKey, string> = {
    indigoAlbum: '인디고앨범',
    indigo: '인디고출력',
    inkjet: '잉크젯출력',
    album: '잉크젯앨범',
    frame: '액자',
    booklet: '책자',
};

/** 용도별규격 정규 순서 배열 */
export const SPEC_PURPOSE_KEYS: SpecPurposeKey[] = [
    'indigoAlbum', 'indigo', 'inkjet', 'album', 'frame', 'booklet',
];

/** 용도별규격 목록 (key + label) - UI 탭/필터/체크박스 렌더링용 */
export const SPEC_PURPOSE_OPTIONS: { key: SpecPurposeKey; label: string }[] =
    SPEC_PURPOSE_KEYS.map(key => ({ key, label: SPEC_PURPOSE_LABELS[key] }));

export interface Specification {
    id: string;
    code: string;
    name: string;
    widthInch: number;
    heightInch: number;
    widthMm: number;
    heightMm: number;
    orientation: Orientation;
    pairId?: string;
    forIndigo: boolean;   // 인디고출력전용
    forInkjet: boolean;   // 잉크젯출력전용
    forAlbum: boolean;
    forIndigoAlbum: boolean; // 인디고앨범전용
    forFrame: boolean;
    forBooklet: boolean;
    nup: string | null;  // "1++up" | "1+up" | "1up" | "2up" | "4up" | "8up"
    squareMeters: number | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    prices?: SpecificationPrice[];
}

export interface SpecificationPrice {
    id: string;
    specificationId: string;
    priceType: string;
    groupId: string | null;
    price: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateSpecificationRequest {
    name?: string;
    widthInch: number;
    heightInch: number;
    widthMm: number;
    heightMm: number;
    orientation?: Orientation;
    forIndigo?: boolean;   // 인디고출력전용
    forInkjet?: boolean;   // 잉크젯출력전용
    forAlbum?: boolean;
    forIndigoAlbum?: boolean; // 인디고앨범전용
    forFrame?: boolean;
    forBooklet?: boolean;
    squareMeters?: number;
    description?: string;
    sortOrder?: number;
    createPair?: boolean;  // 쌍 자동 생성 여부 (기본값: true)
}

export interface UpdateSpecificationRequest extends Partial<CreateSpecificationRequest> {
    isActive?: boolean;
}

export interface SpecificationQuery {
    forIndigo?: boolean;
    forInkjet?: boolean;
    forAlbum?: boolean;
    forIndigoAlbum?: boolean;
    forFrame?: boolean;
    forBooklet?: boolean;
    isActive?: boolean;
    search?: string;
}
