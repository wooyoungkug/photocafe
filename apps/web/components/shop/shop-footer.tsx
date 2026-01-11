'use client';

import Link from 'next/link';
import { useSystemSettings, settingsToMap } from '@/hooks/use-system-settings';

export function ShopFooter() {
  const { data: settings } = useSystemSettings("company");
  const companyInfo = settings ? settingsToMap(settings) : {};

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">P</span>
              </div>
              <span className="text-xl font-bold text-white">PhotoCafe</span>
            </div>
            <p className="text-sm leading-relaxed">
              고품질 포토북, 앨범, 출력물 인쇄 전문업체입니다.
              최상의 품질과 빠른 배송으로 고객님께 감동을 드립니다.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">빠른 링크</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  회사소개
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  상품안내
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-white transition-colors">
                  이용안내
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  자주묻는질문
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-4">고객센터</h4>
            <div className="space-y-2 text-sm">
              <p className="text-2xl font-bold text-white">{companyInfo.company_cs_phone || '1588-0000'}</p>
              <p>{companyInfo.company_cs_hours || '평일 09:00 - 18:00'}</p>
              <p>주말/공휴일 휴무</p>
              <p className="mt-2">
                <a href={`mailto:${companyInfo.company_email || 'support@photocafe.com'}`} className="hover:text-white">
                  {companyInfo.company_email || 'support@photocafe.com'}
                </a>
              </p>
            </div>
          </div>

          {/* Bank Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">입금계좌</h4>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-white">국민은행</p>
              <p>123-456-789012</p>
              <p>예금주: {companyInfo.company_name || '(주)포토카페'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-center md:text-left">
              <p>
                {companyInfo.company_name || '(주)포토카페'} | 대표: {companyInfo.company_ceo || '홍길동'} | 사업자등록번호: {companyInfo.company_business_number || '123-45-67890'}
                {companyInfo.company_ecommerce_number && ` | 통신판매신고: ${companyInfo.company_ecommerce_number}`}
              </p>
              <p>주소: {companyInfo.company_address || '서울특별시 강남구 테헤란로 123'} {companyInfo.company_address_detail || ''}</p>
              <p>대표전화: {companyInfo.company_phone || '02-1234-5678'} | 팩스: {companyInfo.company_fax || '02-1234-5679'}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/terms" className="hover:text-white transition-colors">
                이용약관
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                개인정보처리방침
              </Link>
            </div>
          </div>
          <div className="text-center text-sm mt-4 pt-4 border-t border-gray-800">
            <p>&copy; {new Date().getFullYear()} {companyInfo.company_name || 'PhotoCafe'}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
