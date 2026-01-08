import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Regenerating SalesCategory data with proper UTF-8 encoding...');

    // 기존 SalesCategory 데이터 삭제
    await prisma.salesCategory.deleteMany({});
    console.log('Deleted existing SalesCategory data');

    // 대분류 생성
    const albumCategory = await prisma.salesCategory.create({
        data: {
            code: 'album',
            name: '앨범',
            depth: 1,
            sortOrder: 0,
            isActive: true,
            description: '앨범 관련 제품',
        },
    });
    console.log('Created: 앨범');

    const printCategory = await prisma.salesCategory.create({
        data: {
            code: 'print',
            name: '출력물',
            depth: 1,
            sortOrder: 1,
            isActive: true,
            description: '출력물 관련 제품',
        },
    });
    console.log('Created: 출력물');

    const frameCategory = await prisma.salesCategory.create({
        data: {
            code: 'frame',
            name: '액자',
            depth: 1,
            sortOrder: 2,
            isActive: true,
            description: '액자 관련 제품',
        },
    });
    console.log('Created: 액자');

    const goodsCategory = await prisma.salesCategory.create({
        data: {
            code: 'goods',
            name: '굿즈',
            depth: 1,
            sortOrder: 3,
            isActive: true,
            description: '굿즈 및 기타 제품',
        },
    });
    console.log('Created: 굿즈');

    // 앨범 소분류 생성
    await prisma.salesCategory.createMany({
        data: [
            {
                code: 'album_compressed',
                name: '압축앨범',
                depth: 2,
                parentId: albumCategory.id,
                sortOrder: 0,
                isActive: true,
            },
            {
                code: 'album_photobook',
                name: '화보앨범',
                depth: 2,
                parentId: albumCategory.id,
                sortOrder: 1,
                isActive: true,
            },
            {
                code: 'album_photobook_simple',
                name: '간편북',
                depth: 2,
                parentId: albumCategory.id,
                sortOrder: 2,
                isActive: true,
            },
        ],
    });
    console.log('Created: 앨범 소분류 (압축앨범, 화보앨범, 간편북)');

    console.log('SalesCategory regeneration completed!');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
