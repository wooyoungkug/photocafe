'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, CreditCard, Wallet, Building2, Smartphone, AlertTriangle, CheckCircle2, AlertCircle, Copy, Truck } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FolderShippingSection } from '@/components/album-upload/folder-shipping-section';
import { useShippingData } from '@/hooks/use-shipping-data';
import { isShippingComplete, getCartShippingSummary } from '@/app/(shop)/cart/_components/cart-item-card';
import type { CartShippingInfo } from '@/stores/cart-store';
import type { FolderShippingInfo } from '@/stores/multi-folder-upload-store';

interface ClientInfo {
  id: string;
  clientName: string;
  phone: string | null;
  mobile: string | null;
  postalCode: string | null;
  address: string | null;
  addressDetail: string | null;
}

// 동판 정보 변경 감지용 인터페이스
interface CopperPlateChangeItem {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

interface CopperPlateChanges {
  itemId: string;
  itemName: string;
  plateName: string;
  copperPlateId: string;
  selectedFoilColor: string;
  selectedFoilPosition: string;
  changes: CopperPlateChangeItem[];
}

// base64 데이터 URL 필터링 (백엔드 전송 금지)
const safeUrl = (url?: string) =>
  url && !url.startsWith('data:') ? url : undefined;

// FolderShippingInfo → CartShippingInfo 변환
const folderToCartShipping = (s: FolderShippingInfo): CartShippingInfo => ({
  senderType: s.senderType,
  senderName: s.senderName,
  senderPhone: s.senderPhone,
  senderPostalCode: s.senderPostalCode,
  senderAddress: s.senderAddress,
  senderAddressDetail: s.senderAddressDetail,
  receiverType: s.receiverType,
  recipientName: s.recipientName,
  recipientPhone: s.recipientPhone,
  recipientPhone2: s.recipientPhone2,
  recipientPostalCode: s.recipientPostalCode,
  recipientAddress: s.recipientAddress,
  recipientAddressDetail: s.recipientAddressDetail,
  deliveryMethod: s.deliveryMethod,
  deliveryFee: s.deliveryFee,
  deliveryFeeType: s.deliveryFeeType,
  fareType: s.fareType,
  deliveryMemo: s.deliveryMemo,
});

// CartShippingInfo → 백엔드 DTO 필드명 매핑
const toShippingDto = (s: CartShippingInfo) => ({
  senderType: s.senderType,
  senderName: s.senderName,
  senderPhone: s.senderPhone,
  senderPostalCode: s.senderPostalCode,
  senderAddress: s.senderAddress,
  senderAddressDetail: s.senderAddressDetail,
  receiverType: s.receiverType,
  recipientName: s.recipientName,
  phone: s.recipientPhone,
  postalCode: s.recipientPostalCode,
  address: s.recipientAddress,
  addressDetail: s.recipientAddressDetail,
  deliveryMethod: s.deliveryMethod,
  deliveryFee: s.deliveryFee,
  deliveryFeeType: s.deliveryFeeType,
  fareType: s.fareType,
  deliveryMemo: s.deliveryMemo,
});

export default function OrderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { items, getTotal, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [paymentMethod, setPaymentMethod] = useState('postpaid');
  const [memo, setMemo] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 건별 배송 상태 (cart에서 가져온 기존값으로 초기화)
  const [itemShippingMap, setItemShippingMap] = useState<Record<string, CartShippingInfo>>(() => {
    const map: Record<string, CartShippingInfo> = {};
    items.forEach(item => {
      const existing = item.albumOrderInfo?.shippingInfo || item.shippingInfo;
      if (existing) map[item.id] = existing;
    });
    return map;
  });

  // 배송 데이터 훅 (회사정보, 거래처정보, 배송비)
  const { companyInfo, clientInfo: shippingClientInfo, pricingMap } = useShippingData();

  // 회원정보 (동판 변경 감지용)
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [showChangeConfirmModal, setShowChangeConfirmModal] = useState(false);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);

  // 동판 정보 변경 감지 관련 상태
  const [copperPlateChanges, setCopperPlateChanges] = useState<CopperPlateChanges[]>([]);
  const [updateCopperPlateInfo, setUpdateCopperPlateInfo] = useState(true);

  // 합배송 체크 상태
  const [sameDayData, setSameDayData] = useState<{
    applicable: boolean;
    totalProductAmount: number;
    totalShippingCharged: number;
    freeThreshold: number;
    ordersWithFee: { orderId: string; orderNumber: string; shippingFee: number }[];
    pendingAdjustmentAmount: number;
    pendingAdjustmentReason: string | null;
  } | null>(null);

