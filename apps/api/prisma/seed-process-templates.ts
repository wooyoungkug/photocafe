/**
 * ProcessTemplate 시딩
 * 상품별 공정 프로세스를 DB에 저장합니다.
 */
import { PrismaClient } from '@prisma/client';
import {
  PRODUCT_PROCESS_TEMPLATES,
  type ProductType,
} from '../src/modules/product/constants/process-templates';

export async function seedProcessTemplates(prisma: PrismaClient) {
  console.log('Seeding process templates...');

  let created = 0;
  let skipped = 0;

  for (const [productType, steps] of Object.entries(
    PRODUCT_PROCESS_TEMPLATES,
  )) {
    for (const step of steps) {
      // 이미 존재하면 건너뜀
      const existing = await prisma.processTemplate.findUnique({
        where: {
          productType_stepOrder: {
            productType,
            stepOrder: step.stepOrder,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.processTemplate.create({
        data: {
          productType,
          stepOrder: step.stepOrder,
          stepCode: step.stepCode,
          stepName: step.stepName,
          stepNameEn: step.stepNameEn || null,
          department: step.department || null,
          estimatedHours: step.estimatedHours || null,
          isCheckpoint: step.isCheckpoint || false,
          description: step.description || null,
        },
      });
      created++;
    }
  }

  console.log(
    `Process templates seeded: ${created} created, ${skipped} skipped (already exist)`,
  );
}
