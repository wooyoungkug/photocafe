import UTIF from 'utif2';

/**
 * TIFF 파일을 Canvas에 디코딩하여 ImageBitmap 또는 HTMLCanvasElement로 반환
 * 브라우저는 TIFF를 네이티브로 렌더링할 수 없으므로 utif2로 디코딩
 */
export async function decodeTiffToCanvas(file: File): Promise<{
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}> {
  const buffer = await file.arrayBuffer();
  const ifds = UTIF.decode(buffer);

  if (ifds.length === 0) {
    throw new Error('TIFF 파일을 디코딩할 수 없습니다.');
  }

  // 첫 번째 페이지 디코딩
  UTIF.decodeImage(buffer, ifds[0]);
  const firstPage = ifds[0];
  const rgba = UTIF.toRGBA8(firstPage);

  const width = firstPage.width;
  const height = firstPage.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.');
  }

  const clampedArray = new Uint8ClampedArray(rgba.buffer as ArrayBuffer);
  const imageData = new ImageData(clampedArray, width, height);
  ctx.putImageData(imageData, 0, 0);

  return { canvas, width, height };
}

/**
 * 파일이 TIFF 형식인지 확인
 */
export function isTiffFile(file: File): boolean {
  const ext = file.name.toLowerCase();
  return ext.endsWith('.tif') || ext.endsWith('.tiff');
}
