"use client";

import { useState } from "react";
import { Spreadsheet, SpreadsheetData } from "@/components/spreadsheet";

export default function SpreadsheetPage() {
  const [data, setData] = useState<SpreadsheetData>({
    A1: { value: "항목" },
    B1: { value: "수량" },
    C1: { value: "단가" },
    D1: { value: "금액" },
    A2: { value: "인쇄물 A" },
    B2: { value: "100" },
    C2: { value: "5000" },
    D2: { formula: "=B2*C2" },
    A3: { value: "인쇄물 B" },
    B3: { value: "200" },
    C3: { value: "3000" },
    D3: { formula: "=B3*C3" },
    A4: { value: "인쇄물 C" },
    B4: { value: "50" },
    C4: { value: "8000" },
    D4: { formula: "=B4*C4" },
    A5: { value: "합계" },
    D5: { formula: "=SUM(D2:D4)" },
  });

  const handleChange = (newData: SpreadsheetData) => {
    setData(newData);
    console.log("Data changed:", newData);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">스프레드시트</h1>
        <p className="text-muted-foreground">
          Excel처럼 데이터를 편집하고 수식을 사용할 수 있습니다.
        </p>
      </div>

      <div className="mb-4 p-4 rounded-lg bg-muted/50">
        <h2 className="font-semibold mb-2">사용법</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• 셀 클릭: 셀 선택</li>
          <li>• 더블클릭 또는 Enter: 편집 모드</li>
          <li>• Shift + 클릭: 범위 선택</li>
          <li>• 화살표 키: 셀 이동</li>
          <li>• Ctrl+C / Ctrl+V: 복사/붙여넣기</li>
          <li>• Delete/Backspace: 셀 내용 삭제</li>
          <li>• 수식 입력: =으로 시작 (예: =A1+B1, =SUM(A1:A10))</li>
        </ul>
      </div>

      <Spreadsheet
        data={data}
        onChange={handleChange}
        initialRows={15}
        initialCols={8}
        className="h-[600px]"
      />
    </div>
  );
}
