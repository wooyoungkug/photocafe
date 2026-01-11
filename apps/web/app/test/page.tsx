export default function TestPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>테스트 페이지</h1>
      <p>이 페이지가 보이면 Next.js 서버는 정상입니다.</p>
      <p>시간: {new Date().toLocaleString('ko-KR')}</p>
    </div>
  );
}