  // 회원정보 로드 (ID 직접 조회 → 실패 시 email로 검색)
  const loadClientInfo = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await api.get<ClientInfo>(`/clients/${user.id}`);
      setClientInfo(response);
    } catch {
      // ID로 못 찾으면 email로 검색 (관리자/staff 로그인 시)
      if (user.email) {
        try {
          const searchResult = await api.get<{ data: ClientInfo[] }>('/clients', { search: user.email, limit: 1 });
          if (searchResult.data?.[0]) {
            setClientInfo(searchResult.data[0]);
          }
        } catch {
        }
      }
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadClientInfo();
    }
  }, [isAuthenticated, user?.id, loadClientInfo]);

  // 합배송 체크: 조건부택배 회원만 해당 (당일 주문 누적 기준)
  useEffect(() => {
    const clientId = clientInfo?.id || (user?.clientId ?? null);
    if (!clientId || shippingClientInfo?.shippingType !== 'conditional') return;
    api.get<any>(`/orders/same-day-shipping?clientId=${clientId}`)
      .then(data => setSameDayData(data))
      .catch(() => {});
  }, [clientInfo?.id, user?.clientId, shippingClientInfo?.shippingType]);

  // 건별 배송 핸들러
  const handleItemShippingChange = (itemId: string, shipping: FolderShippingInfo) => {
    setItemShippingMap(prev => ({ ...prev, [itemId]: folderToCartShipping(shipping) }));
  };

  const handleApplyShippingToAll = (sourceItemId: string) => {
    const sourceShipping = itemShippingMap[sourceItemId];
    if (!sourceShipping) return;
    const newMap: Record<string, CartShippingInfo> = {};
    items.forEach(item => {
      if (item.albumOrderInfo?.shippingInfo) {
        newMap[item.id] = item.albumOrderInfo.shippingInfo;
      } else {
        newMap[item.id] = sourceShipping;
      }
    });
    setItemShippingMap(newMap);
    toast.success('모든 항목에 배송정보가 적용되었습니다');
  };

  const handleCopyFromPrevious = (itemId: string) => {
    const idx = items.findIndex(i => i.id === itemId);
    if (idx <= 0) return;
    for (let i = idx - 1; i >= 0; i--) {
      const prevShipping = itemShippingMap[items[i].id];
      if (prevShipping && isShippingComplete(prevShipping)) {
        setItemShippingMap(prev => ({ ...prev, [itemId]: prevShipping }));
        toast.success('이전 항목 배송정보가 복사되었습니다');
        break;
      }
    }
  };

  // 전체 배송 완료 여부
  const allShippingComplete = items.every(item =>
    item.albumOrderInfo?.shippingInfo ? true : isShippingComplete(itemShippingMap[item.id])
  );

  // 동판 정보 변경사항 비교
  const detectCopperPlateChanges = useCallback((): CopperPlateChanges[] => {
    const allChanges: CopperPlateChanges[] = [];

    items.forEach(item => {
      if (!item.copperPlateInfo) return;

      const info = item.copperPlateInfo;
      const changes: CopperPlateChangeItem[] = [];

      if (info.selectedFoilColor && info.selectedFoilColor !== info.originalFoilColor) {
        changes.push({
          field: 'foilColor',
          label: '박색상',
          oldValue: info.originalFoilColorName || info.originalFoilColor || '(없음)',
          newValue: info.selectedFoilColorName || info.selectedFoilColor,
        });
      }

      if (info.selectedFoilPosition && info.selectedFoilPosition !== info.originalFoilPosition) {
        changes.push({
          field: 'foilPosition',
          label: '박위치',
          oldValue: info.originalFoilPositionName || info.originalFoilPosition || '(없음)',
          newValue: info.selectedFoilPositionName || info.selectedFoilPosition,
        });
      }

      if (changes.length > 0) {
        allChanges.push({
          itemId: item.id,
          itemName: item.name,
          plateName: info.plateName,
          copperPlateId: info.copperPlateId,
          selectedFoilColor: info.selectedFoilColor,
          selectedFoilPosition: info.selectedFoilPosition,
          changes,
        });
      }
    });

    return allChanges;
  }, [items]);

  // 상담 카테고리 조회
  const getSystemCategoryId = async (): Promise<string | null> => {
    try {
      const categories = await api.get<{ data: { id: string; name: string }[] }>('/consultation-categories');
      const systemCategory = categories.data?.find(
        (cat) => cat.name.includes('시스템') || cat.name.includes('정보변경') || cat.name.includes('기타')
      );
      return systemCategory?.id || null;
    } catch {
      return null;
    }
  };

  // 동판 정보 업데이트 및 상담이력 기록
  const updateCopperPlateInfoAndLog = async (cpChanges: CopperPlateChanges[], categoryId: string | null) => {
    if (!clientInfo || cpChanges.length === 0) return;

    try {
      await Promise.all(cpChanges.map(cpChange => {
        const updateData: Record<string, string> = {};
        if (cpChange.selectedFoilColor) updateData.foilColor = cpChange.selectedFoilColor;
        if (cpChange.selectedFoilPosition) updateData.foilPosition = cpChange.selectedFoilPosition;
        return api.put(`/copper-plates/${cpChange.copperPlateId}`, updateData);
      }));

      if (categoryId) {
        const changeDetails = cpChanges
          .map(cp => {
            const changes = cp.changes
              .map(c => `  • ${c.label}: ${c.oldValue} → ${c.newValue}`)
              .join('\n');
            return `[${cp.plateName}] (${cp.itemName})\n${changes}`;
          })
          .join('\n\n');

        await api.post('/consultations', {
          clientId: clientInfo.id,
          categoryId,
          title: '[자동] 주문 시 동판 정보 변경',
          content: `고객이 주문 과정에서 동판(박 각인) 정보를 변경하고 동판 정보 수정에 동의했습니다.\n\n변경 내역:\n${changeDetails}`,
          counselorId: 'SYSTEM',
          counselorName: '시스템',
          status: 'closed',
          priority: 'low',
          internalMemo: '주문 페이지에서 자동 생성된 상담 기록 - 동판 정보 변경',
        });
      }

      toast.success('동판 정보가 업데이트되었습니다', { description: '변경된 박색상/박위치가 동판 정보에 저장되었습니다.' });
    } catch (error) {
    }
  };

  // 상담이력만 기록 (업데이트 거부 시)
  const logChangesOnly = async (
    categoryId: string | null,
    title: string,
    content: string,
    internalMemo: string
  ) => {
    if (!clientInfo || !categoryId) return;
    try {
      await api.post('/consultations', {
        clientId: clientInfo.id,
        categoryId,
        title,
        content,
        counselorId: 'SYSTEM',
        counselorName: '시스템',
        status: 'closed',
        priority: 'low',
        internalMemo,
      });
    } catch {
      // 상담이력 기록 실패 시 무시
    }
  };

  // 주문 실행
  const executeOrder = async (
    orderDataList: any[],
    shouldUpdateCopperPlate: boolean,
    cpChanges: CopperPlateChanges[]
  ) => {
    try {
      // 주문번호 충돌 방지를 위해 순차 처리
      let firstOrderNumber: string | undefined;
      for (const orderData of orderDataList) {
        const res = await api.post<{ orderNumber: string }>('/orders', orderData);
        if (!firstOrderNumber) firstOrderNumber = res.orderNumber;
      }

      if (cpChanges.length > 0) {
        const categoryId = await getSystemCategoryId();

        if (shouldUpdateCopperPlate) {
          await updateCopperPlateInfoAndLog(cpChanges, categoryId);
        } else {
          const changeDetails = cpChanges
            .map(cp => {
              const ch = cp.changes.map(c => `  • ${c.label}: ${c.oldValue} → ${c.newValue}`).join('\n');
              return `[${cp.plateName}] (${cp.itemName})\n${ch}`;
            })
            .join('\n\n');
          await logChangesOnly(
            categoryId,
            '[자동] 주문 시 동판 정보 변경 (동판 정보 미수정)',
            `고객이 주문 과정에서 동판(박 각인) 정보와 다른 설정으로 주문했습니다.\n(동판 정보 수정 거부)\n\n변경 내역:\n${changeDetails}`,
            '주문 페이지에서 자동 생성된 상담 기록 - 동판 정보 수정 거부'
          );
        }
      }

      // 앨범 주문이 있으면 거래처 선호 패턴 자동 갱신
      const prefClientId = clientInfo?.id || user?.id;
      const albumOrders = items.filter(item => item.productType === 'album-order' && item.albumOrderInfo);
      if (albumOrders.length > 0 && prefClientId) {
        const lastAlbum = albumOrders[albumOrders.length - 1].albumOrderInfo!;
        api.put(`/clients/${prefClientId}/album-preference`, {
          preferredEditStyle: lastAlbum.pageLayout || undefined,
          preferredBinding: lastAlbum.bindingDirection || undefined,
        }).catch(() => {});
      }

      toast.success('주문이 완료되었습니다', { description: '주문내역은 마이페이지에서 확인하실 수 있습니다.' });

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearCart();
      router.push(`/order/complete${firstOrderNumber ? `?orderNumber=${firstOrderNumber}` : ''}`);
    } catch (error) {
      toast.error('주문 실패', { description: error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.' });
    }
  };

  // 모달 확인 버튼 핸들러
  const handleConfirmOrder = async () => {
    setShowChangeConfirmModal(false);
    setIsSubmitting(true);

    try {
      await executeOrder(pendingOrderData, updateCopperPlateInfo, copperPlateChanges);
    } finally {
      setIsSubmitting(false);
      setPendingOrderData(null);
      setCopperPlateChanges([]);
    }
  };

  // 모달 취소 핸들러
  const handleCancelModal = () => {
    setShowChangeConfirmModal(false);
    setPendingOrderData(null);
    setCopperPlateChanges([]);
    setIsSubmitting(false);
  };

  // 앨범 상품 중 serverFiles 누락 검사 → 장바구니로 리다이렉트
  const albumItemsMissingFiles = items.filter(
    (item) => item.productType === 'album-order' && (!item.serverFiles || item.serverFiles.length === 0)
  );

  useEffect(() => {
    if (albumItemsMissingFiles.length > 0) {
      toast.error('파일 데이터 누락', {
        description: `${albumItemsMissingFiles.length}건의 앨범 상품에 파일 데이터가 누락되었습니다. 해당 상품을 삭제 후 다시 업로드해주세요.`,
      });
      router.replace('/cart');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = getTotal();

  // 스튜디오배송 상품 합계 (무료배송 기준 비교용 - 고객직배송 제외)
  const studioItemsTotal = useMemo(() => {
    return items
      .filter((item) => {
        const sh = item.albumOrderInfo?.shippingInfo || itemShippingMap[item.id];
        return sh?.receiverType === 'orderer';
      })
      .reduce((sum, item) => sum + item.totalPrice, 0);
  }, [items, itemShippingMap]);

  const freeShippingThreshold = shippingClientInfo?.freeShippingThreshold ?? 90000;

  // 합배송 적용 여부 계산 (hooks는 early return 전에 선언해야 함)
  // 스튜디오배송 상품만 기준으로 판단 (고객직배송은 합배송 대상 아님)
  const combinedShipping = useMemo(() => {
    if (!sameDayData?.applicable) return null;
    const combinedTotal = sameDayData.totalProductAmount + studioItemsTotal;
    // 당일 누적(이전 주문 + 현재 스튜디오배송)이 기준금액 이상이면 스튜디오배송 무료
    const isTriggered = combinedTotal >= sameDayData.freeThreshold;
    // 묶음배송: 당일 이미 배송비가 청구된 주문이 있으면 이번 주문 스튜디오배송 무료
    const isBundledFree = sameDayData.ordersWithFee?.length > 0;
    const isStudioFree = isTriggered || isBundledFree;
    // 합배송 조건 충족 + 이전 주문에 청구된 배송비가 있으면 환급 (임계값 달성 시에만)
    const shouldRefundPrevious = isTriggered && sameDayData.totalShippingCharged > 0;
    return { ...sameDayData, isTriggered, isBundledFree, isStudioFree, shouldRefundPrevious, studioTotal: studioItemsTotal, combinedTotal };
  }, [sameDayData, studioItemsTotal]);

  // 스튜디오배송 무료 여부 (거래처 배송타입 + 합배송 포함)
  const isStudioFree = useMemo(() => {
    return shippingClientInfo?.shippingType === 'free' ||
      (shippingClientInfo?.shippingType === 'conditional' && studioItemsTotal >= freeShippingThreshold) ||
      !!combinedShipping?.isStudioFree;
  }, [shippingClientInfo?.shippingType, studioItemsTotal, freeShippingThreshold, combinedShipping?.isStudioFree]);

  // 배송비 합계: 장바구니와 동일한 로직
  // - 고객직배송: 무조건 청구 (개별 배송)
  // - 스튜디오배송: 무료 조건 미달 시 배송방법별 1회만 청구
  const totalShippingFee = useMemo(() => {
    let total = 0;
    const chargedStudioMethods = new Set<string>();

    for (const item of items) {
      const sh = item.albumOrderInfo?.shippingInfo || itemShippingMap[item.id];
      if (!sh || sh.deliveryMethod === 'pickup') continue;
      // 착불(cod)은 수령인이 직접 지불 → 주문 금액에 포함하지 않음
      if (sh.fareType === 'cod') continue;

      if (sh.receiverType === 'direct_customer') {
        // 고객직배송: 조건 없이 항목별 청구
        total += sh.deliveryFee || 0;
      } else if (sh.receiverType === 'orderer' && !isStudioFree) {
        // 스튜디오배송: 동일 배송방법은 1회만 청구 (합배송)
        if (!chargedStudioMethods.has(sh.deliveryMethod)) {
          chargedStudioMethods.add(sh.deliveryMethod);
          total += sh.deliveryFee || 0;
        }
      }
    }
    return total;
  }, [items, itemShippingMap, isStudioFree]);

  const effectiveShippingFee = totalShippingFee;
  // 이전 배송비 환급: 이번 주문으로 처음 기준을 넘는 경우에만 차감
  const combinedShippingAdjustment = combinedShipping?.shouldRefundPrevious ? -(combinedShipping.totalShippingCharged) : 0;
  // 미결 조정금액: 양수=크레딧(차감), 음수=부채(추가청구) → total에 반대 부호로 반영
  const pendingAdjustmentAmount = sameDayData?.pendingAdjustmentAmount ?? 0;
  const total = subtotal + effectiveShippingFee + combinedShippingAdjustment - pendingAdjustmentAmount;

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">로그인이 필요합니다</h1>
          <p className="text-gray-500 mb-8">주문을 진행하려면 로그인해주세요.</p>
          <Link href="/login?redirect=/order">
            <Button size="lg">로그인하기</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">주문할 상품이 없습니다</h1>
          <p className="text-gray-500 mb-8">장바구니에 상품을 담아주세요.</p>
          <Link href="/">
            <Button size="lg">쇼핑하러 가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agreeTerms) {
      toast.error('약관 동의 필요', { description: '주문을 진행하려면 약관에 동의해주세요.' });
      return;
    }

    if (!allShippingComplete) {
      toast.error('배송정보 입력 필요', { description: '모든 항목의 배송정보를 입력해주세요.' });
      return;
    }

    // 앨범 상품의 업로드 파일 유효성 검증
    const albumItemsWithNoFiles = items.filter(
      item => item.productType === 'album-order' && (!item.serverFiles || item.serverFiles.length === 0)
    );
    if (albumItemsWithNoFiles.length > 0) {
      toast.error('파일 업로드 필요', {
        description: `${albumItemsWithNoFiles.length}건의 앨범 상품에 업로드된 파일이 없습니다. 장바구니에서 다시 업로드해주세요.`,
      });
      return;
    }

    const clientId = clientInfo?.id || user?.id;

    if (!clientId) {
      toast.error('회원 정보 오류', { description: '회원 정보를 불러올 수 없습니다. 다시 로그인해주세요.' });
      return;
    }

    // 주문 데이터 준비 - 아이템별 개별 주문 생성
    const orderDataList = items.map(item => {
      // 건별 배송정보 조회
      const itemShipping = item.albumOrderInfo?.shippingInfo || itemShippingMap[item.id];
      const shippingDto = itemShipping ? toShippingDto(itemShipping) : undefined;

      let orderItem: any;

      if (item.productType === 'album-order' && item.albumOrderInfo) {
        const albumInfo = item.albumOrderInfo;
        orderItem = {
          productId: item.productId || 'default-product',
          productName: item.name,
          size: albumInfo.specificationName || item.options.find(o => o.name === '규격')?.value || 'A4',
          pages: albumInfo.pageCount || parseInt(item.options.find(o => o.name === '페이지수')?.value || '20'),
          printMethod: albumInfo.printMethod === 'indigo' ? '인디고앨범' : '잉크젯',
          paper: albumInfo.paperName || item.options.find(o => o.name === '용지')?.value || '스노우화이트',
          bindingType: albumInfo.bindingName || item.options.find(o => o.name === '제본')?.value || '',
          coverMaterial: albumInfo.coverMaterial || undefined,
          quantity: item.quantity,
          unitPrice: item.basePrice,
          thumbnailUrl: safeUrl(item.thumbnailUrl) || safeUrl(item.thumbnailUrls?.[0]),
          totalFileSize: albumInfo.totalSize || 0,
          pageLayout: albumInfo.pageLayout,
          bindingDirection: albumInfo.bindingDirection,
          fabricName: albumInfo.fabricName || undefined,
          fabricSnapshot: albumInfo.fabricId ? {
            id: albumInfo.fabricId,
            name: albumInfo.fabricName,
            colorCode: albumInfo.fabricColorCode,
            colorName: albumInfo.fabricColorName,
            category: albumInfo.fabricCategory,
            basePrice: albumInfo.fabricBasePrice,
            thumbnailUrl: safeUrl(albumInfo.fabricThumbnail),
          } : undefined,
          foilName: albumInfo.foilName || undefined,
          foilColor: albumInfo.foilColor || undefined,
          foilPosition: albumInfo.foilPosition || undefined,
          folderName: albumInfo.folderName,
          files: (item.serverFiles || []).map((sf, idx) => ({
            fileName: sf.fileName || sf.tempFileId?.split('/').pop() || `page_${idx + 1}.jpg`,
            fileUrl: sf.fileUrl,
            thumbnailUrl: sf.thumbnailUrl,
            pageRange: `${idx + 1}p`,
            pageStart: idx + 1,
            pageEnd: idx + 1,
            width: sf.widthPx || 0,
            height: sf.heightPx || 0,
            widthInch: sf.widthInch || 0,
            heightInch: sf.heightInch || 0,
            dpi: sf.dpi || 0,
            fileSize: sf.fileSize || 0,
            sortOrder: sf.sortOrder ?? idx,
          })),
          ...(shippingDto ? { shipping: shippingDto } : {}),
        };
      } else {
        orderItem = {
          productId: item.productId || 'default-product',
          productName: item.name,
          size: item.options.find(o => o.name === '규격')?.value || 'A4',
          pages: parseInt(item.options.find(o => o.name === '페이지')?.value || '20'),
          printMethod: item.options.find(o => o.name === '인쇄방식')?.value || '디지털인쇄',
          paper: item.options.find(o => o.name === '용지')?.value || '스노우화이트',
          bindingType: item.options.find(o => o.name === '제본')?.value || '',
          quantity: item.quantity,
          unitPrice: item.basePrice,
          thumbnailUrl: safeUrl(item.thumbnailUrl) || safeUrl(item.thumbnailUrls?.[0]),
          totalFileSize: 0,
          ...(shippingDto ? { shipping: shippingDto } : {}),
        };
      }

      // order-level shipping - 발송인/수령인/배송방법 정보 모두 포함
      const orderLevelShipping = itemShipping ? {
        senderType: itemShipping.senderType,
        senderName: itemShipping.senderName,
        senderPhone: itemShipping.senderPhone,
        senderPostalCode: itemShipping.senderPostalCode,
        senderAddress: itemShipping.senderAddress,
        senderAddressDetail: itemShipping.senderAddressDetail,
        receiverType: itemShipping.receiverType,
        recipientName: itemShipping.recipientName,
        phone: itemShipping.recipientPhone,
        postalCode: itemShipping.recipientPostalCode,
        address: itemShipping.recipientAddress,
        addressDetail: itemShipping.recipientAddressDetail,
        deliveryMethod: itemShipping.deliveryMethod,
        deliveryFee: itemShipping.deliveryFee || 0,
        deliveryFeeType: itemShipping.deliveryFeeType,
        fareType: itemShipping.fareType,
        deliveryMemo: itemShipping.deliveryMemo,
      } : {
        recipientName: shippingClientInfo?.clientName || user?.name || '',
        phone: shippingClientInfo?.phone || '',
        postalCode: shippingClientInfo?.postalCode || '',
        address: shippingClientInfo?.address || '',
        addressDetail: shippingClientInfo?.addressDetail || '',
      };

      return {
        clientId,
        paymentMethod,
        isUrgent: false,
        isDuplicateOverride: item.isDuplicateOverride || false,
        customerMemo: memo || undefined,
        productMemo: item.orderMemo || undefined,
        shippingFee: itemShipping?.fareType === 'cod' ? 0 : (itemShipping?.deliveryFee || 0),
        adjustmentAmount: 0,
        items: [orderItem],
        shipping: orderLevelShipping,
      };
    });

    // 배송비 조정: 장바구니와 동일한 로직 적용
    // - 고객직배송(direct_customer): 항상 개별 청구
    // - 스튜디오배송(orderer): 무료 조건 충족 시 0원, 미달 시 배송방법별 1회만 청구
    {
      const chargedStudioMethods = new Set<string>();
      let creditApplied = false;
      for (const od of orderDataList) {
        const receiverType = od.items?.[0]?.shipping?.receiverType;
        const deliveryMethod = od.items?.[0]?.shipping?.deliveryMethod;
        const fareType = od.items?.[0]?.shipping?.fareType;

        // 착불(cod)은 수령인이 직접 지불 → 주문 배송비 0원
        if (fareType === 'cod') {
          od.shippingFee = 0;
          continue;
        }

        if (receiverType === 'direct_customer') {
          // 고객직배송: 배송비 그대로 유지
        } else if (receiverType === 'orderer') {
          if (isStudioFree) {
            // 스튜디오 무료배송: 배송비 0원
            od.shippingFee = 0;
            if (od.items?.[0]?.shipping) {
              od.items[0].shipping.deliveryFee = 0;
            }
            // 이전 주문 배송비 환급 (임계값 달성 시에만)
            if (combinedShipping?.shouldRefundPrevious && !creditApplied && combinedShipping.totalShippingCharged > 0) {
              od.adjustmentAmount = combinedShipping.totalShippingCharged;
              creditApplied = true;
            }
          } else if (deliveryMethod && chargedStudioMethods.has(deliveryMethod)) {
            // 동일 배송방법 중복: 2번째부터 0원
            od.shippingFee = 0;
            if (od.items?.[0]?.shipping) {
              od.items[0].shipping.deliveryFee = 0;
            }
          } else if (deliveryMethod) {
            chargedStudioMethods.add(deliveryMethod);
          }
        }
      }
    }

    // 미결 조정금액(pendingAdjustment) 첫 번째 비직배송 주문 DTO에 합산
    // 백엔드 create()에서 DB의 실제 pending 값을 트랜잭션 내 재확인 후 적용 → 여기선 UI 표시용
    if (pendingAdjustmentAmount !== 0) {
      for (const od of orderDataList) {
        const isDirectCustomer = od.items?.[0]?.shipping?.receiverType === 'direct_customer';
        if (!isDirectCustomer) {
          od.adjustmentAmount = (od.adjustmentAmount ?? 0) + pendingAdjustmentAmount;
          break;
        }
      }
    }

    // 동판 정보 변경사항 확인
    const cpChanges = detectCopperPlateChanges();

    if (cpChanges.length > 0) {
      setCopperPlateChanges(cpChanges);
      setPendingOrderData(orderDataList);
      setUpdateCopperPlateInfo(true);
      setShowChangeConfirmModal(true);
      return;
    }

    // 변경사항이 없으면 바로 주문 진행
    setIsSubmitting(true);
    try {
      await executeOrder(orderDataList, false, []);
    } finally {
      setIsSubmitting(false);
    }
  };

  const paymentMethods = [
    { id: 'postpaid', label: '후불결제', icon: Wallet, description: '월말 정산' },
    { id: 'card', label: '카드결제', icon: CreditCard, description: '신용/체크카드' },
    { id: 'transfer', label: '무통장입금', icon: Building2, description: '계좌이체' },
    { id: 'mobile', label: '간편결제', icon: Smartphone, description: '카카오페이, 네이버페이' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/cart">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">주문/결제</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Order Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items with Per-Item Shipping */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>주문 상품 ({items.length}개)</span>
                    {!allShippingComplete && (
                      <span className="text-xs font-normal text-orange-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        배송정보 미완료
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, idx) => {
                    const hasAlbumShipping = !!item.albumOrderInfo?.shippingInfo;
                    const currentShipping = itemShippingMap[item.id];
                    const shippingComplete = hasAlbumShipping || isShippingComplete(currentShipping);

                    // 이전 항목에 완료된 배송이 있는지
                    let hasPrevShipping = false;
                    if (!hasAlbumShipping) {
                      for (let i = idx - 1; i >= 0; i--) {
                        if (isShippingComplete(itemShippingMap[items[i].id])) {
                          hasPrevShipping = true;
                          break;
                        }
                      }
                    }

                    return (
                      <div key={item.id} className="pb-4 border-b last:border-0 last:pb-0">
                        {/* 상품 정보 */}
                        <div className="flex gap-4">
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                📦
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.name}</p>
                            {item.options.length > 0 && (
                              <p className="text-sm text-gray-500 mt-1">
                                {item.options.map(o => o.value).join(' / ')}
                              </p>
                            )}
                            {/* 원단/동판 정보 표시 */}
                            {(item.albumOrderInfo?.fabricName || item.albumOrderInfo?.foilName || item.copperPlateInfo) && (
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                                {item.albumOrderInfo?.fabricName && (
                                  <span>원단: <span className="text-gray-700">{item.albumOrderInfo.fabricName}</span></span>
                                )}
                                {(item.albumOrderInfo?.foilName || item.copperPlateInfo?.plateName) && (
                                  <span>동판: <span className="text-gray-700">{item.albumOrderInfo?.foilName || item.copperPlateInfo?.plateName}</span></span>
                                )}
                                {(item.albumOrderInfo?.foilColor || item.copperPlateInfo?.selectedFoilColorName) && (
                                  <span>박색상: <span className="text-gray-700">{item.albumOrderInfo?.foilColor || item.copperPlateInfo?.selectedFoilColorName}</span></span>
                                )}
                                {(item.albumOrderInfo?.foilPosition || item.copperPlateInfo?.selectedFoilPositionName) && (
                                  <span>박위치: <span className="text-gray-700">{item.albumOrderInfo?.foilPosition || item.copperPlateInfo?.selectedFoilPositionName}</span></span>
                                )}
                              </div>
                            )}
                            {item.orderMemo && (
                              <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 mt-1 inline-block">
                                메모: {item.orderMemo}
                              </p>
                            )}
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-sm text-gray-500">
                                수량: {item.quantity}개
                                {item.productType === 'album-order' && (
                                  <>
                                    {' / '}
                                    {item.serverFiles && item.serverFiles.length > 0 ? (
                                      <span className="text-green-600">파일: {item.serverFiles.length}장</span>
                                    ) : (
                                      <span className="text-red-500">파일: 0장</span>
                                    )}
                                  </>
                                )}
                              </span>
                              <span className="font-bold">{item.totalPrice.toLocaleString()}원</span>
                            </div>
                          </div>
                        </div>

                        {/* 건별 배송 섹션 */}
                        {hasAlbumShipping ? (
                          // 앨범 주문: 업로드 시 설정한 배송 읽기 전용 요약
                          <div className="mt-3 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 rounded-md px-3 py-2">
                            <Truck className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="flex-1">
                              {getCartShippingSummary(item.albumOrderInfo!.shippingInfo!)}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          </div>
                        ) : (
                          // 편집 가능한 배송 Accordion
                          <div className="mt-3 border rounded-lg">
                            <Accordion type="single" collapsible>
                              <AccordionItem value={item.id} className="border-0">
                                <AccordionTrigger className="px-3 py-2 hover:bg-gray-50/50 hover:no-underline">
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className={cn(
                                      'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                                      shippingComplete ? 'bg-green-100' : 'bg-orange-100'
                                    )}>
                                      {shippingComplete ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                      ) : (
                                        <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                                      )}
                                    </div>
                                    {shippingComplete && currentShipping ? (
                                      <span className="text-sm text-gray-700 text-left">
                                        {getCartShippingSummary(currentShipping)}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-orange-600 font-medium">
                                        배송정보 설정
                                      </span>
                                    )}
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3 pb-3 pt-0">
                                  <div className="p-3 bg-gray-50 rounded-lg space-y-3">
                                    <FolderShippingSection
                                      shippingInfo={currentShipping as unknown as FolderShippingInfo | undefined}
                                      companyInfo={companyInfo}
                                      clientInfo={shippingClientInfo}
                                      pricingMap={pricingMap}
                                      onChange={(shipping) => handleItemShippingChange(item.id, shipping)}
                                      studioTotal={item.totalPrice}
                                    />

                                    {/* 편의 버튼 */}
                                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                                      {hasPrevShipping && !shippingComplete && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          type="button"
                                          className="flex-1 text-xs"
                                          onClick={() => handleCopyFromPrevious(item.id)}
                                        >
                                          <Copy className="h-3.5 w-3.5 mr-1" />
                                          이전 항목에서 복사
                                        </Button>
                                      )}
                                      {items.length > 1 && shippingComplete && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          type="button"
                                          className="flex-1 text-xs"
                                          onClick={() => handleApplyShippingToAll(item.id)}
                                        >
                                          <Copy className="h-3.5 w-3.5 mr-1" />
                                          모든 항목에 적용
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>결제 방법</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="grid md:grid-cols-2 gap-3"
                  >
                    {paymentMethods.map((method) => (
                      <Label
                        key={method.id}
                        className={cn(
                          "flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors",
                          paymentMethod === method.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <RadioGroupItem value={method.id} />
                        <method.icon className="h-5 w-5 text-gray-500" />
                        <div className="flex-1">
                          <p className="font-medium">{method.label}</p>
                          <p className="text-sm text-gray-500">{method.description}</p>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>

                  {paymentMethod === 'transfer' && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium mb-2">입금계좌 안내</p>
                      <p className="text-sm text-gray-600">
                        국민은행 123-456-789012<br />
                        예금주: (주)프린팅솔루션즈
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Memo */}
              <Card>
                <CardHeader>
                  <CardTitle>요청사항</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="배송 및 제작에 대한 요청사항을 입력해주세요."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>결제 금액</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 합배송 무료배송 배너 (스튜디오배송 대상만) */}
                  {combinedShipping?.isStudioFree && studioItemsTotal > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-green-700">묶음배송 무료배송 적용</p>
                        <p className="text-green-600 text-xs mt-0.5">
                          당일 누적 {combinedShipping.combinedTotal.toLocaleString()}원
                          (기준 {combinedShipping.freeThreshold.toLocaleString()}원 이상)
                          {combinedShipping.shouldRefundPrevious && combinedShipping.totalShippingCharged > 0
                            ? ` — 이전 배송비 ${combinedShipping.totalShippingCharged.toLocaleString()}원 차감`
                            : ' — 스튜디오배송 무료'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">상품금액</span>
                      <span>{subtotal.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">배송비</span>
                      <span className={cn(effectiveShippingFee === 0 && 'text-green-600')}>
                        {effectiveShippingFee > 0 ? `${effectiveShippingFee.toLocaleString()}원` : '무료'}
                      </span>
                    </div>
                    {combinedShippingAdjustment < 0 && (
                      <div className="flex justify-between text-green-600">
                        <span className="text-gray-500">묶음배송 환급</span>
                        <span>-{Math.abs(combinedShippingAdjustment).toLocaleString()}원</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>총 결제금액</span>
                      <span className="text-primary">{total.toLocaleString()}원</span>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="border-t pt-4">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <Checkbox
                        checked={agreeTerms}
                        onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        주문 내용을 확인하였으며,{' '}
                        <Link href="/terms" className="text-primary hover:underline">
                          이용약관
                        </Link>
                        에 동의합니다.
                      </span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || !agreeTerms || !allShippingComplete}
                  >
                    {isSubmitting ? '처리중...' : `${total.toLocaleString()}원 결제하기`}
                  </Button>

                  {!agreeTerms && (
                    <p className="text-xs text-orange-500 text-center flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      약관에 동의해주세요
                    </p>
                  )}
                  {agreeTerms && !allShippingComplete && (
                    <p className="text-xs text-orange-500 text-center flex items-center justify-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      모든 항목의 배송정보를 설정해주세요
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>

      {/* 동판 정보 변경 확인 모달 */}
      <Dialog open={showChangeConfirmModal} onOpenChange={setShowChangeConfirmModal}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              동판 정보가 변경되었습니다
            </DialogTitle>
            <DialogDescription>
              입력하신 동판(박 각인) 정보가 기존 저장된 정보와 다릅니다.
              정보를 업데이트하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {copperPlateChanges.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">동판(박 각인) 정보 변경</h4>
                <div className="bg-amber-50 rounded-lg p-4 space-y-3">
                  {copperPlateChanges.map((cpChange, cpIndex) => (
                    <div key={cpIndex} className="text-sm">
                      <div className="font-medium text-amber-800 mb-1">
                        [{cpChange.plateName}] - {cpChange.itemName}
                      </div>
                      {cpChange.changes.map((change, index) => (
                        <div key={index} className="ml-2">
                          <span className="font-medium">{change.label}:</span>
                          <div className="ml-4 text-gray-600">
                            <span className="line-through text-red-500">{change.oldValue}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-600 font-medium">{change.newValue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="copperPlateUpdateOption"
                      checked={updateCopperPlateInfo}
                      onChange={() => setUpdateCopperPlateInfo(true)}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="text-sm">
                      <p className="font-medium">동판 정보 업데이트</p>
                      <p className="text-xs text-gray-500">변경된 박색상/박위치를 동판에 저장합니다</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="copperPlateUpdateOption"
                      checked={!updateCopperPlateInfo}
                      onChange={() => setUpdateCopperPlateInfo(false)}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="text-sm">
                      <p className="font-medium">이번 주문만 적용</p>
                      <p className="text-xs text-gray-500">동판 정보는 변경하지 않습니다</p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelModal}>
              취소
            </Button>
            <Button onClick={handleConfirmOrder} disabled={isSubmitting}>
              {isSubmitting ? '처리중...' : '주문 진행'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 주문 처리 중 로딩 오버레이 */}
      {isSubmitting && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <CreditCard className="absolute inset-0 m-auto h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              주문을 접수하고 있습니다
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              서버로 주문 데이터를 전송 중입니다.<br />
              페이지를 닫지 마시고 잠시만 기다려 주세요.
            </p>
            <div className="mt-4 flex justify-center gap-1">
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
