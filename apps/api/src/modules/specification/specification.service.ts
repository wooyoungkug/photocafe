import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSpecificationDto, UpdateSpecificationDto, SpecificationQueryDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SpecificationService {
    constructor(private prisma: PrismaService) { }

    private generateCode(): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return `SPEC_${timestamp}${random}`.toUpperCase();
    }

    async findAll(query: SpecificationQueryDto) {
        const where: Prisma.SpecificationWhereInput = {};

        if (query.forOutput !== undefined) {
            where.forOutput = query.forOutput;
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

        return this.prisma.specification.findMany({
            where,
            orderBy: [{ squareMeters: 'asc' }, { widthInch: 'asc' }],
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
        const code = this.generateCode();

        // 평방미터 자동 계산: mm를 m로 변환 후 곱하기
        const squareMeters = dto.squareMeters ??
            (dto.widthMm * dto.heightMm) / 1000000;

        return this.prisma.specification.create({
            data: {
                code,
                name: dto.name,
                widthInch: dto.widthInch,
                heightInch: dto.heightInch,
                widthMm: dto.widthMm,
                heightMm: dto.heightMm,
                forOutput: dto.forOutput ?? false,
                forAlbum: dto.forAlbum ?? false,
                forFrame: dto.forFrame ?? false,
                forBooklet: dto.forBooklet ?? false,
                squareMeters: squareMeters,
                description: dto.description,
                sortOrder: dto.sortOrder ?? 0,
            },
        });
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
                forOutput: dto.forOutput,
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
    async findByUsage(usage: 'output' | 'album' | 'frame' | 'booklet') {
        const where: Prisma.SpecificationWhereInput = {
            isActive: true,
        };

        switch (usage) {
            case 'output':
                where.forOutput = true;
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
