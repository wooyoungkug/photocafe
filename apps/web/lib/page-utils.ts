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
