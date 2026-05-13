'use client';

import { useSystemSettings, settingsToMap } from '@/hooks/use-system-settings';

const EFFECTIVE_DATE = '2026년 5월 13일';

export default function TermsPage() {
  const { data: settings } = useSystemSettings('company');
  const c = settings ? settingsToMap(settings) : {};

  const companyName = c.company_name || '(주)프린팅솔루션즈';
  const serviceName = 'PhotoCafe';
  const email = c.company_email || 'support@photocafe.co.kr';
  const phone = c.company_cs_phone || c.company_phone || '고객센터 전화번호';

  return (
    <div className="bg-white">
      <div className="container mx-auto px-4 py-12 md:py-16 max-w-3xl">
        <h1 className="text-[24px] text-black font-normal mb-2">이용약관</h1>
        <p className="text-[14px] text-neutral-500 mb-10">
          본 약관은 {companyName}(이하 &ldquo;회사&rdquo;)가 운영하는 {serviceName}(이하 &ldquo;서비스&rdquo;)의 이용 조건 및 절차,
          회원과 회사의 권리·의무 및 책임사항을 규정합니다.
        </p>

        <div className="space-y-10 text-[14px] text-black leading-relaxed">
          <section>
            <h2 className="text-[18px] font-bold mb-3">제1조 (목적)</h2>
            <p>
              이 약관은 회사가 제공하는 인쇄물(포토북·앨범·액자·디지털 출력물 등) 주문 및 관련 서비스의 이용과 관련하여 회사와 회원 간의
              권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제2조 (용어의 정의)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>&ldquo;서비스&rdquo;란 회사가 {serviceName} 사이트를 통해 제공하는 인쇄 주문·제작·배송 및 부가 서비스를 말합니다.</li>
              <li>&ldquo;회원&rdquo;이란 본 약관에 동의하고 회사와 이용계약을 체결한 자(자체 가입 회원 및 네이버·카카오·구글 등 소셜 로그인 회원 포함)를 말합니다.</li>
              <li>&ldquo;아이디(ID)&rdquo;란 회원 식별과 서비스 이용을 위해 회원이 정하거나 소셜 로그인 시 부여되는 고유 식별값을 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제3조 (약관의 게시와 개정)</h2>
            <p>
              회사는 이 약관의 내용을 회원이 쉽게 확인할 수 있도록 서비스 화면에 게시합니다. 회사는 관련 법령을 위배하지 않는 범위에서 약관을 개정할 수 있으며,
              개정 시 적용일자 및 개정 사유를 명시하여 적용일 7일 전(회원에게 불리하거나 중대한 변경의 경우 30일 전)부터 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제4조 (이용계약의 성립)</h2>
            <p>
              이용계약은 이용자가 본 약관에 동의하고 회원가입을 신청한 후 회사가 이를 승낙함으로써 성립합니다. 소셜 로그인의 경우 제휴 서비스 인증 완료 후
              필수 회원정보 등록을 마치면 이용계약이 성립합니다. 회사는 다음 각 호에 해당하는 신청에 대해 승낙을 거부하거나 사후에 이용계약을 해지할 수 있습니다.
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>타인의 명의·정보를 도용한 경우</li>
              <li>허위 정보를 기재하거나 회사가 요구하는 정보를 제공하지 않은 경우</li>
              <li>만 14세 미만 아동이 신청한 경우</li>
              <li>이전에 약관 위반 등으로 이용 자격을 상실한 적이 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제5조 (회원정보의 변경 및 관리)</h2>
            <p>
              회원은 마이페이지를 통해 본인의 정보를 열람·수정할 수 있으며, 정보 변경 시 지체 없이 갱신하여야 합니다. 아이디 및 비밀번호의 관리 책임은 회원에게 있으며,
              제3자가 이용하도록 하여서는 안 됩니다. 회원은 계정 도용 사실을 인지한 경우 즉시 회사에 통지하고 안내에 따라야 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제6조 (서비스의 제공 및 변경)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사는 인쇄물 주문·견적·제작·배송, 주문 내역 조회, 고객 상담 등의 서비스를 제공합니다.</li>
              <li>회사는 운영상·기술상 필요에 따라 서비스의 전부 또는 일부를 변경할 수 있으며, 변경 시 사전에 공지합니다.</li>
              <li>회사는 천재지변, 시스템 점검·장애, 통신 두절 등 부득이한 사유가 있는 경우 서비스 제공을 일시 중단할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제7조 (주문, 결제 및 제작)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원은 서비스에 안내된 절차에 따라 상품을 주문하고 대금을 결제합니다. 결제 수단·방법은 회사가 정한 바에 따릅니다.</li>
              <li>인쇄물은 회원이 업로드·확정한 데이터(원판, 시안 등)를 기준으로 제작되며, 회원이 제공한 데이터의 적법성·정확성에 대한 책임은 회원에게 있습니다.</li>
              <li>회원이 제공한 데이터가 타인의 저작권·초상권 등 권리를 침해하는 경우 그에 따른 책임은 회원이 부담합니다.</li>
              <li>제작이 개시된 이후에는 주문 취소·변경이 제한될 수 있으며, 구체적인 기준은 상품별 안내에 따릅니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제8조 (청약철회 및 교환·환불)</h2>
            <p>
              회원은 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 청약철회를 할 수 있습니다. 다만, 회원의 주문에 따라 개별적으로 제작되는 인쇄물 등
              회원의 주문에 따라 개별 생산되는 재화로서 청약철회 시 회사에 회복할 수 없는 중대한 피해가 예상되는 경우에는, 회사가 사전에 그 사실을 고지하고
              회원의 서면(전자문서 포함) 동의를 받은 때에 한하여 청약철회가 제한될 수 있습니다. 상품의 하자·오배송 등 회사의 귀책사유가 있는 경우에는
              교환·재제작 또는 환불이 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제9조 (회원의 의무)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원은 관계 법령, 본 약관, 이용안내 및 회사가 통지하는 사항을 준수하여야 합니다.</li>
              <li>회원은 다음 행위를 하여서는 안 됩니다 : 타인 정보 도용, 허위 사실 등록, 회사·제3자의 지식재산권 침해, 서비스 운영 방해, 음란·불법 자료의 게시 또는 출력 의뢰, 기타 위법·부당한 행위.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제10조 (게시물 및 업로드 데이터의 관리)</h2>
            <p>
              회원이 서비스에 업로드한 이미지·문서 등 데이터의 저작권은 해당 회원 또는 정당한 권리자에게 있습니다. 회사는 주문 처리·제작·배송·고객 상담 및 분쟁 대응에 필요한 범위에서만 해당 데이터를 이용하며,
              보관 기간 경과 또는 회원의 요청에 따라 이를 삭제할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제11조 (계약 해지 및 이용 제한)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원은 언제든지 마이페이지 또는 고객센터를 통해 회원 탈퇴를 신청할 수 있으며, 회사는 관련 법령이 정하는 바에 따라 이를 처리합니다.</li>
              <li>회사는 회원이 본 약관을 위반하거나 서비스의 정상적 운영을 방해한 경우 사전 통지 후(긴급한 경우 사후 통지) 서비스 이용을 제한하거나 이용계약을 해지할 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제12조 (개인정보의 보호)</h2>
            <p>
              회사는 회원의 개인정보를 관계 법령에 따라 보호하며, 구체적인 사항은 별도의 <a href="/privacy" className="underline text-blue-700">개인정보처리방침</a>에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제13조 (책임의 한계 및 면책)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회사는 천재지변, 회원의 귀책사유, 회원이 제공한 데이터의 하자 등 회사의 책임 없는 사유로 발생한 손해에 대해 책임을 지지 않습니다.</li>
              <li>회사는 회원이 서비스를 통해 기대하는 수익을 얻지 못하거나 서비스 자료의 선택·이용으로 발생한 손해 등에 대해 책임을 지지 않습니다.</li>
              <li>색상·재질 등은 모니터 환경 및 인쇄 공정의 특성상 실제 결과물과 차이가 있을 수 있으며, 이는 하자에 해당하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제14조 (분쟁의 해결 및 준거법)</h2>
            <p>
              이 약관과 관련하여 회사와 회원 간에 분쟁이 발생한 경우 양 당사자는 신의에 따라 성실히 협의하여 해결합니다. 협의가 이루어지지 않을 경우 관련 법령 및 상관례에 따르며,
              소송이 제기되는 경우 민사소송법에 따른 관할 법원을 제1심 관할 법원으로 합니다. 본 약관은 대한민국 법령에 따라 규율되고 해석됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[18px] font-bold mb-3">제15조 (고객센터)</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>상호 : {companyName}</li>
              <li>전화 : {phone}</li>
              <li>이메일 : {email}</li>
            </ul>
            <p className="mt-4 text-neutral-500">시행일 : {EFFECTIVE_DATE}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
