const fs = require('fs');
const path = 'apps/web/app/(dashboard)/pricing/production/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// 문제가 되는 줄들 찾아서 수정
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // VENDOR_TYPE_LABELS
  if (line.includes('outsourced:') && line.includes('?')) {
    lines[i] = '  outsourced: "외주",';
  }

  // PRINT_METHOD_LABELS
  if (line.includes('indigo:') && line.includes('?')) {
    lines[i] = '  indigo: "인디고",';
  }
  if (line.includes('inkjet:') && line.includes('?')) {
    lines[i] = '  inkjet: "잉크젯",';
  }
  if (line.includes('album:') && line.includes('?')) {
    lines[i] = '  album: "앨범",';
  }
  if (line.includes('frame:') && line.includes('?')) {
    lines[i] = '  frame: "액자",';
  }

  // 주석 수정
  if (line.includes('// ?�체 ?')) {
    lines[i] = '// 업체 타입 라벨';
  }
  if (line.includes('// ?�쇄방식')) {
    lines[i] = '// 인쇄방식(용도) 라벨';
  }
  if (line.includes('// ?�디고') && line.includes('계산')) {
    lines[i] = '// 인디고 단가 계산 함수';
  }
  if (line.includes('// ?�디고') && line.includes('315x467')) {
    lines[i] = '// 인디고 규격: 315x467mm (연지 4절 기준)';
  }
  if (line.includes('// 연지') || (line.includes('// ') && line.includes('500') && line.includes('4'))) {
    if (line.includes('?')) {
      lines[i] = '// 연지 1연 = 500매, 4절이므로 500 * 4 = 2000장';
    }
  }
  if (line.includes('// ?') && line.includes('그룹 컬러') && line.includes('?')) {
    if (line.includes('배정')) {
      lines[i] = '// 단가 그룹 컬러 순서 (자동 배정)';
    } else {
      lines[i] = '// 단가 그룹 컬러 스타일';
    }
  }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Lines fixed');
