const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignStaffToClients() {
  try {
    // 첫 번째 직원 조회
    const staff = await prisma.staff.findFirst({
      select: { id: true, name: true },
    });

    if (!staff) {
      console.log('직원이 없습니다. 먼저 직원을 등록해주세요.');
      return;
    }

    console.log(`기본 영업담당자: ${staff.name} (${staff.id})`);

    // 모든 거래처 조회
    const clients = await prisma.client.findMany({
      select: { id: true, clientName: true },
    });

    console.log(`\n총 ${clients.length}개 거래처에 영업담당자를 할당합니다...\n`);

    let assigned = 0;
    let skipped = 0;

    for (const client of clients) {
      try {
        // 이미 할당되어 있는지 확인
        const existing = await prisma.staffClient.findUnique({
          where: {
            staffId_clientId: {
              staffId: staff.id,
              clientId: client.id,
            },
          },
        });

        if (existing) {
          console.log(`✓ ${client.clientName} - 이미 할당됨 (건너뜀)`);
          skipped++;
          continue;
        }

        // 영업담당자 할당
        await prisma.staffClient.create({
          data: {
            staffId: staff.id,
            clientId: client.id,
            isPrimary: true, // 주담당자로 설정
          },
        });

        console.log(`✓ ${client.clientName} - 할당 완료`);
        assigned++;
      } catch (error) {
        console.error(`✗ ${client.clientName} - 실패:`, error.message);
      }
    }

    console.log(`\n=== 완료 ===`);
    console.log(`할당 완료: ${assigned}건`);
    console.log(`건너뜀: ${skipped}건`);

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignStaffToClients();
