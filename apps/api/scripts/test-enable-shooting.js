// 진단용 스크립트: enableShooting 필드가 Prisma client에 정상 인식되는지 확인
const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('1) Prisma client 모델 키 확인:');
    const dmmf = require('@prisma/client').Prisma.dmmf;
    const clientModel = dmmf.datamodel.models.find((m) => m.name === 'Client');
    const fields = clientModel.fields.map((f) => f.name);
    const hasShooting = fields.includes('enableShooting');
    const hasNote = fields.includes('enableNote');
    const hasQuota = fields.includes('storageQuotaGb');
    console.log('   enableShooting:', hasShooting ? '✅' : '❌');
    console.log('   enableNote    :', hasNote ? '✅' : '❌');
    console.log('   storageQuotaGb:', hasQuota ? '✅' : '❌');

    if (!hasShooting) {
      console.log('\n❌ Prisma client 가 새 필드를 인식 못 함 — `npx prisma generate` 필요');
      process.exit(1);
    }

    console.log('\n2) 직접 update 시도:');
    const result = await prisma.client.update({
      where: { clientCode: 'M0003' },
      data: {
        enableSchedule: false,
        enableShooting: false,
        enableRecruitment: false,
      },
      select: {
        id: true,
        clientName: true,
        enableSchedule: true,
        enableShooting: true,
        enableRecruitment: true,
        enableNote: true,
      },
    });
    console.log('   ✅ Update 성공:', result);

    console.log('\n결론: Prisma 자체는 정상. 문제는 NestJS 측 코드 또는 dev 서버 재시작 필요.');
  } catch (err) {
    console.log('\n❌ 에러:', err.message);
    if (err.message.includes('enableShooting') || err.message.includes('Unknown')) {
      console.log('→ Prisma client 가 stale 함. dev 서버 종료 후 `npx prisma generate` 필요.');
    }
  } finally {
    await prisma.$disconnect();
  }
})();
