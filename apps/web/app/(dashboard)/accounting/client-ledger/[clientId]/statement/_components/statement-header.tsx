interface StatementHeaderProps {
  title: string;
  startDate: string;
  endDate: string;
}

export function StatementHeader({ title, startDate, endDate }: StatementHeaderProps) {
  // 제목 글자 사이 공백 처리 (예: "세부 거래내역서" → "세 부  거 래 내 역 서")
  const spacedTitle = title.split('').join(' ');

  return (
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold mb-2">{spacedTitle}</h1>
      <p className="text-sm text-gray-600">
        기간: {startDate} ~ {endDate}
      </p>
    </div>
  );
}
