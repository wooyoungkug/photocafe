const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStaffAndClients() {
  try {
    // 직원 목록 조회
    const staff = await prisma.staff.findMany({
      select: {
        id: true,
        name: true,
        staffId: true,
      },
      take: 5,
    });

    console.log('\n=== 직원 목록 (최대 5명) ===');
    staff.forEach(s => {
      console.log(`ID: ${s.id}, 이름: ${s.name}, 사번: ${s.staffId}`);
    });

    // 거래처 목록 조회
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        clientName: true,
        clientCode: true,
      },
      take: 5,
    });

    console.log('\n=== 거래처 목록 (최대 5개) ===');
    clients.forEach(c => {
      console.log(`ID: ${c.id}, 거래처명: ${c.clientName}, 코드: ${c.clientCode}`);
    });

    // 영업담당자 할당 현황
    const assignments = await prisma.staffClient.findMany({
      include: {
        staff: { select: { name: true } },
        client: { select: { clientName: true } },
      },
      take: 10,
    });

    console.log('\n=== 현재 영업담당자 할당 현황 (최대 10건) ===');
    if (assignments.length === 0) {
      console.log('할당된 영업담당자가 없습니다.');
    } else {
      assignments.forEach(a => {
        console.log(`거래처: ${a.client.clientName} → 담당자: ${a.staff.name} (주담당: ${a.isPrimary ? '예' : '아니오'})`);
      });
    }

  } catch (error) {
    console.error('오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkStaffAndClients();
