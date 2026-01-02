import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 기존 admin 사용자가 있는지 확인
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@printing-erp.com' },
  });

  if (!existingAdmin) {
    // 관리자 계정 생성
    const hashedPassword = await bcrypt.hash('admin1234', 10);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@printing-erp.com',
        password: hashedPassword,
        name: '관리자',
        role: 'admin',
        isActive: true,
      },
    });
    console.log('Admin user created:', admin.email);

    // 매니저 계정 생성
    const manager = await prisma.user.create({
      data: {
        email: 'manager@printing-erp.com',
        password: hashedPassword,
        name: '매니저',
        role: 'manager',
        isActive: true,
      },
    });
    console.log('Manager user created:', manager.email);
  } else {
    console.log('Admin user already exists');
  }

  console.log('Seed completed');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
