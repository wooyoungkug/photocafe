/**
 * JPEG DPI 추출/삽입 유틸리티
 * - extractDPIFromJPEG: JFIF 헤더에서 DPI 읽기
 * - insertDPIIntoJPEG: JFIF 세그먼트 삽입/교체
 * - canvasToJPEGWithDPI: Canvas → JPEG Blob (DPI 보존)
 */

export function extractDPIFromJPEG(arrayBuffer: ArrayBuffer): number {
  const dataView = new DataView(arrayBuffer);
  if (dataView.getUint16(0) !== 0xffd8) return 300;
  let offset = 2;
  while (offset < dataView.byteLength - 4) {
    const marker = dataView.getUint16(offset);
    if (marker === 0xffe0) {
      const jfif = String.fromCharCode(
        dataView.getUint8(offset + 4),
        dataView.getUint8(offset + 5),
        dataView.getUint8(offset + 6),
        dataView.getUint8(offset + 7),
      );
      if (jfif === 'JFIF') {
        const units = dataView.getUint8(offset + 11);
        const xDensity = dataView.getUint16(offset + 12);
        if (units === 1) return xDensity;
        else if (units === 2) return Math.round(xDensity * 2.54);
      }
      const segmentLength = dataView.getUint16(offset + 2);
      offset += 2 + segmentLength;
    } else if (marker === 0xd9 || marker === 0xda) {
      break;
    } else {
      const segmentLength = dataView.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }
  }
  return 300;
}

export function insertDPIIntoJPEG(arrayBuffer: ArrayBuffer, dpi: number): ArrayBuffer {
  const originalData = new Uint8Array(arrayBuffer);
  const jfifSegment = new Uint8Array([
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
    (dpi >> 8) & 0xff, dpi & 0xff,
    (dpi >> 8) & 0xff, dpi & 0xff,
    0x00, 0x00,
  ]);
  let skipLength = 0;
  if (originalData[2] === 0xff && originalData[3] === 0xe0) {
    skipLength = 2 + ((originalData[4] << 8) | originalData[5]);
  }
  const newBuffer = new Uint8Array(2 + jfifSegment.length + (originalData.length - 2 - skipLength));
  newBuffer[0] = originalData[0];
  newBuffer[1] = originalData[1];
  newBuffer.set(jfifSegment, 2);
  newBuffer.set(originalData.slice(2 + skipLength), 2 + jfifSegment.length);
  return newBuffer.buffer;
}

export function canvasToJPEGWithDPI(
  canvas: HTMLCanvasElement,
  dpi: number,
  quality = 1.0,
): Promise<{ url: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('캔버스를 이미지로 변환할 수 없습니다.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const modifiedBuffer = insertDPIIntoJPEG(reader.result as ArrayBuffer, dpi);
          const modifiedBlob = new Blob([modifiedBuffer], { type: 'image/jpeg' });
          const url = URL.createObjectURL(modifiedBlob);
          resolve({ url, blob: modifiedBlob });
        };
        reader.onerror = () => reject(new Error('파일 읽기 실패'));
        reader.readAsArrayBuffer(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}
