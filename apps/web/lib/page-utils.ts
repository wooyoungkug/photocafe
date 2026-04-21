/**
 * 앨범 페이지 관련 유틸리티
 */

export interface PageFile {
  id: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl?: string;
  pageRange: string;
  pageStart: number;
  pageEnd: number;
  sortOrder: number;
}

/**
 * 펼침면 앨범의 파일 인덱스에 해당하는 실제 페이지 범위 라벨 반환
 */
export function getSpreadPageLabel(
  fileIndex: number,
  totalFiles: number,
  pageLayout: string | undefined,
  bindingDirection: string | undefined,
): string {
  if (pageLayout !== 'spread') return `${fileIndex + 1}`;
  const dir = bindingDirection || 'LEFT_START_RIGHT_END';
  switch (dir) {
    case 'LEFT_START_RIGHT_END':
      return `${fileIndex * 2 + 1}-${fileIndex * 2 + 2}`;
    case 'LEFT_START_LEFT_END':
      if (fileIndex === totalFiles - 1) return `${fileIndex * 2 + 1}`;
      return `${fileIndex * 2 + 1}-${fileIndex * 2 + 2}`;
    case 'RIGHT_START_LEFT_END':
      if (fileIndex === 0) return '1';
      if (fileIndex === totalFiles - 1) return `${fileIndex * 2}`;
      return `${fileIndex * 2}-${fileIndex * 2 + 1}`;
    case 'RIGHT_START_RIGHT_END':
      if (fileIndex === 0) return '1';
      return `${fileIndex * 2}-${fileIndex * 2 + 1}`;
    default:
      return `${fileIndex * 2 + 1}-${fileIndex * 2 + 2}`;
  }
}

/**
 * 양면 인쇄 시트 페어링 (화보앨범용)
 * 같은 물리 시트의 앞/뒷면 페이지 번호 반환: (1,2), (3,4), (5,6)...
 */
export function getPagePairForSheet(pageNumber: number): [number, number] {
  if (pageNumber % 2 === 1) return [pageNumber, pageNumber + 1];
  return [pageNumber - 1, pageNumber];
}

/**
 * 낱장(single) 파일을 제본방향에 맞춰 좌/우 펼침면으로 페어링.
 * 각 요소는 [left, right] 쌍이며 빈 칸은 null.
 * - RIGHT_START_*: 첫 페이지가 우측 단독 (좌 빈칸)
 * - LEFT_END 로 끝나고 쌍이 맞지 않으면 마지막 페이지는 좌측 단독
 * - LEFT_START_RIGHT_END (기본): 단순히 앞에서부터 두 장씩
 */
export function pairSinglePagesForSpread<T>(
  files: T[],
  bindingDirection: string | null | undefined,
): Array<[T | null, T | null]> {
  const dir = bindingDirection || 'LEFT_START_RIGHT_END';
  const rightStart = dir.startsWith('RIGHT_START');
  const pairs: Array<[T | null, T | null]> = [];

  let i = 0;
  // RIGHT_START: 첫 페이지는 우측 단독
  if (rightStart && files.length > 0) {
    pairs.push([null, files[0]]);
    i = 1;
  }
  // 중간: 좌/우 쌍
  while (i < files.length) {
    const left = files[i] ?? null;
    const right = i + 1 < files.length ? files[i + 1] : null;
    pairs.push([left, right]);
    i += 2;
  }
  return pairs;
}

/**
 * 페이지 번호로 해당 OrderFile 찾기
 */
export function getFileForPageNumber(
  files: PageFile[],
  pageNumber: number,
): PageFile | undefined {
  return files.find(
    (f) => pageNumber >= f.pageStart && pageNumber <= f.pageEnd,
  );
}
