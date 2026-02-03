import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedClients() {
  console.log('Seeding branch, client groups and clients...');

  // 0. 본사 지점 생성
  let branch = await prisma.branch.findFirst({
    where: { branchCode: 'HQ' },
  });

  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        branchCode: 'HQ',
        branchName: '본사',
        isHeadquarters: true,
        address: '서울시 강남구 테헤란로 123',
        phone: '02-1234-5678',
        isActive: true,
      },
    });
    console.log('Created branch: 본사');
  } else {
    console.log('Branch exists: 본사');
  }

  // 1. 거래처 그룹 생성
  const groups = [
    { groupCode: 'INDIVIDUAL', groupName: '일반고객그룹', generalDiscount: 100, description: '개인 고객 기본 그룹 (정가)' },
    { groupCode: 'STUDIO', groupName: '스튜디오회원', generalDiscount: 95, description: '스튜디오/사업자 고객 그룹 (5% 할인)' },
    { groupCode: 'VIP', groupName: 'VIP 거래처', generalDiscount: 85, description: '우수 거래처 그룹 (15% 할인)' },
    { groupCode: 'GOLD', groupName: '골드 거래처', generalDiscount: 90, description: '골드 등급 거래처 (10% 할인)' },
    { groupCode: 'SILVER', groupName: '실버 거래처', generalDiscount: 95, description: '실버 등급 거래처 (5% 할인)' },
    { groupCode: 'NORMAL', groupName: '일반 거래처', generalDiscount: 100, description: '일반 거래처 (정가)' },
  ];

  const createdGroups: Record<string, string> = {};

  for (const group of groups) {
    const existing = await prisma.clientGroup.findFirst({
      where: { groupCode: group.groupCode },
    });

    if (!existing) {
      const created = await prisma.clientGroup.create({
        data: {
          ...group,
          branchId: branch.id,
        },
      });
      createdGroups[group.groupCode] = created.id;
      console.log(`Created group: ${group.groupName}`);
    } else {
      createdGroups[group.groupCode] = existing.id;
      console.log(`Group exists: ${group.groupName}`);
    }
  }

  // 2. 거래처 생성
  const clients = [
    {
      clientCode: 'C0001',
      clientName: '(주)포토스튜디오',
      businessNumber: '123-45-67890',
      representative: '김영희',
      phone: '02-1234-5678',
      mobile: '010-1234-5678',
      email: 'contact@photostudio.co.kr',
      postalCode: '06234',
      address: '서울시 강남구 테헤란로 123',
      addressDetail: '포토빌딩 5층',
      groupCode: 'VIP',
      creditGrade: 'A',
      paymentTerms: 30,
      status: 'active',
    },
    {
      clientCode: 'C0002',
      clientName: '웨딩앨범전문점',
      businessNumber: '234-56-78901',
      representative: '이철수',
      phone: '02-2345-6789',
      mobile: '010-2345-6789',
      email: 'wedding@album.co.kr',
      postalCode: '04524',
      address: '서울시 중구 을지로 456',
      addressDetail: '웨딩타워 3층',
      groupCode: 'VIP',
      creditGrade: 'A',
      paymentTerms: 45,
      status: 'active',
    },
    {
      clientCode: 'C0003',
      clientName: '베이비포토',
      businessNumber: '345-67-89012',
      representative: '박민수',
      phone: '031-3456-7890',
      mobile: '010-3456-7890',
      email: 'baby@photo.co.kr',
      postalCode: '13529',
      address: '경기도 성남시 분당구 판교로 789',
      addressDetail: '베이비센터 2층',
      groupCode: 'GOLD',
      creditGrade: 'A',
      paymentTerms: 30,
      status: 'active',
    },
    {
      clientCode: 'C0004',
      clientName: '가족사진관',
      businessNumber: '456-78-90123',
      representative: '정수진',
      phone: '02-4567-8901',
      mobile: '010-4567-8901',
      email: 'family@photo.co.kr',
      postalCode: '07281',
      address: '서울시 영등포구 여의대로 101',
      addressDetail: '가족빌딩 1층',
      groupCode: 'GOLD',
      creditGrade: 'B',
      paymentTerms: 30,
      status: 'active',
    },
    {
      clientCode: 'C0005',
      clientName: '스냅촬영소',
      businessNumber: '567-89-01234',
      representative: '최동훈',
      phone: '02-5678-9012',
      mobile: '010-5678-9012',
      email: 'snap@photo.co.kr',
      postalCode: '04778',
      address: '서울시 성동구 성수이로 202',
      addressDetail: '스냅빌딩 4층',
      groupCode: 'SILVER',
      creditGrade: 'B',
      paymentTerms: 15,
      status: 'active',
    },
    {
      clientCode: 'C0006',
      clientName: '프로필사진전문',
      businessNumber: '678-90-12345',
      representative: '강미라',
      phone: '02-6789-0123',
      mobile: '010-6789-0123',
      email: 'profile@studio.co.kr',
      postalCode: '06035',
      address: '서울시 강남구 압구정로 303',
      addressDetail: '프로필센터 6층',
      groupCode: 'SILVER',
      creditGrade: 'B',
      paymentTerms: 30,
      status: 'active',
    },
    {
      clientCode: 'C0007',
      clientName: '추억사진관',
      businessNumber: '789-01-23456',
      representative: '오지현',
      phone: '032-7890-1234',
      mobile: '010-7890-1234',
      email: 'memory@photo.co.kr',
      postalCode: '21998',
      address: '인천시 연수구 컨벤시아대로 404',
      addressDetail: '추억빌딩 2층',
      groupCode: 'NORMAL',
      creditGrade: 'B',
      paymentTerms: 30,
      status: 'active',
    },
    {
      clientCode: 'C0008',
      clientName: '포토프린트샵',
      businessNumber: '890-12-34567',
      representative: '한승우',
      phone: '02-8901-2345',
      mobile: '010-8901-2345',
      email: 'print@photoshop.co.kr',
      postalCode: '03925',
      address: '서울시 마포구 홍대입구 505',
      addressDetail: '프린트센터 1층',
      groupCode: 'NORMAL',
      creditGrade: 'C',
      paymentTerms: 15,
      status: 'active',
    },
    {
      clientCode: 'C0009',
      clientName: '졸업앨범제작소',
      businessNumber: '901-23-45678',
      representative: '임서연',
      phone: '02-9012-3456',
      mobile: '010-9012-3456',
      email: 'graduation@album.co.kr',
      postalCode: '08826',
      address: '서울시 관악구 관악로 606',
      addressDetail: '졸업센터 3층',
      groupCode: 'GOLD',
      creditGrade: 'A',
      paymentTerms: 60,
      status: 'active',
    },
    {
      clientCode: 'C0010',
      clientName: '여행사진전문점',
      businessNumber: '012-34-56789',
      representative: '윤재호',
      phone: '02-0123-4567',
      mobile: '010-0123-4567',
      email: 'travel@photo.co.kr',
      postalCode: '04323',
      address: '서울시 용산구 이태원로 707',
      addressDetail: '여행빌딩 5층',
      groupCode: 'SILVER',
      creditGrade: 'B',
      paymentTerms: 30,
      status: 'inactive',
    },
  ];

  for (const client of clients) {
    const { groupCode, ...clientData } = client;

    const existing = await prisma.client.findFirst({
      where: { clientCode: client.clientCode },
    });

    if (!existing) {
      await prisma.client.create({
        data: {
          ...clientData,
          groupId: createdGroups[groupCode],
        },
      });
      console.log(`Created client: ${client.clientName}`);
    } else {
      console.log(`Client exists: ${client.clientName}`);
    }
  }

  console.log('Seeding completed!');
}

seedClients()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
