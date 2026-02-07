const fs = require('fs');
const path = require('path');

console.log('🧹 Next.js 캐시 정리 시작...\n');

const dirsToClean = [
  { path: 'apps/web/.next', name: 'Next.js 빌드' },
  { path: 'apps/web/node_modules/.cache', name: 'npm 캐시' },
  { path: 'apps/web/.turbo', name: 'Turbopack 캐시' },
  { path: 'apps/web/.swc', name: 'SWC 캐시' },
  { path: 'apps/api/dist', name: 'NestJS 빌드' },
];

let successCount = 0;
let failCount = 0;

dirsToClean.forEach(({ path: dirPath, name }) => {
  const fullPath = path.join(__dirname, '..', dirPath);

  try {
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`✅ 정리 완료: ${name} (${dirPath})`);
      successCount++;
    } else {
      console.log(`⏭️  건너뛰기: ${name} (존재하지 않음)`);
    }
  } catch (err) {
    console.error(`❌ 정리 실패: ${name} - ${err.message}`);
    failCount++;
  }
});

console.log(`\n📊 정리 결과: 성공 ${successCount}개, 실패 ${failCount}개`);
console.log('✨ 캐시 정리 완료!\n');

if (failCount > 0) {
  console.log('⚠️  일부 캐시 정리에 실패했습니다.');
  console.log('💡 개발 서버가 실행 중이라면 중지 후 다시 시도하세요.\n');
  process.exit(1);
}
