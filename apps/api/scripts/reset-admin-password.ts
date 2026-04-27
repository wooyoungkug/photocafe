// admin 비밀번호 재설정 스크립트
// 사용법:
//   RESET_ADMIN_PASSWORD='새비번' [DATABASE_URL='...'] npx ts-node scripts/reset-admin-password.ts
//
// - RESET_ADMIN_PASSWORD 환경변수 필수 (>=8자)
// - DATABASE_URL 미지정 시 apps/api/.env 의 값 사용 (= 로컬 DB)
// - 운영 적용 시 DATABASE_URL 을 Railway DATABASE_PUBLIC_URL 로 명시 주입

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main(): Promise<void> {
  const password = process.env.RESET_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    console.error('ERR: RESET_ADMIN_PASSWORD env (>=8 chars) required');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await prisma.staff.updateMany({
      where: { staffId: 'admin' },
      data: { password: hash, isActive: true, status: 'active' },
    });
    console.log(`updated=${result.count}`);
  } catch (e) {
    console.error('ERR:', (e as Error).message);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
