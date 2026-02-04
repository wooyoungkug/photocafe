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

async function seedFoilColors() {
  const existingColors = await prisma.foilColor.count();
  if (existingColors > 0) {
    console.log(`Foil colors already exist (${existingColors} items)`);
    return;
  }

  const foilColors = [
    { code: 'gold_glossy', name: '금박(유광)', colorHex: '#FFD700', sortOrder: 1 },
    { code: 'gold_matte', name: '금박(무광)', colorHex: '#DAA520', sortOrder: 2 },
    { code: 'silver_glossy', name: '은박(유광)', colorHex: '#C0C0C0', sortOrder: 3 },
    { code: 'silver_matte', name: '은박(무광)', colorHex: '#A8A8A8', sortOrder: 4 },
    { code: 'brown', name: '밤박(브라운)', colorHex: '#8B4513', sortOrder: 5 },
    { code: 'white', name: '흰색박', colorHex: '#FFFFFF', sortOrder: 6 },
    { code: 'black', name: '먹박', colorHex: '#000000', sortOrder: 7 },
    { code: 'hologram', name: '홀로그램박', colorHex: '#E6E6FA', sortOrder: 8 },
  ];

  for (const color of foilColors) {
    await prisma.foilColor.create({ data: color });
  }

  console.log(`Foil colors seeded: ${foilColors.length} items`);
}

