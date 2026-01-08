export interface Specification {
    id: string;
    code: string;
    name: string;
    widthInch: number;
    heightInch: number;
    widthMm: number;
    heightMm: number;
    forOutput: boolean;
    forAlbum: boolean;
    forFrame: boolean;
    forBooklet: boolean;
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
    name: string;
    widthInch: number;
    heightInch: number;
    widthMm: number;
    heightMm: number;
    forOutput?: boolean;
    forAlbum?: boolean;
    forFrame?: boolean;
    forBooklet?: boolean;
    squareMeters?: number;
    description?: string;
    sortOrder?: number;
}

export interface UpdateSpecificationRequest extends Partial<CreateSpecificationRequest> {
    isActive?: boolean;
}

export interface SpecificationQuery {
    forOutput?: boolean;
    forAlbum?: boolean;
    forFrame?: boolean;
    forBooklet?: boolean;
    isActive?: boolean;
    search?: string;
}
