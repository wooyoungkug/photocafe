import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedUsers() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'wooceo@gmail.com' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('color060', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'wooceo@gmail.com',
        password: hashedPassword,
        name: '관리자',
        role: 'admin',
        isActive: true,
      },
    });
    console.log('Admin user created:', admin.email);

    await prisma.user.create({
      data: {
        email: 'manager@printing-erp.com',
        password: hashedPassword,
        name: '매니저',
        role: 'manager',
        isActive: true,
      },
    });
    console.log('Manager user created');
  } else {
    console.log('Admin user already exists');
  }
}

async function seedCategories() {
  const existingCategories = await prisma.category.count();
  if (existingCategories > 0) {
    console.log(`Categories already exist (${existingCategories} items)`);
    return;
  }

  // 대분류: 디지털출력
  const digitalOutput = await prisma.category.create({
    data: {
      code: '01000000',
      name: '디지털출력',
      level: 'large',
      depth: 1,
      isVisible: true,
      isTopMenu: true,
      loginVisibility: 'always',
      categoryType: 'HTML',
      sortOrder: 0,
      isActive: true,
    },
  });
  console.log('Category created:', digitalOutput.name);

  // 중분류: 인디고출력
  await prisma.category.create({
    data: {
      code: '01010000',
      name: '인디고출력',
      level: 'medium',
      depth: 2,
      parentId: digitalOutput.id,
      isVisible: true,
      isTopMenu: false,
      loginVisibility: 'always',
      categoryType: 'HTML',
      sortOrder: 0,
      isActive: true,
    },
  });

  // 중분류: 잉크젯플로터출력
  await prisma.category.create({
    data: {
      code: '01020000',
      name: '잉크젯플로터출력',
      level: 'medium',
      depth: 2,
      parentId: digitalOutput.id,
      isVisible: true,
      isTopMenu: false,
      loginVisibility: 'always',
      categoryType: 'HTML',
      sortOrder: 1,
      isActive: true,
    },
  });

  // 대분류: 디지털앨범
  const digitalAlbum = await prisma.category.create({
    data: {
      code: '02000000',
      name: '디지털앨범',
      level: 'large',
      depth: 1,
      isVisible: true,
      isTopMenu: true,
      loginVisibility: 'always',
      categoryType: 'HTML',
      sortOrder: 1,
      isActive: true,
    },
  });
  console.log('Category created:', digitalAlbum.name);

  // 중분류: 압축앨범
  await prisma.category.create({
    data: {
      code: '02010000',
      name: '압축앨범',
      level: 'medium',
      depth: 2,
      parentId: digitalAlbum.id,
      isVisible: true,
      isTopMenu: false,
      loginVisibility: 'always',
      categoryType: 'HTML',
      sortOrder: 0,
      isActive: true,
    },
  });

  // 중분류: 화보앨범
  await prisma.category.create({
    data: {
      code: '02020000',
      name: '화보앨범',
      level: 'medium',
      depth: 2,
      parentId: digitalAlbum.id,
      isVisible: true,
      isTopMenu: false,
      loginVisibility: 'always',
      categoryType: 'HTML',
      sortOrder: 1,
      isActive: true,
    },
  });

  console.log('Categories seeded: 6 items');
}

async function seedSpecifications() {
  const existingSpecs = await prisma.specification.count();
  if (existingSpecs > 0) {
    console.log(`Specifications already exist (${existingSpecs} items)`);
    return;
  }

  await prisma.specification.create({
    data: {
      code: 'SPEC_14X11',
      name: '14x11',
      widthInch: 14.0,
      heightInch: 11.0,
      widthMm: 355.6,
      heightMm: 279.4,
      forIndigo: true,
      forInkjet: true,
      forAlbum: true,
      forFrame: true,
      forBooklet: false,
      squareMeters: 0.10,
      description: '',
      sortOrder: 0,
      isActive: true,
    },
  });

  await prisma.specification.create({
    data: {
      code: 'SPEC_11X15',
      name: '11x15',
      widthInch: 11.0,
      heightInch: 15.0,
      widthMm: 279.4,
      heightMm: 381.0,
      forIndigo: true,
      forInkjet: true,
      forAlbum: true,
      forFrame: true,
      forBooklet: false,
      squareMeters: 0.11,
      description: '',
      sortOrder: 1,
      isActive: true,
    },
  });

  console.log('Specifications seeded: 2 items');
}

async function main() {
  console.log('Starting seed...');

  await seedUsers();
  await seedCategories();
  await seedSpecifications();

  console.log('Seed completed');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
