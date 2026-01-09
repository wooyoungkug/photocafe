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

    // 규격명 생성: "가로x세로" (전달받은 값 그대로 사용)
    private generateSpecName(widthInch: number, heightInch: number): string {
        return `${widthInch}x${heightInch}`;
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

        // squareMeters가 반올림되어 정렬이 정확하지 않을 수 있으므로
        // widthMm * heightMm 실제 값으로 정렬 후, widthMm 내림차순 (가로형 먼저)
        return this.prisma.specification.findMany({
            where,
            orderBy: [
                { squareMeters: 'asc' },  // 대략적 면적순
                { widthMm: 'desc' },       // 같은 면적 내 가로형 먼저
                { heightMm: 'asc' },       // 추가 정렬 기준
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
                forAlbum: dto.forAlbum ?? false,
                forFrame: dto.forFrame ?? false,
                forBooklet: dto.forBooklet ?? false,
                squareMeters: squareMeters,
                description: dto.description,
                sortOrder: dto.sortOrder ?? 0,
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
                    forAlbum: dto.forAlbum ?? false,
                    forFrame: dto.forFrame ?? false,
                    forBooklet: dto.forBooklet ?? false,
                    squareMeters: squareMeters, // 면적은 동일
                    description: dto.description,
                    sortOrder: (dto.sortOrder ?? 0) + 1,
                },
            });

            // 메인 규격에도 pairId 설정
            await this.prisma.specification.update({
                where: { id: mainSpec.id },
                data: { pairId: pairSpec.id },
            });

            return {
                main: mainSpec,
                pair: pairSpec,
                message: `${this.getOrientationLabel(orientation)} 규격과 ${this.getOrientationLabel(pairOrientation)} 규격이 함께 생성되었습니다.`,
            };
        }

        // 정방형이거나 createPair가 false인 경우 단일 규격만 반환
        return mainSpec;
    }

    async update(id: string, dto: UpdateSpecificationDto) {
        await this.findOne(id); // Check if exists

        // 평방미터 자동 계산 (크기가 변경된 경우)
        let squareMeters = dto.squareMeters;
        if (dto.widthMm !== undefined && dto.heightMm !== undefined && squareMeters === undefined) {
            squareMeters = (dto.widthMm * dto.heightMm) / 1000000;
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
            },
        });
    }

    async delete(id: string) {
        await this.findOne(id); // Check if exists

        return this.prisma.specification.delete({
            where: { id },
        });
    }

    async updateSortOrder(items: { id: string; sortOrder: number }[]) {
        const updates = items.map((item) =>
            this.prisma.specification.update({
                where: { id: item.id },
                data: { sortOrder: item.sortOrder },
            }),
        );

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
