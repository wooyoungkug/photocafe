import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSpecificationDto, UpdateSpecificationDto, SpecificationQueryDto } from './dto';
import { Prisma } from '@prisma/client';

type Orientation = 'landscape' | 'portrait' | 'square';

@Injectable()
export class SpecificationService {
    constructor(private prisma: PrismaService) { }

    private generateCode(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `SPEC_${timestamp}${random}`.toUpperCase();
    }

    // 방향 결정: 가로=세로면 정방형, 가로>세로면 가로형, 가로<세로면 세로형
    private determineOrientation(width: number, height: number): Orientation {
        if (width === height) return 'square';
        return width > height ? 'landscape' : 'portrait';
    }

    // 방향 라벨 반환
    private getOrientationLabel(orientation: Orientation): string {
        switch (orientation) {
            case 'landscape': return '가로형';
            case 'portrait': return '세로형';
            case 'square': return '정방형';
            default: return '';
        }
    }

    // 규격명 생성: "가로x세로" 형식 (실제 widthInch x heightInch)
    private generateSpecName(widthInch: number, heightInch: number): string {
        // 6x4 인치는 항상 "6x4"로 표기
        if ((widthInch === 6 && heightInch === 4) || (widthInch === 4 && heightInch === 6)) {
            return '6x4';
        }
        return `${widthInch}x${heightInch}`;
    }

    // Nup 계산 (면적 기준)
    private calculateNup(widthInch: number, heightInch: number): string {
        const sqInch = widthInch * heightInch;
        if (sqInch >= 200) return '1++up';
        if (sqInch >= 100) return '1+up';
        if (sqInch >= 50) return '1up';
        if (sqInch >= 25) return '2up';
        return '4up';
    }

    async findAll(query: SpecificationQueryDto) {
        const where: Prisma.SpecificationWhereInput = {};

        if (query.forIndigo !== undefined) {
            where.forIndigo = query.forIndigo;
        }
        if (query.forInkjet !== undefined) {
            where.forInkjet = query.forInkjet;
        }
        if (query.forAlbum !== undefined) {
            where.forAlbum = query.forAlbum;
        }
        if (query.forFrame !== undefined) {
            where.forFrame = query.forFrame;
        }
        if (query.forBooklet !== undefined) {
            where.forBooklet = query.forBooklet;
        }
        if (query.isActive !== undefined) {
            where.isActive = query.isActive;
        }
        if (query.search) {
            where.name = {
                contains: query.search,
                mode: 'insensitive',
            };
        }

        // sortOrder 기준으로 정렬 (사용자 정의 순서)
        return this.prisma.specification.findMany({
            where,
            orderBy: [
                { sortOrder: 'asc' },
                { squareMeters: 'asc' },
            ],
            include: {
                prices: true,
            },
        });
    }

    async findOne(id: string) {
        const specification = await this.prisma.specification.findUnique({
            where: { id },
            include: {
                prices: true,
            },
        });

        if (!specification) {
            throw new NotFoundException(`규격 ID ${id}를 찾을 수 없습니다`);
        }

        return specification;
    }