async function seedPlatePositions() {
  const existingPositions = await prisma.platePosition.count();
  if (existingPositions > 0) {
    console.log(`Plate positions already exist (${existingPositions} items)`);
    return;
  }

  const positions = [
    { code: 'center', name: '정중앙', sortOrder: 1 },
    { code: 'top_center', name: '중상', sortOrder: 2 },
    { code: 'bottom_center', name: '중하', sortOrder: 3 },
    { code: 'right_center', name: '우중', sortOrder: 4 },
    { code: 'right_bottom', name: '우하', sortOrder: 5 },
  ];

  for (const position of positions) {
    await prisma.platePosition.create({ data: position });
  }

  console.log(`Plate positions seeded: ${positions.length} items`);
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

// ==================== JDF Intent 시드 데이터 ====================

async function seedJdfIntents() {
  // ColorIntent (색상 의도)
  const colorIntents = [
    { code: 'CI-4C-1S', name: '4도 단면', numColorsFront: 4, numColorsBack: 0, displayNameKo: '4도 풀컬러 단면', colorType: 'Process' },
    { code: 'CI-4C-2S', name: '4도 양면', numColorsFront: 4, numColorsBack: 4, displayNameKo: '4도 풀컬러 양면', colorType: 'Process' },
    { code: 'CI-6C-1S', name: '6도 단면', numColorsFront: 6, numColorsBack: 0, displayNameKo: '6도 컬러 단면', colorType: 'Process' },
    { code: 'CI-6C-2S', name: '6도 양면', numColorsFront: 6, numColorsBack: 6, displayNameKo: '6도 컬러 양면', colorType: 'Process' },
    { code: 'CI-1C-1S', name: '단색 단면', numColorsFront: 1, numColorsBack: 0, displayNameKo: '흑백 단면', colorType: 'Process' },
    { code: 'CI-1C-2S', name: '단색 양면', numColorsFront: 1, numColorsBack: 1, displayNameKo: '흑백 양면', colorType: 'Process' },
  ];

  for (let i = 0; i < colorIntents.length; i++) {
    const ci = colorIntents[i];
    await prisma.colorIntent.upsert({
      where: { code: ci.code },
      update: {},
      create: { ...ci, sortOrder: i + 1 },
    });
  }
  console.log('ColorIntent seeded:', colorIntents.length, 'items');

  // BindingIntent (제본 의도)
  const bindingIntents = [
    { code: 'BI-SOFT', name: '무선제본', jdfBindingType: 'SoftCover', displayNameKo: '무선(소프트커버) 제본', jdfBindingSide: 'Left' },
    { code: 'BI-HARD', name: '양장제본', jdfBindingType: 'HardCover', displayNameKo: '양장(하드커버) 제본', jdfBindingSide: 'Left' },
    { code: 'BI-SADDLE', name: '중철제본', jdfBindingType: 'Saddle', displayNameKo: '중철 스테이플 제본', jdfBindingSide: 'Left' },
    { code: 'BI-RING', name: '링제본', jdfBindingType: 'Ring', displayNameKo: '링/스프링 제본', jdfBindingSide: 'Left' },
    { code: 'BI-WIRE', name: '와이어제본', jdfBindingType: 'Wire', displayNameKo: '트윈링 와이어 제본', jdfBindingSide: 'Left' },
    { code: 'BI-PERFECT', name: 'PUR제본', jdfBindingType: 'Perfect', displayNameKo: 'PUR 무선제본', jdfBindingSide: 'Left' },
  ];

  for (let i = 0; i < bindingIntents.length; i++) {
    const bi = bindingIntents[i];
    await prisma.bindingIntent.upsert({
      where: { code: bi.code },
      update: {},
      create: { ...bi, sortOrder: i + 1 },
    });
  }
  console.log('BindingIntent seeded:', bindingIntents.length, 'items');

  // FoldingIntent (접지 의도)
  const foldingIntents = [
    { code: 'FI-F2', name: '2단접지', jdfFoldCatalog: 'F2-1', foldCount: 1, displayNameKo: '2단 병풍접지' },
    { code: 'FI-F4', name: '4단접지', jdfFoldCatalog: 'F4-1', foldCount: 2, displayNameKo: '4단 병풍접지' },
    { code: 'FI-F6', name: '6단접지', jdfFoldCatalog: 'F6-1', foldCount: 3, displayNameKo: '6단 병풍접지' },
    { code: 'FI-Z', name: 'Z접지', jdfFoldCatalog: 'Z', foldCount: 2, displayNameKo: 'Z자 접지' },
    { code: 'FI-GATE', name: '대문접지', jdfFoldCatalog: 'Gate', foldCount: 2, displayNameKo: '대문(게이트) 접지' },
    { code: 'FI-LETTER', name: '편지접지', jdfFoldCatalog: 'Letter', foldCount: 2, displayNameKo: '편지 3단접지' },
  ];

  for (let i = 0; i < foldingIntents.length; i++) {
    const fi = foldingIntents[i];
    await prisma.foldingIntent.upsert({
      where: { code: fi.code },
      update: {},
      create: { ...fi, sortOrder: i + 1 },
    });
  }
  console.log('FoldingIntent seeded:', foldingIntents.length, 'items');

  // FileSpec (파일 규격)
  const fileSpecs = [
    { code: 'FS-INDIGO', name: '인디고 출력용', resolutionX: 300, resolutionY: 300, colorSpace: 'CMYK', displayNameKo: '인디고 CMYK 300dpi' },
    { code: 'FS-INKJET', name: '잉크젯 출력용', resolutionX: 240, resolutionY: 240, colorSpace: 'sRGB', displayNameKo: '잉크젯 sRGB 240dpi' },
    { code: 'FS-INKJET-HD', name: '잉크젯 고해상도', resolutionX: 360, resolutionY: 360, colorSpace: 'AdobeRGB', displayNameKo: '잉크젯 AdobeRGB 360dpi' },
    { code: 'FS-OFFSET', name: '오프셋 인쇄용', resolutionX: 350, resolutionY: 350, colorSpace: 'CMYK', displayNameKo: '오프셋 CMYK 350dpi' },
  ];

  for (let i = 0; i < fileSpecs.length; i++) {
    const fs = fileSpecs[i];
    await prisma.fileSpec.upsert({
      where: { code: fs.code },
      update: {},
      create: { ...fs, sortOrder: i + 1 },
    });
  }
  console.log('FileSpec seeded:', fileSpecs.length, 'items');

  // QualityControl (품질 기준)
  const qualityControls = [
    { code: 'QC-STD', name: '표준품질', deltaE: 5, colorTolerance: 'Standard', trimTolerance: 1, displayNameKo: '표준 품질 기준' },
    { code: 'QC-PREMIUM', name: '프리미엄품질', deltaE: 3, colorTolerance: 'Tight', trimTolerance: 0.5, displayNameKo: '프리미엄 품질 기준' },
    { code: 'QC-BASIC', name: '기본품질', deltaE: 8, colorTolerance: 'Loose', trimTolerance: 2, displayNameKo: '기본 품질 기준' },
  ];

  for (let i = 0; i < qualityControls.length; i++) {
    const qc = qualityControls[i];
    await prisma.qualityControl.upsert({
      where: { code: qc.code },
      update: {},
      create: { ...qc, sortOrder: i + 1 },
    });
  }
  console.log('QualityControl seeded:', qualityControls.length, 'items');

  // ProofingIntent (교정 의도)
  const proofingIntents = [
    { code: 'PI-NONE', name: '교정없음', jdfProofType: 'None', displayNameKo: '교정 생략' },
    { code: 'PI-DIGITAL', name: '디지털 교정', jdfProofType: 'Digital', isColorProof: true, displayNameKo: '디지털 컬러 프루프' },
    { code: 'PI-CONTRACT', name: '계약 교정', jdfProofType: 'Proof', isColorProof: true, isContractProof: true, displayNameKo: '계약용 교정쇄' },
  ];

  for (let i = 0; i < proofingIntents.length; i++) {
    const pi = proofingIntents[i];
    await prisma.proofingIntent.upsert({
      where: { code: pi.code },
      update: {},
      create: { ...pi, sortOrder: i + 1 },
    });
  }
  console.log('ProofingIntent seeded:', proofingIntents.length, 'items');
}

// ==================== 지점 및 부서 시드 데이터 ====================

async function seedBranchesAndDepartments() {
  // 지점 생성
  const existingBranch = await prisma.branch.findFirst({
    where: { branchCode: 'HQ' },
  });

  let headquarters;
  if (!existingBranch) {
    headquarters = await prisma.branch.create({
      data: {
        branchCode: 'HQ',
        branchName: '본사',
        isHeadquarters: true,
        address: '',
        phone: '',
        isActive: true,
      },
    });
    console.log('Branch created: 본사');
  } else {
    headquarters = existingBranch;
    console.log('Branch already exists: 본사');
  }

  // 부서 생성
  const departments = [
    { code: 'MGMT', name: '관리팀', sortOrder: 1 },
    { code: 'SALES', name: '영업팀', sortOrder: 2 },
    { code: 'PROD', name: '생산팀', sortOrder: 3 },
    { code: 'DESIGN', name: '디자인팀', sortOrder: 4 },
    { code: 'CS', name: '고객지원팀', sortOrder: 5 },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: {
        code: dept.code,
        name: dept.name,
        sortOrder: dept.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`Departments seeded: ${departments.length} items`);
}

// ==================== 거래처 그룹 시드 데이터 ====================

async function seedClientGroups() {
  const existingGroups = await prisma.clientGroup.count();
  if (existingGroups > 0) {
    console.log(`Client groups already exist (${existingGroups} items)`);
    return;
  }

  // 지점 찾기
  const headquarters = await prisma.branch.findFirst({
    where: { branchCode: 'HQ' },
  });

  if (!headquarters) {
    console.log('No headquarters found, skipping client groups');
    return;
  }

  const groups = [
    { groupCode: 'INDIVIDUAL', groupName: '일반고객그룹', generalDiscount: 100, premiumDiscount: 100, importedDiscount: 100 },
    { groupCode: 'STUDIO', groupName: '스튜디오회원', generalDiscount: 90, premiumDiscount: 95, importedDiscount: 95 },
    { groupCode: 'VIP', groupName: 'VIP회원', generalDiscount: 85, premiumDiscount: 90, importedDiscount: 90 },
  ];

  for (const group of groups) {
    await prisma.clientGroup.create({
      data: {
        ...group,
        branchId: headquarters.id,
        isActive: true,
      },
    });
  }
  console.log(`Client groups seeded: ${groups.length} items`);
}

// 직원(Staff) 시드 데이터
async function seedStaff() {
  const existingStaff = await prisma.staff.findFirst({
    where: { staffId: 'admin' },
  });

  if (existingStaff) {
    console.log('Staff already exists');
    return;
  }

  // 본사 지점 찾기
  const headquarters = await prisma.branch.findFirst({
    where: { branchCode: 'HQ' },
  });

  // 관리팀 부서 찾기
  const adminDept = await prisma.department.findFirst({
    where: { code: 'ADMIN' },
  });

  const hashedPassword = await bcrypt.hash('admin', 10);

  await prisma.staff.create({
    data: {
      staffId: 'admin',
      password: hashedPassword,
      name: '관리자',
      position: '대표',
      email: 'admin@printing114.com',
      mobile: '010-1234-5678',
      branchId: headquarters?.id,
      departmentId: adminDept?.id,
      canLoginAsManager: true,
      canEditInManagerView: true,
      canChangeDepositStage: true,
      canChangeReceptionStage: true,
      canChangeCancelStage: true,
      canEditMemberInfo: true,
      canViewSettlement: true,
      canChangeOrderAmount: true,
      memberViewScope: 'all',
      salesViewScope: 'all',
      isCompany: true,
      settlementGrade: 15,
      isActive: true,
    },
  });

  console.log('Admin staff created: admin / admin');
}

async function main() {
  console.log('Starting seed...');

  await seedUsers();
  await seedBranchesAndDepartments();
  await seedStaff();
  await seedClientGroups();
  await seedCategories();
  await seedSpecifications();
  await seedFoilColors();
  await seedPlatePositions();
  await seedJdfIntents();

  console.log('Seed completed');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
