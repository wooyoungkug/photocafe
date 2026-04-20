import { Injectable } from '@nestjs/common';
import { create } from 'xmlbuilder2';
import { ImpositionResult, MM_TO_PT } from './imposition-calc.service';

export interface JdfBuildOptions {
  jobId: string;
  jobName: string;
  sourcePdfFileName: string;  // RunList 에 매핑 될 원본 PDF 파일명
  sourcePdfTotalPages: number;
  bindingType: 'compressed' | 'tack' | 'perfect' | 'flat';
  mediaWeightGsm?: number;    // 기본 128
}

/**
 * 인디고 7900 DFE 가 수용하는 JDF 1.4 서브셋 XML 빌더.
 * 라이브러리: xmlbuilder2 (커스텀). jdflib-js 사용 금지.
 *
 * 필수 리소스:
 *  - Media (시트 규격·무게·Grain)
 *  - LayoutPreparationParams + Layout/Signature/Sheet/Surface/PlacedObject
 *  - CuttingParams + CutBlock
 *  - FoldingParams (압축앨범 F2-1 catalog)
 *  - RunList (소스 PDF → Signature 매핑)
 */
@Injectable()
export class ImpositionJdfService {
  build(result: ImpositionResult, options: JdfBuildOptions): string {
    const { jobId, jobName } = options;

    // mm → pt (JDF dimensions are in points)
    const toPt = (mm: number) => +(mm * MM_TO_PT).toFixed(3);

    const doc = create({ version: '1.0', encoding: 'UTF-8' }).ele('JDF', {
      xmlns: 'http://www.CIP4.org/JDFSchema_1_1',
      ID: `JDF_${jobId}`,
      Type: 'Product',
      Status: 'Waiting',
      JobID: jobId,
      DescriptiveName: jobName,
      Version: '1.4',
    });

    // ---- ResourcePool ----
    const rp = doc.ele('ResourcePool');

    // Media
    rp.ele('Media', {
      ID: 'Media_Sheet',
      Class: 'Consumable',
      Status: 'Available',
      MediaType: 'Paper',
      Dimension: `${toPt(result.sheetWidth)} ${toPt(result.sheetHeight)}`,
      Weight: String(options.mediaWeightGsm ?? 128),
      Grain: 'ShortEdge',
    });

    // LayoutPreparationParams
    const lpp = rp.ele('LayoutPreparationParams', {
      ID: 'LPP_1',
      Class: 'Parameter',
      Status: 'Available',
      NumberUp: `${result.cols} ${result.rows}`,
      Sides: 'OneSidedFront',
      PresentationDirection: 'Top2BottomLeft2Right',
      RotatePolicy: result.rotation === 90 ? 'Rotate90' : 'NoRotate',
    });

    // Layout → Signature → Sheet → Surface → PlacedObject
    const layout = rp.ele('Layout', {
      ID: 'Layout_1',
      Class: 'Parameter',
      Status: 'Available',
    });

    for (const sheet of result.sheets) {
      const sig = layout.ele('Signature', {
        Name: `Sig_${sheet.sheetIndex}`,
      });
      const sh = sig.ele('Sheet', {
        Name: `Sheet_${sheet.sheetIndex}`,
      });
      const surface = sh.ele('Surface', { Side: 'Front' });

      let poIdx = 0;
      for (const p of sheet.placements) {
        poIdx++;
        // CTM: a b c d tx ty (PostScript style, units = pt)
        // 회전 없음 기준: 1 0 0 1 tx ty
        const tx = toPt(p.x);
        // JDF/PDF 좌표계는 보통 bottom-left 원점 → y 반전
        const ty = toPt(result.sheetHeight - p.y - p.height);
        const ctm =
          p.rotation === 90
            ? `0 1 -1 0 ${toPt(p.x + p.width)} ${ty}`
            : `1 0 0 1 ${tx} ${ty}`;

        const placed = surface.ele('PlacedObject', {
          ID: `PO_${sheet.sheetIndex}_${poIdx}`,
          CTM: ctm,
          Ord: String((sheet.sheetIndex - 1) * result.nup + (poIdx - 1)),
          HasBleeds: 'true',
          ClipBox: `0 0 ${toPt(p.width)} ${toPt(p.height)}`,
        });

        // ContentObject 참조(RunList 와 매핑) - 페이지 번호 주석
        placed.ele('ContentObject', {
          Ord: p.pages.map((pg) => pg - 1).join(' '),
          PageOrdering: p.pages.join(','),
        });

        // compressed Nup>=2: 페어별 중앙 crease line.
        //   placement 당 creaseXs 배열(길이 1)에 있는 좌표 모두 MarkObject 로 기록.
        //   Nup=1 (compressed single mode) 이면 needsTaping 이 true → crease 없음.
        if (
          options.bindingType === 'compressed' &&
          p.isPair &&
          p.creaseXs &&
          p.creaseXs.length > 0
        ) {
          for (const cx of p.creaseXs) {
            placed.ele('MarkObject', {
              MarkType: 'CreaseLine',
              Position: `${toPt(cx - p.x)} 0 ${toPt(cx - p.x)} ${toPt(p.height)}`,
            });
          }
        }
      }
    }

    // CuttingParams
    const cutting = rp.ele('CuttingParams', {
      ID: 'Cut_1',
      Class: 'Parameter',
      Status: 'Available',
    });
    let cbIdx = 0;
    for (const sheet of result.sheets) {
      for (const p of sheet.placements) {
        cbIdx++;
        cutting.ele('CutBlock', {
          BlockName: `CB_${sheet.sheetIndex}_${cbIdx}`,
          BlockSize: `${toPt(p.width)} ${toPt(p.height)}`,
          BlockTrf: `1 0 0 1 ${toPt(p.x)} ${toPt(result.sheetHeight - p.y - p.height)}`,
          BlockType: 'CutBlock',
        });
      }
    }

    // FoldingParams — 압축앨범 스프레드 페어링(Nup>=2) 모드만.
    //   compressed Nup=1 (테이핑) / perfect (무선) / tack / flat 은 접지/오시 없음.
    //   시트당 페어(=오시) 개수가 있으면 F2-1 리소스 포함.
    const hasAnyCrease =
      options.bindingType === 'compressed' &&
      result.sheets.some(
        (sh) => (sh.creaseLines && sh.creaseLines.length > 0) ||
                sh.placements.some((p) => p.isPair && p.creaseXs && p.creaseXs.length > 0),
      );
    if (hasAnyCrease) {
      rp.ele('FoldingParams', {
        ID: 'Fold_1',
        Class: 'Parameter',
        Status: 'Available',
        FoldCatalog: 'F2-1',
      });
    }

    // RunList — 소스 PDF → 페이지 매핑
    const runList = rp.ele('RunList', {
      ID: 'RL_1',
      Class: 'Parameter',
      Status: 'Available',
      Pages: `0 ~ ${Math.max(0, options.sourcePdfTotalPages - 1)}`,
      NPage: String(options.sourcePdfTotalPages),
    });
    runList.ele('LayoutElement').ele('FileSpec', {
      URL: `file:./${options.sourcePdfFileName}`,
      MimeType: 'application/pdf',
    });

    // ---- ResourceLinkPool ----
    const rlp = doc.ele('ResourceLinkPool');
    rlp.ele('MediaLink', { rRef: 'Media_Sheet', Usage: 'Input' });
    rlp.ele('LayoutPreparationParamsLink', { rRef: 'LPP_1', Usage: 'Input' });
    rlp.ele('LayoutLink', { rRef: 'Layout_1', Usage: 'Input' });
    rlp.ele('CuttingParamsLink', { rRef: 'Cut_1', Usage: 'Input' });
    if (hasAnyCrease) {
      rlp.ele('FoldingParamsLink', { rRef: 'Fold_1', Usage: 'Input' });
    }
    rlp.ele('RunListLink', { rRef: 'RL_1', Usage: 'Input' });

    return doc.end({ prettyPrint: true });
  }
}