    async create(dto: CreateSpecificationDto) {
        // 1. 방향 결정 (입력된 값 기준)
        const inputOrientation = this.determineOrientation(dto.widthInch, dto.heightInch);
        const orientation = dto.orientation || inputOrientation;

        // 2. 실제 저장할 가로/세로 값 결정
        // 만약 가로형인데 width < height이면 스왑, 세로형인데 width > height이면 스왑
        let widthInch = dto.widthInch;
        let heightInch = dto.heightInch;
        let widthMm = dto.widthMm;
        let heightMm = dto.heightMm;

        if (orientation === 'landscape' && dto.widthInch < dto.heightInch) {
            // 가로형인데 세로가 더 큰 경우 스왑
            [widthInch, heightInch] = [heightInch, widthInch];
            [widthMm, heightMm] = [heightMm, widthMm];
        } else if (orientation === 'portrait' && dto.widthInch > dto.heightInch) {
            // 세로형인데 가로가 더 큰 경우 스왑
            [widthInch, heightInch] = [heightInch, widthInch];
            [widthMm, heightMm] = [heightMm, widthMm];
        }

        const code = this.generateCode();
        const name = dto.name || this.generateSpecName(widthInch, heightInch);

        // 평방미터 자동 계산: mm를 m로 변환 후 곱하기
        const squareMeters = dto.squareMeters ?? (widthMm * heightMm) / 1000000;

        // Nup 계산 (앨범 전용)
        const forAlbum = dto.forAlbum ?? false;
        const nupSqInch = forAlbum ? widthInch * heightInch : null;
        const nup = forAlbum ? (dto.nup || this.calculateNup(widthInch, heightInch)) : null;

        // 3. 메인 규격 생성
        const mainSpec = await this.prisma.specification.create({
            data: {
                code,
                name,
                widthInch,
                heightInch,
                widthMm,
                heightMm,
                orientation,
                forIndigo: dto.forIndigo ?? false,
                forInkjet: dto.forInkjet ?? false,
                forAlbum,
                forFrame: dto.forFrame ?? false,
                forBooklet: dto.forBooklet ?? false,
                squareMeters: squareMeters,
                description: dto.description,
                sortOrder: dto.sortOrder ?? 0,
                nup,
                nupSqInch,
            },
        });

        // 4. 쌍 자동 생성 (createPair가 false가 아니고, 정방형이 아닌 경우)
        // 정방형은 가로=세로이므로 쌍이 필요없음
        if (dto.createPair !== false && orientation !== 'square') {
            const pairOrientation: Orientation = orientation === 'landscape' ? 'portrait' : 'landscape';
            const pairCode = this.generateCode();
            const pairName = this.generateSpecName(heightInch, widthInch);

            const pairSpec = await this.prisma.specification.create({
                data: {
                    code: pairCode,
                    name: pairName,
                    widthInch: heightInch,  // 스왑
                    heightInch: widthInch,  // 스왑
                    widthMm: heightMm,      // 스왑
                    heightMm: widthMm,      // 스왑
                    orientation: pairOrientation,
                    pairId: mainSpec.id,    // 메인 규격 참조
                    forIndigo: dto.forIndigo ?? false,
                    forInkjet: dto.forInkjet ?? false,
                    forAlbum,
                    forFrame: dto.forFrame ?? false,
                    forBooklet: dto.forBooklet ?? false,
                    squareMeters: squareMeters, // 면적은 동일
                    description: dto.description,
                    sortOrder: (dto.sortOrder ?? 0) + 1,
                    nup,        // 면적이 같으므로 nup도 동일
                    nupSqInch,  // 면적이 같으므로 nupSqInch도 동일
                },
            });

            // 메인 규격에도 pairId 설정
            await this.prisma.specification.update({
                where: { id: mainSpec.id },
                data: { pairId: pairSpec.id },
            });

            // 5. 매칭되는 상품에 규격 자동 추가 (메인 + 페어)
            const autoLinked = await this.autoLinkToProducts([
                { spec: mainSpec, name, widthMm, heightMm },
                { spec: pairSpec, name: pairName, widthMm: heightMm, heightMm: widthMm },
            ], dto);

            return {
                main: mainSpec,
                pair: pairSpec,
                autoLinked,
                message: `${this.getOrientationLabel(orientation)} 규격과 ${this.getOrientationLabel(pairOrientation)} 규격이 함께 생성되었습니다. ${autoLinked.linkedProducts}개 상품에 자동 추가됨.`,
            };
        }

        // 5. 매칭되는 상품에 규격 자동 추가 (단일)
        const autoLinked = await this.autoLinkToProducts([
            { spec: mainSpec, name, widthMm, heightMm },
        ], dto);

        return {
            ...mainSpec,
            autoLinked,
            message: autoLinked.linkedProducts > 0
                ? `규격이 생성되었습니다. ${autoLinked.linkedProducts}개 상품에 자동 추가됨.`
                : undefined,
        };
    }

    /**
     * 새로 생성된 규격을 매칭되는 상품에 자동으로 ProductSpecification으로 추가
     * - 상품의 outputPriceSettings 기반으로 INDIGO/INKJET 판별
     * - 규격의 forIndigo/forInkjet/forAlbum 등 플래그와 매칭
     */
    private async autoLinkToProducts(
        specs: Array<{ spec: { id: string }; name: string; widthMm: number; heightMm: number }>,
        dto: CreateSpecificationDto,
    ) {
        const forIndigo = dto.forIndigo ?? false;
        const forInkjet = dto.forInkjet ?? false;
        const forAlbum = dto.forAlbum ?? false;
        const forFrame = dto.forFrame ?? false;
        const forBooklet = dto.forBooklet ?? false;

        // 용도 플래그가 하나도 없으면 스킵
        if (!forIndigo && !forInkjet && !forAlbum && !forFrame && !forBooklet) {
            return { linkedProducts: 0, details: [] };
        }

        // outputPriceSettings가 있는 상품 조회
        const products = await this.prisma.product.findMany({
            where: {
                isActive: true,
                NOT: { outputPriceSettings: { equals: Prisma.DbNull } },
            },
            select: {
                id: true,
                productName: true,
                outputPriceSettings: true,
                specifications: {
                    select: { specificationId: true },
                },
            },
        });

        const details: Array<{ productId: string; productName: string; addedSpecs: number }> = [];

        for (const product of products) {
            const outputSettings = product.outputPriceSettings as any[];
            if (!Array.isArray(outputSettings) || outputSettings.length === 0) continue;

            const hasIndigo = outputSettings.some((s: any) => s.outputMethod === 'INDIGO');
            const hasInkjet = outputSettings.some((s: any) => s.outputMethod === 'INKJET');

            // 상품 출력방식과 규격 용도 플래그 매칭 확인
            const isMatch =
                (hasIndigo && forIndigo) ||
                (hasInkjet && (forInkjet || forAlbum || forFrame || forBooklet));

            if (!isMatch) continue;

            // 이미 연결된 규격 ID 목록
            const existingSpecIds = new Set(
                product.specifications.map(s => s.specificationId).filter(Boolean),
            );

            // 기존 규격 개수 (sortOrder 결정용)
            const maxSortOrder = product.specifications.length;

            let addedCount = 0;
            for (let i = 0; i < specs.length; i++) {
                const { spec, name, widthMm, heightMm } = specs[i];

                // 이미 연결되어 있으면 스킵
                if (existingSpecIds.has(spec.id)) continue;

                await this.prisma.productSpecification.create({
                    data: {
                        productId: product.id,
                        specificationId: spec.id,
                        name,
                        widthMm,
                        heightMm,
                        price: 0,
                        isDefault: false,
                        sortOrder: maxSortOrder + i,
                    },
                }).catch(() => {
                    // unique constraint 충돌 시 무시 (이미 존재)
                });

                addedCount++;
            }

            if (addedCount > 0) {
                details.push({
                    productId: product.id,
                    productName: product.productName,
                    addedSpecs: addedCount,
                });
            }
        }

        return {
            linkedProducts: details.length,
            details,
        };
    }

