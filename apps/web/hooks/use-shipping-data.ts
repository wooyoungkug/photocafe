'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useSystemSettings, settingsToMap } from '@/hooks/use-system-settings';
import { useDeliveryPricings, type DeliveryPricing } from '@/hooks/use-delivery-pricing';
import { useMemo } from 'react';

// 회사 정보 (발송지용)
export interface CompanyShippingInfo {
  name: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
}

// 주문자(거래처) 정보 (발송지/배송지용)
export interface OrdererShippingInfo {
  id: string;
  clientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  shippingType: 'conditional' | 'free' | 'prepaid' | 'cod';
}

/**
 * 배송 관련 데이터를 통합 로드하는 훅
 * - 회사정보 (발송지-회사)
 * - 주문자정보 (발송지-주문자 / 배송지-본인)
 * - 배송비 단가 (택배, 화물, 오토바이퀵 등)
 */
export function useShippingData() {
  const { user } = useAuthStore();

  // 1. 회사정보 (시스템설정)
  const { data: companySettings, isLoading: isLoadingCompany } = useSystemSettings('company');

  // 2. 주문자(거래처) 정보
  const { data: clientInfo, isLoading: isLoadingClient } = useQuery<OrdererShippingInfo>({
    queryKey: ['client-shipping-info', user?.id],
    queryFn: async () => {
      const response = await api.get<any>(`/clients/${user!.id}`);
      return {
        id: response.id,
        clientName: response.clientName || user?.name || '',
        phone: response.mobile || response.phone || '',
        postalCode: response.postalCode || '',
        address: response.address || '',
        addressDetail: response.addressDetail || '',
        shippingType: response.shippingType || 'conditional',
      };
    },
    enabled: !!user?.id,
  });

  // 3. 배송비 단가
  const { data: deliveryPricings, isLoading: isLoadingPricings } = useDeliveryPricings();

  // 회사정보 파싱
  const companyInfo = useMemo<CompanyShippingInfo | null>(() => {
    if (!companySettings) return null;
    const map = settingsToMap(companySettings);
    return {
      name: map['company_name'] || '',
      phone: map['company_phone'] || '',
      postalCode: map['company_postal_code'] || '',
      address: map['company_address'] || '',
      addressDetail: map['company_address_detail'] || '',
    };
  }, [companySettings]);

  // 배송방법별 단가 맵
  const pricingMap = useMemo<Record<string, DeliveryPricing>>(() => {
    if (!deliveryPricings) return {};
    return deliveryPricings.reduce((acc, p) => {
      acc[p.deliveryMethod] = p;
      return acc;
    }, {} as Record<string, DeliveryPricing>);
  }, [deliveryPricings]);

  return {
    companyInfo,
    clientInfo: clientInfo ?? null,
    deliveryPricings: deliveryPricings ?? [],
    pricingMap,
    isLoading: isLoadingCompany || isLoadingClient || isLoadingPricings,
  };
}
