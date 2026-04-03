const { PrismaClient } = require('@prisma/client');
const { join, extname } = require('path');
const { existsSync, readdirSync, renameSync, mkdirSync, copyFileSync } = require('fs');
const sharp = require('sharp');

const basePath = 'X:\\printing114\\uploads';

async function generateThumb(srcPath, thumbDir, fileName) {
  const ext = extname(fileName);
  const base = fileName.slice(0, -ext.length);
  const thumbName = `${base}_thumb.jpg`;
  const destThumb = join(thumbDir, thumbName);
  if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });
  await sharp(srcPath).resize(800, null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toFile(destThumb);
  return destThumb;
}

function toRelativeUrl(absPath) {
  const rel = absPath.replace(basePath, '').replace(/\\/g, '/');
  return '/uploads' + rel;
}

async function main() {
  const prisma = new PrismaClient();

  // 오늘 주문만 처리
  const pendingFiles = await prisma.orderFile.findMany({
    where: {
      storageStatus: 'pending',
      fileUrl: { contains: '/temp/' },
      orderItem: { order: { orderNumber: { startsWith: '260402-' } } },
    },
    include: { orderItem: { include: { order: { include: { client: true } } } } },
  });

  console.log('Pending files (today):', pendingFiles.length);
  if (pendingFiles.length === 0) { await prisma.$disconnect(); return; }

  const orderMap = new Map();
  for (const file of pendingFiles) {
    const order = file.orderItem.order;
    if (!orderMap.has(order.id)) {
      orderMap.set(order.id, { orderNumber: order.orderNumber, companyName: order.client?.clientName || 'unknown', createdAt: order.createdAt, files: [] });
    }
    orderMap.get(order.id).files.push(file);
  }

  let totalRepaired = 0, totalFailed = 0;

  for (const [orderId, info] of orderMap) {
    const d = new Date(info.createdAt);
    const orderDir = join(basePath, 'orders', d.getFullYear().toString(), (d.getMonth()+1).toString().padStart(2,'0'), d.getDate().toString().padStart(2,'0'), info.companyName, info.orderNumber);
    const origDir = join(orderDir, 'originals');
    const thumbDir = join(orderDir, 'thumbnails');
    if (!existsSync(origDir)) mkdirSync(origDir, { recursive: true });
    if (!existsSync(thumbDir)) mkdirSync(thumbDir, { recursive: true });

    // 1단계: temp에서 이동
    const tempIds = new Set();
    for (const f of info.files) {
      const m = f.fileUrl.match(/\/temp\/([^/]+)\//);
      if (m) tempIds.add(m[1]);
    }
    for (const tempId of tempIds) {
      const tempOrig = join(basePath, 'temp', tempId, 'originals');
      const tempThumb = join(basePath, 'temp', tempId, 'thumbnails');
      if (existsSync(tempOrig)) {
        const tempFiles = readdirSync(tempOrig);
        for (const fn of tempFiles) {
          try {
            const dest = join(origDir, fn);
            if (!existsSync(dest)) { renameSync(join(tempOrig, fn), dest); }
          } catch { }
        }
      }
      if (existsSync(tempThumb)) {
        for (const fn of readdirSync(tempThumb)) {
          try {
            const dest = join(thumbDir, fn);
            if (!existsSync(dest)) { renameSync(join(tempThumb, fn), dest); }
          } catch { }
        }
      }
    }

    // 2단계: order dir에서 파일 찾아서 DB 업데이트
    const existingOrig = existsSync(origDir) ? readdirSync(origDir) : [];
    let orderRepaired = 0;

    for (const file of info.files) {
      const dbFileName = file.fileName;
      const urlFileName = decodeURIComponent((file.fileUrl || '').split('/').pop() || '');

      const matchFile = existingOrig.find(f =>
        f === dbFileName
        || f === urlFileName
        || decodeURIComponent(f) === dbFileName
        || decodeURIComponent(f) === urlFileName
      );

      if (matchFile) {
        const absOrig = join(origDir, matchFile);
        const ext = extname(matchFile);
        const base = matchFile.slice(0, -ext.length);
        const thumbName = `${base}_thumb.jpg`;
        let absThumb = join(thumbDir, thumbName);

        if (!existsSync(absThumb)) {
          try { absThumb = await generateThumb(absOrig, thumbDir, matchFile); } catch(e) { /* skip */ }
        }

        const thumbExists = existsSync(absThumb);
        await prisma.orderFile.update({
          where: { id: file.id },
          data: {
            fileUrl: toRelativeUrl(absOrig),
            originalPath: absOrig,
            thumbnailUrl: thumbExists ? toRelativeUrl(absThumb) : file.thumbnailUrl,
            thumbnailPath: thumbExists ? absThumb : null,
            storageStatus: 'uploaded',
          },
        });
        totalRepaired++;
        orderRepaired++;
      } else {
        totalFailed++;
      }
    }
    console.log(`${info.orderNumber}: ${orderRepaired}/${info.files.length} repaired (origDir: ${existingOrig.length} files)`);
  }

  console.log(`\nDone! Repaired: ${totalRepaired}, Failed: ${totalFailed}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
