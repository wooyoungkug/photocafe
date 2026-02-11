'use client';

import Link from 'next/link';
import { useSystemSettings, settingsToMap } from '@/hooks/use-system-settings';
import { useTranslations, useLocale } from 'next-intl';

export function ShopFooter() {
  const { data: settings } = useSystemSettings("company");
  const companyInfo = settings ? settingsToMap(settings) : {};
  const t = useTranslations('footer');
  const locale = useLocale();
  const isKorean = locale === 'ko';

  const companyName = isKorean
    ? (companyInfo.company_name || t('companyNameDefault'))
    : t('companyNameDefault');
  const ceoName = isKorean
    ? (companyInfo.company_ceo || t('ceoDefault'))
    : t('ceoDefault');
  const companyAddress = isKorean
    ? (companyInfo.company_address ? `${companyInfo.company_address} ${companyInfo.company_address_detail || ''}` : '')
    : t('defaultAddress');

  return (
    <footer className="bg-neutral-900 text-neutral-400">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8">
          {/* Company Info */}
          <div>
            <Link href="/" className="inline-block mb-5">
              <span className="shop-heading text-xl font-light tracking-tight text-white">
                Photo<span className="font-normal">Cafe</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-neutral-500">
              {t('companyDescription')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-gold mb-5 font-medium">{t('quickLinks')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  {t('aboutUs')}
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  {t('productGuide')}
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-white transition-colors">
                  {t('guide')}
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  {t('faq')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-gold mb-5 font-medium">{t('customerService')}</h4>
            <div className="space-y-2 text-sm">
              <p className="text-xl font-light text-white shop-heading">
                {companyInfo.company_cs_phone || '1588-0000'}
              </p>
              <p className="text-neutral-500">{isKorean ? (companyInfo.company_cs_hours || t('weekdayHours')) : t('weekdayHours')}</p>
              <p className="text-neutral-500">{t('lunchTime')}</p>
              <p className="text-neutral-500">{t('holidayClosed')}</p>
              <p className="mt-3">
                <a
                  href={`mailto:${companyInfo.company_email || 'support@printing114.com'}`}
                  className="hover:text-white transition-colors text-gold"
                >
                  {companyInfo.company_email || 'support@printing114.com'}
                </a>
              </p>
            </div>
          </div>

          {/* Bank Info */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-gold mb-5 font-medium">{t('bankAccount')}</h4>
            <div className="space-y-2 text-sm">
              <p className="text-white font-medium">{t('bankName')}</p>
              <p>123-456-789012</p>
              <p>{t('accountHolder')} {companyName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-neutral-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-[11px] text-neutral-500 text-center md:text-left space-y-1">
              <p>
                {t('tradeName')} {companyName} | {t('ceo')} {ceoName} | {companyInfo.company_business_number || '123-45-67890'}
                {companyInfo.company_ecommerce_number && ` | ${t('ecommerceNumber')} ${companyInfo.company_ecommerce_number}`}
              </p>
              <p>{t('address')} {companyAddress || `${companyInfo.company_address || ''} ${companyInfo.company_address_detail || ''}`}</p>
              <p>{t('mainPhone')} {companyInfo.company_phone || '02-1234-5678'} | {t('fax')} {companyInfo.company_fax || '02-1234-5679'}</p>
            </div>
            <div className="flex items-center gap-6 text-[11px] tracking-wider uppercase">
              <Link href="/terms" className="hover:text-white transition-colors">
                {t('terms')}
              </Link>
              <Link href="/privacy" className="hover:text-white transition-colors">
                {t('privacy')}
              </Link>
            </div>
          </div>
          <div className="text-center text-[11px] text-neutral-600 mt-6 pt-6 border-t border-neutral-800">
            <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
