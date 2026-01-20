const fs = require('fs');
const filePath = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 4. 초기화 부분에 pageRanges 추가
content = content.replace(
  /nupPageRanges: \[\],\n\s+\}\);\n\s+\}\n\s+setIsSettingDialogOpen\(true\);/,
  `nupPageRanges: [],
        pageRanges: [20, 30, 40, 50, 60],
      });
    }
    setIsSettingDialogOpen(true);`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Step 3: Init/reset logic updated');
