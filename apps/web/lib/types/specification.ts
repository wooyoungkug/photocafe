export type Orientation = 'landscape' | 'portrait' | 'square';

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
    forFrame?: boolean;
    forBooklet?: boolean;
    isActive?: boolean;
    search?: string;
}