    async update(id: string, dto: UpdateSpecificationDto) {
        const existing = await this.findOne(id); // Check if exists

        // 평방미터 자동 계산 (크기가 변경된 경우)
        let squareMeters = dto.squareMeters;
        if (dto.widthMm !== undefined && dto.heightMm !== undefined && squareMeters === undefined) {
            squareMeters = (dto.widthMm * dto.heightMm) / 1000000;
        }

        // Nup 계산 (앨범 전용)
        const forAlbum = dto.forAlbum ?? existing.forAlbum;
        const widthInch = dto.widthInch ?? Number(existing.widthInch);
        const heightInch = dto.heightInch ?? Number(existing.heightInch);

        let nup = dto.nup;
        let nupSqInch = dto.nupSqInch;

        // forAlbum이 변경되거나 크기가 변경된 경우 Nup 재계산
        if (forAlbum) {
            nupSqInch = nupSqInch ?? widthInch * heightInch;
            nup = nup || this.calculateNup(widthInch, heightInch);
        } else {
            // 앨범이 아니면 undefined로 설정
            nup = undefined;
            nupSqInch = undefined;
        }

        return this.prisma.specification.update({
            where: { id },
            data: {
                name: dto.name,
                widthInch: dto.widthInch,
                heightInch: dto.heightInch,
                widthMm: dto.widthMm,
                heightMm: dto.heightMm,
                forIndigo: dto.forIndigo,
                forInkjet: dto.forInkjet,
                forAlbum: dto.forAlbum,
                forFrame: dto.forFrame,
                forBooklet: dto.forBooklet,
                squareMeters: squareMeters,
                description: dto.description,
                sortOrder: dto.sortOrder,
                isActive: dto.isActive,
                nup,
                nupSqInch,
            },
        });
    }

    async delete(id: string) {
        const spec = await this.findOne(id); // Check if exists

        // 쌍이 있으면 함께 삭제
        if (spec.pairId) {
            await this.prisma.specification.deleteMany({
                where: {
                    OR: [
                        { id: id },
                        { id: spec.pairId },
                    ],
                },
            });
            return { deleted: 2, message: '규격과 쌍이 함께 삭제되었습니다.' };
        }

        await this.prisma.specification.delete({
            where: { id },
        });
        return { deleted: 1 };
    }

    async updateSortOrder(items: { id: string; sortOrder: number }[]) {
        // 쌍도 함께 업데이트하기 위해 pairId 조회
        const specs = await this.prisma.specification.findMany({
            where: { id: { in: items.map(i => i.id) } },
            select: { id: true, pairId: true },
        });

        const updates: any[] = [];
        const processedPairs = new Set<string>();

        for (const item of items) {
            const spec = specs.find((s: { id: string }) => s.id === item.id);

            updates.push(
                this.prisma.specification.update({
                    where: { id: item.id },
                    data: { sortOrder: item.sortOrder },
                })
            );

            // 쌍이 있고 아직 처리하지 않았으면 쌍도 함께 업데이트
            if (spec?.pairId && !processedPairs.has(spec.pairId)) {
                processedPairs.add(spec.pairId);
                updates.push(
                    this.prisma.specification.update({
                        where: { id: spec.pairId },
                        data: { sortOrder: item.sortOrder + 1 }, // 쌍은 바로 다음 순서
                    })
                );
            }
        }

        await this.prisma.$transaction(updates);
        return { success: true };
    }

    // 용도별로 규격 목록 가져오기 (상품 등록 시 사용)
    async findByUsage(usage: 'indigo' | 'inkjet' | 'album' | 'frame' | 'booklet') {
        const where: Prisma.SpecificationWhereInput = {
            isActive: true,
        };

        switch (usage) {
            case 'indigo':
                where.forIndigo = true;
                break;
            case 'inkjet':
                where.forInkjet = true;
                break;
            case 'album':
                where.forAlbum = true;
                break;
            case 'frame':
                where.forFrame = true;
                break;
            case 'booklet':
                where.forBooklet = true;
                break;
        }

        return this.prisma.specification.findMany({
            where,
            orderBy: [{ squareMeters: 'asc' }, { widthInch: 'asc' }],
        });
    }
}
