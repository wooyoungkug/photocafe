/**
 * User → Client 통합 마이그레이션 스크립트
 *
 * 목적: User 모델을 폐지하고 Client를 단일 고객 ID로 통합
 * - Employment.userId → Employment.memberClientId (사람 = Client)
 * - Employment.clientId → Employment.companyClientId (회사 = Client)
 * - User 데이터를 Client로 이관
 *
 * ⚠️ 주의: 실행 전 반드시 DB 백업을 진행하세요!
 *
 * 실행 방법:
 * npx tsx apps/api/scripts/migrate-user-to-client.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateClientCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `E${ts}${rand}`;
}

async function main() {
  console.log('=== User → Client 통합 마이그레이션 시작 ===\n');

  // Step 1: 새 컬럼 추가
  console.log('[1/7] Employment 테이블에 새 컬럼 추가...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "employments" ADD COLUMN IF NOT EXISTS "memberClientId" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "employments" ADD COLUMN IF NOT EXISTS "companyClientId" TEXT`);

  console.log('[1/7] Client 테이블에 새 필드 추가...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "profileImage" TEXT`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3)`);

  // Step 2: 전체 User 조회
  console.log('\n[2/7] User 데이터 조회...');
  const users = await prisma.$queryRawUnsafe(`
    SELECT * FROM "users"
  `) as any[];
  console.log(`  → ${users.length}명의 User 발견`);

  // Step 3: User → Client 매핑 생성
  console.log('\n[3/7] User → Client 매핑 생성...');
  const userToClientMap = new Map<string, string>();
  let createdCount = 0;
  let linkedCount = 0;

  for (const user of users) {
    // 이미 연결된 Client가 있는지 확인
    const linkedClients = await prisma.$queryRawUnsafe(
      `SELECT "id", "password", "profileImage", "lastLoginAt" FROM "clients" WHERE "userId" = $1`,
      user.id,
    ) as any[];

    if (linkedClients.length > 0) {
      const client = linkedClients[0];
      // Client에 User의 추가 정보 복사
      await prisma.$executeRawUnsafe(`
        UPDATE "clients" SET
          "profileImage" = COALESCE("profileImage", $1),
          "lastLoginAt" = COALESCE("lastLoginAt", $2),
          "password" = COALESCE("password", $3)
        WHERE "id" = $4
      `, user.profileImage, user.lastLoginAt, user.passwordHash, client.id);

      userToClientMap.set(user.id, client.id);
      linkedCount++;
      console.log(`  ✓ User[${user.email}] → 기존 Client[${client.id}] 연결`);
    } else {
      // 이메일로 기존 Client 검색 (userId는 없지만 같은 이메일)
      const emailClients = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "clients" WHERE "email" = $1 LIMIT 1`,
        user.email,
      ) as any[];

      if (emailClients.length > 0) {
        const client = emailClients[0];
        await prisma.$executeRawUnsafe(`
          UPDATE "clients" SET
            "profileImage" = COALESCE("profileImage", $1),
            "lastLoginAt" = COALESCE("lastLoginAt", $2),
            "password" = COALESCE("password", $3),
            "userId" = $4
          WHERE "id" = $5
        `, user.profileImage, user.lastLoginAt, user.passwordHash, user.id, client.id);

        userToClientMap.set(user.id, client.id);
        linkedCount++;
        console.log(`  ✓ User[${user.email}] → 이메일 일치 Client[${client.id}] 연결`);
      } else {
        // 새 Client 생성
        const clientCode = generateClientCode();
        const memberType = user.memberType === 'BUSINESS' ? 'business' : 'individual';
        const oauthProvider = user.provider !== 'EMAIL' ? user.provider.toLowerCase() : null;
        const id = `c${Date.now().toString(36)}${Math.random().toString(36).substr(2, 8)}`;

        await prisma.$executeRawUnsafe(`
          INSERT INTO "clients" (
            "id", "clientCode", "clientName", "email", "password",
            "phone", "memberType", "status", "profileImage", "lastLoginAt",
            "oauthProvider", "oauthId",
            "priceType", "paymentType", "creditEnabled", "creditBlocked",
            "shippingType", "freeShippingThreshold", "pendingAdjustmentAmount",
            "creditGrade", "paymentTerms", "hasLogo", "isBlacklist", "isWhitelist",
            "memberGrade", "sensitivityScore", "totalClaims", "fileRetentionMonths",
            "userId", "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, 'active', $8, $9,
            $10, $11,
            'standard', 'order', false, false,
            'conditional', 90000, 0,
            'B', 30, false, false, false,
            'normal', 3, 0, 3,
            $12, NOW(), NOW()
          )
        `, id, clientCode, user.name, user.email, user.passwordHash,
          user.phone, memberType, user.profileImage, user.lastLoginAt,
          oauthProvider, user.oauthId,
          user.id);

        userToClientMap.set(user.id, id);
        createdCount++;
        console.log(`  + User[${user.email}] → 새 Client[${id}] 생성 (code: ${clientCode})`);
      }
    }
  }

  console.log(`\n  요약: 기존 연결 ${linkedCount}건, 신규 생성 ${createdCount}건`);

  // Step 4: Employment 레코드 업데이트
  console.log('\n[4/7] Employment 레코드 업데이트...');
  const employments = await prisma.$queryRawUnsafe(`
    SELECT "id", "userId", "clientId" FROM "employments"
  `) as any[];

  let empUpdated = 0;
  let empFailed = 0;
  for (const emp of employments) {
    const memberClientId = userToClientMap.get(emp.userId);
    if (!memberClientId) {
      console.error(`  ✗ Employment[${emp.id}]: userId=${emp.userId}에 대한 Client 매핑 없음`);
      empFailed++;
      continue;
    }

    await prisma.$executeRawUnsafe(`
      UPDATE "employments"
      SET "memberClientId" = $1, "companyClientId" = $2
      WHERE "id" = $3
    `, memberClientId, emp.clientId, emp.id);
    empUpdated++;
  }
  console.log(`  → ${empUpdated}건 업데이트, ${empFailed}건 실패`);

  if (empFailed > 0) {
    throw new Error(`${empFailed}건의 Employment 마이그레이션 실패. 중단합니다.`);
  }

  // Step 5: NULL 체크
  console.log('\n[5/7] 마이그레이션 검증...');
  const nullCheck = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM "employments"
    WHERE "memberClientId" IS NULL OR "companyClientId" IS NULL
  `) as any[];

  const nullCount = Number(nullCheck[0].count);
  if (nullCount > 0) {
    throw new Error(`${nullCount}건의 Employment에 NULL 값이 남아있습니다!`);
  }
  console.log('  ✓ 모든 Employment 레코드 정상');

  // Step 6: NOT NULL 제약조건 추가
  console.log('\n[6/7] NOT NULL 제약조건 및 인덱스 추가...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "employments" ALTER COLUMN "memberClientId" SET NOT NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "employments" ALTER COLUMN "companyClientId" SET NOT NULL`);

  // 유니크 인덱스 추가 (이미 존재하면 무시)
  try {
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX "employments_memberClientId_companyClientId_key"
      ON "employments" ("memberClientId", "companyClientId");
    `);
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  (유니크 인덱스 이미 존재)');
    } else {
      throw e;
    }
  }

  // 일반 인덱스 추가
  try {
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "employments_memberClientId_idx" ON "employments" ("memberClientId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "employments_companyClientId_idx" ON "employments" ("companyClientId")`);
  } catch {
    console.log('  (인덱스 이미 존재)');
  }

  // FK 제약조건 추가
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "employments"
      ADD CONSTRAINT "employments_memberClientId_fkey"
      FOREIGN KEY ("memberClientId") REFERENCES "clients"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  (memberClientId FK 이미 존재)');
    } else {
      throw e;
    }
  }

  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "employments"
      ADD CONSTRAINT "employments_companyClientId_fkey"
      FOREIGN KEY ("companyClientId") REFERENCES "clients"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('  (companyClientId FK 이미 존재)');
    } else {
      throw e;
    }
  }

  // Step 7: 결과 요약
  console.log('\n[7/7] 마이그레이션 완료 요약');
  console.log('─'.repeat(40));
  console.log(`  User 처리: ${users.length}명`);
  console.log(`  - 기존 Client 연결: ${linkedCount}건`);
  console.log(`  - 신규 Client 생성: ${createdCount}건`);
  console.log(`  Employment 업데이트: ${empUpdated}건`);
  console.log('─'.repeat(40));
  console.log('\n✅ 마이그레이션 완료');
  console.log('\n다음 단계:');
  console.log('  1. schema.prisma 업데이트');
  console.log('  2. npx prisma db push');
  console.log('  3. npx prisma generate');
}

main()
  .catch((e) => {
    console.error('\n❌ 마이그레이션 실패:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
