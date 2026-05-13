'use client';

import { useSystemSettings, settingsToMap } from '@/hooks/use-system-settings';

const EFFECTIVE_DATE = '2026년 5월 13일';

export default function PrivacyPolicyPage() {
  const { data: settings } = useSystemSettings('company');
  const c = settings ? settingsToMap(settings) : {};

  const companyName = c.company_name || '(주)프린팅솔루션즈';
  const ceoName = c.company_ceo || '대표자';
  const address = [c.company_address, c.company_address_detail].filter(Boolean).join(' ') || '회사 주소';
  const email = c.company_email || 'privacy@photocafe.co.kr';
  const phone = c.company_cs_phone || c.company_phone || '고객센터 전화번호';
  const privacyOfficer = c.company_privacy_officer || ceoName;

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <h1 className="text-[24px] text-black font-normal mb-2">개인정보처리방침</h1>
        <p className="text-[14px] text-neutral-500 mb-10">
          {companyName}(이하 &ldquo;회사&rdquo;)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 소중하게
          보호하기 위해 다음과 같은 처리방침을 두고 있습니다.
        </p>

        <div className="space-y-10 text-[14px] text-black leading-relaxed">
          {/* 1 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제1조 (수집하는 개인정보 항목 및 수집 방법)</h2>
            <p>회사는 회원가입, 주문·결제, 배송, 고객상담 등 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>
                <strong>회원가입 시 (필수)</strong> : 이름 또는 상호명, 휴대전화번호, 로그인 아이디(소셜 로그인 식별자), 비밀번호(자체 가입 시)
              </li>
              <li>
                <strong>회원가입 시 (선택)</strong> : 이메일 주소, 주소(기본 배송지), 담당자 연락처, 가입경로·가입목적
              </li>
              <li>
                <strong>소셜 로그인 이용 시</strong> : 네이버·카카오·구글 등 제휴 서비스로부터 회원 이름(또는 별명), 프로필 사진,
                그리고 이용자가 동의한 경우에 한해 이메일 주소·휴대전화번호 등을 제공받습니다. (제공 항목은 각 제휴 서비스의 동의 화면에 표시됩니다.)
              </li>
              <li>
                <strong>주문·결제·배송 시</strong> : 수령인 이름, 연락처, 배송지 주소, 결제 정보(무통장입금 시 입금자명 등)
              </li>
              <li>
                <strong>서비스 이용 과정에서 자동 생성·수집되는 정보</strong> : 접속 IP, 쿠키, 접속 일시, 서비스 이용 기록, 기기 정보
              </li>
            </ul>
            <p className="mt-2">수집 방법 : 홈페이지(회원가입·주문·상담), 소셜 로그인 연동, 서비스 이용 과정에서의 자동 수집</p>
          </section>

          {/* 2 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제2조 (개인정보의 수집·이용 목적)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 식별 및 본인 확인, 회원제 서비스 제공</li>
              <li>주문·결제·인쇄 제작·배송 등 거래의 이행 및 진행 상황 안내</li>
              <li>고객 상담·문의 응대, 불만 처리, 공지사항 전달</li>
              <li>부정 이용 방지, 분쟁 조정을 위한 기록 보존</li>
              <li>서비스 개선 및 신규 서비스 안내(이용자가 별도로 동의한 경우에 한함)</li>
            </ul>
          </section>

          {/* 3 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제3조 (개인정보의 보유 및 이용 기간)</h2>
            <p>
              회사는 원칙적으로 개인정보 수집·이용 목적이 달성되면 지체 없이 파기합니다. 다만, 다음의 경우에는 해당 기간 동안 보관합니다.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>회원 정보 : 회원 탈퇴 시까지 (단, 관계 법령 위반에 따른 수사·조사 등이 진행 중인 경우 종료 시까지)</li>
              <li>계약 또는 청약철회 등에 관한 기록 : 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>대금 결제 및 재화 등의 공급에 관한 기록 : 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>소비자 불만 또는 분쟁 처리에 관한 기록 : 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>표시·광고에 관한 기록 : 6개월 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
              <li>접속 로그 등 통신사실확인자료 : 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          {/* 4 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제4조 (개인정보의 제3자 제공)</h2>
            <p>
              회사는 이용자의 개인정보를 본 방침에서 고지한 범위를 넘어 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>이용자가 사전에 동의한 경우</li>
              <li>배송 업무 수행을 위해 배송 업체에 수령인 정보(이름·연락처·주소)를 제공하는 경우</li>
              <li>법령에 근거하거나 수사기관의 적법한 절차에 따른 요청이 있는 경우</li>
            </ul>
          </section>

          {/* 5 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제5조 (개인정보 처리의 위탁)</h2>
            <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁할 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>택배·물류 배송 업무 : 계약된 배송 대행사</li>
              <li>서버·클라우드 인프라 운영 : 클라우드 호스팅 사업자</li>
              <li>결제 처리 : 전자결제대행(PG) 사업자 (도입 시)</li>
            </ul>
            <p className="mt-2">회사는 위탁계약 체결 시 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고 관리·감독합니다.</p>
          </section>

          {/* 6 — 국외이전 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제6조 (개인정보의 국외이전)</h2>
            <p>
              회사는 서비스 제공을 위해 다음과 같이 이용자의 개인정보를 국외에 이전·보관합니다. 이전되는 개인정보는 암호화 등 안전조치를 적용하여 처리됩니다.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[13px] border border-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="border border-neutral-200 px-3 py-2 text-left font-medium">이전받는 자</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left font-medium">이전 국가</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left font-medium">이전 항목</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left font-medium">이전 목적</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left font-medium">이용 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-neutral-200 px-3 py-2">Railway Corp.</td>
                    <td className="border border-neutral-200 px-3 py-2">미국 (오리건)</td>
                    <td className="border border-neutral-200 px-3 py-2">회원 이름, 이메일, 휴대전화번호, 주문·결제 정보, 업로드 이미지 메타데이터</td>
                    <td className="border border-neutral-200 px-3 py-2">애플리케이션·데이터베이스 호스팅</td>
                    <td className="border border-neutral-200 px-3 py-2">회원 탈퇴 시까지 (관련 법령에 따른 보존 기간 적용)</td>
                  </tr>
                  <tr>
                    <td className="border border-neutral-200 px-3 py-2">Backblaze, Inc.</td>
                    <td className="border border-neutral-200 px-3 py-2">미국 (버지니아)</td>
                    <td className="border border-neutral-200 px-3 py-2">업로드 이미지 파일, 데이터베이스 백업본 (암호화)</td>
                    <td className="border border-neutral-200 px-3 py-2">이미지 파일 저장 및 데이터 백업</td>
                    <td className="border border-neutral-200 px-3 py-2">회원 탈퇴 시까지 (관련 법령에 따른 보존 기간 적용)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="list-disc pl-5 mt-3 space-y-1">
              <li>이전 일시 및 방법 : 서비스 이용·가입·주문 시점에 인터넷 회선을 통해 암호화(HTTPS, TLS)되어 이전됩니다.</li>
              <li>이용자는 본 국외이전에 동의하지 않을 권리가 있습니다. 다만, 국외이전이 서비스 제공에 필수적인 인프라이므로 동의를 거부하실 경우 회원가입 및 서비스 이용이 제한될 수 있습니다.</li>
            </ul>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제7조 (정보주체의 권리·의무 및 행사 방법)</h2>
            <p>
              이용자는 언제든지 본인의 개인정보를 조회·수정할 수 있으며, 회원 탈퇴를 통해 개인정보 이용에 대한 동의를 철회할 수 있습니다.
              개인정보 조회·수정은 마이페이지 또는 개인정보 보호책임자에게 서면·전화·이메일로 연락하시면 지체 없이 조치하겠습니다.
            </p>
            <p className="mt-2">만 14세 미만 아동의 회원가입은 받지 않습니다.</p>
          </section>

          {/* 7 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제8조 (개인정보의 파기 절차 및 방법)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>파기 절차 : 보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 내부 방침에 따라 안전하게 파기합니다.</li>
              <li>파기 방법 : 전자적 파일은 복구·재생이 불가능한 방법으로 영구 삭제하며, 출력물은 분쇄 또는 소각합니다.</li>
            </ul>
          </section>

          {/* 8 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제9조 (개인정보의 안전성 확보 조치)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>관리적 조치 : 내부관리계획 수립·시행, 취급 직원 최소화 및 교육</li>
              <li>기술적 조치 : 접근권한 관리, 비밀번호 등 중요 정보의 암호화, 접속기록 보관, 보안 프로그램 운영</li>
              <li>물리적 조치 : 데이터 보관 시스템에 대한 접근 통제</li>
            </ul>
          </section>

          {/* 9 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제10조 (쿠키 등 자동 수집 장치의 설치·운영 및 거부)</h2>
            <p>
              회사는 로그인 유지, 이용 통계 분석 등을 위해 쿠키(cookie)를 사용합니다. 이용자는 웹브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나,
              이 경우 로그인 등 일부 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          {/* 10 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제11조 (개인정보 보호책임자)</h2>
            <p>회사는 개인정보 처리에 관한 업무를 총괄하고 이용자의 불만 처리 및 피해 구제를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>개인정보 보호책임자 : {privacyOfficer}</li>
              <li>회사명 : {companyName}</li>
              <li>주소 : {address}</li>
              <li>전화 : {phone}</li>
              <li>이메일 : {email}</li>
            </ul>
          </section>

          {/* 11 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제12조 (권익침해 구제 방법)</h2>
            <p>개인정보 침해에 대한 신고·상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>개인정보침해 신고센터 (한국인터넷진흥원) : (국번 없이) 118 / privacy.kisa.or.kr</li>
              <li>개인정보 분쟁조정위원회 : 1833-6972 / www.kopico.go.kr</li>
              <li>대검찰청 사이버수사과 : (국번 없이) 1301 / www.spo.go.kr</li>
              <li>경찰청 사이버수사국 : (국번 없이) 182 / ecrm.police.go.kr</li>
            </ul>
          </section>

          {/* 12 */}
          <section>
            <h2 className="text-[18px] font-bold mb-3">제13조 (개인정보처리방침의 변경)</h2>
            <p>
              이 개인정보처리방침은 법령·정책 또는 보안 기술의 변경에 따라 내용이 추가·삭제·수정될 수 있으며, 변경 시 시행일 7일 전부터 홈페이지를 통해 공지합니다.
            </p>
            <p className="mt-4 text-neutral-500">시행일 : {EFFECTIVE_DATE}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
