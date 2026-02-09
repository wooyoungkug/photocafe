'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CreditCard, Wallet, Building2, Smartphone, Upload, X, AlertTriangle } from 'lucide-react';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShippingInfo {
  recipientName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
}

interface ClientInfo {
  id: string;
  clientName: string;
  phone: string | null;
  mobile: string | null;
  postalCode: string | null;
  address: string | null;
  addressDetail: string | null;
}

interface ShippingChanges {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
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

export default function OrderPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { items, getTotal, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [paymentMethod, setPaymentMethod] = useState('postpaid');
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    recipientName: user?.name || '',
    phone: '',
    postalCode: '',
    address: '',
    addressDetail: '',
  });
  const [memo, setMemo] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 회원정보 변경 감지 관련 상태
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [showChangeConfirmModal, setShowChangeConfirmModal] = useState(false);
  const [shippingChanges, setShippingChanges] = useState<ShippingChanges[]>([]);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [updateMemberInfo, setUpdateMemberInfo] = useState(true);

  // 동판 정보 변경 감지 관련 상태
  const [copperPlateChanges, setCopperPlateChanges] = useState<CopperPlateChanges[]>([]);
  const [updateCopperPlateInfo, setUpdateCopperPlateInfo] = useState(true);

  // 회원정보 로드
  const loadClientInfo = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await api.get<ClientInfo>(`/clients/${user.id}`);
      setClientInfo(response);

      // 회원정보로 배송정보 초기화
      setShippingInfo({
        recipientName: response.clientName || user?.name || '',
        phone: response.mobile || response.phone || '',
        postalCode: response.postalCode || '',
        address: response.address || '',
        addressDetail: response.addressDetail || '',
      });
    } catch (error) {
      console.error('Failed to load client info:', error);
      // 회원정보 로드 실패 시 기본값 유지
    }
  }, [user?.id, user?.name]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadClientInfo();
    }
  }, [isAuthenticated, user?.id, loadClientInfo]);

  // 배송정보 변경사항 비교
  const detectShippingChanges = useCallback((): ShippingChanges[] => {
    if (!clientInfo) return [];

    const changes: ShippingChanges[] = [];

    const savedPhone = clientInfo.mobile || clientInfo.phone || '';
    if (shippingInfo.phone && shippingInfo.phone !== savedPhone) {
      changes.push({
        field: 'phone',
        label: '연락처',
        oldValue: savedPhone || '(없음)',
        newValue: shippingInfo.phone,
      });
    }

    if (shippingInfo.postalCode && shippingInfo.postalCode !== (clientInfo.postalCode || '')) {
      changes.push({
        field: 'postalCode',
        label: '우편번호',
        oldValue: clientInfo.postalCode || '(없음)',
        newValue: shippingInfo.postalCode,
      });
    }

    if (shippingInfo.address && shippingInfo.address !== (clientInfo.address || '')) {
      changes.push({
        field: 'address',
        label: '주소',
        oldValue: clientInfo.address || '(없음)',
        newValue: shippingInfo.address,
      });
    }

    if (shippingInfo.addressDetail && shippingInfo.addressDetail !== (clientInfo.addressDetail || '')) {
      changes.push({
        field: 'addressDetail',
        label: '상세주소',
        oldValue: clientInfo.addressDetail || '(없음)',
        newValue: shippingInfo.addressDetail,
      });
    }

    return changes;
  }, [clientInfo, shippingInfo]);

  // 동판 정보 변경사항 비교
  const detectCopperPlateChanges = useCallback((): CopperPlateChanges[] => {
    const allChanges: CopperPlateChanges[] = [];

    items.forEach(item => {
      if (!item.copperPlateInfo) return;

      const info = item.copperPlateInfo;
      const changes: CopperPlateChangeItem[] = [];

      // 박색상 비교
      if (info.selectedFoilColor && info.selectedFoilColor !== info.originalFoilColor) {
        changes.push({
          field: 'foilColor',
          label: '박색상',
          oldValue: info.originalFoilColorName || info.originalFoilColor || '(없음)',
          newValue: info.selectedFoilColorName || info.selectedFoilColor,
        });
      }

      // 박위치 비교
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

  // 상담 카테고리 조회 (캐싱하여 중복 호출 방지)
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

  // 회원정보 업데이트 및 상담이력 기록
  const updateClientInfoAndLog = async (changes: ShippingChanges[], categoryId: string | null) => {
    if (!clientInfo) return;

    try {
      const updateData: Record<string, string> = {};
      changes.forEach((change) => {
        if (change.field === 'phone') {
          updateData.mobile = change.newValue;
        } else {
          updateData[change.field] = change.newValue;
        }
      });

      await api.put(`/clients/${clientInfo.id}`, updateData);

      if (categoryId) {
        const changeDetails = changes
          .map((c) => `• ${c.label}: ${c.oldValue} → ${c.newValue}`)
          .join('\n');

        await api.post('/consultations', {
          clientId: clientInfo.id,
          categoryId,
          title: '[자동] 주문 시 회원정보 변경',
          content: `고객이 주문 과정에서 배송정보를 변경하고 회원정보 수정에 동의했습니다.\n\n변경 내역:\n${changeDetails}`,
          counselorId: 'SYSTEM',
          counselorName: '시스템',
          status: 'closed',
          priority: 'low',
          internalMemo: '주문 페이지에서 자동 생성된 상담 기록',
        });
      }

      toast({
        title: '회원정보가 업데이트되었습니다',
        description: '변경된 배송정보가 회원정보에 저장되었습니다.',
      });
    } catch (error) {
      console.error('Failed to update client info:', error);
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

      toast({
        title: '동판 정보가 업데이트되었습니다',
        description: '변경된 박색상/박위치가 동판 정보에 저장되었습니다.',
      });
    } catch (error) {
      console.error('Failed to update copper plate info:', error);
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

  // 주문 실행 (모달 확인 후) - 아이템별 개별 주문 생성
  const executeOrder = async (
    orderDataList: any[],
    shouldUpdateMemberInfo: boolean,
    changes: ShippingChanges[],
    shouldUpdateCopperPlate: boolean,
    cpChanges: CopperPlateChanges[]
  ) => {
    try {
      // 각 아이템별 개별 주문 순차 생성
      for (const orderData of orderDataList) {
        await api.post('/orders', orderData);
      }

      // 후처리가 필요한 경우에만 카테고리 1번 조회 후 병렬 실행
      const hasChanges = changes.length > 0 || cpChanges.length > 0;
      if (hasChanges) {
        const categoryId = await getSystemCategoryId();

        const tasks: Promise<void>[] = [];

        // 회원정보 처리
        if (shouldUpdateMemberInfo && changes.length > 0) {
          tasks.push(updateClientInfoAndLog(changes, categoryId));
        } else if (changes.length > 0 && clientInfo) {
          const changeDetails = changes
            .map((c) => `• ${c.label}: ${c.oldValue} → ${c.newValue}`)
            .join('\n');
          tasks.push(logChangesOnly(
            categoryId,
            '[자동] 주문 시 배송정보 변경 (회원정보 미수정)',
            `고객이 주문 과정에서 회원정보와 다른 배송정보로 주문했습니다.\n(회원정보 수정 거부)\n\n배송정보 변경 내역:\n${changeDetails}`,
            '주문 페이지에서 자동 생성된 상담 기록 - 회원정보 수정 거부'
          ));
        }

        // 동판 정보 처리
        if (shouldUpdateCopperPlate && cpChanges.length > 0) {
          tasks.push(updateCopperPlateInfoAndLog(cpChanges, categoryId));
        } else if (cpChanges.length > 0) {
          const changeDetails = cpChanges
            .map(cp => {
              const ch = cp.changes.map(c => `  • ${c.label}: ${c.oldValue} → ${c.newValue}`).join('\n');
              return `[${cp.plateName}] (${cp.itemName})\n${ch}`;
            })
            .join('\n\n');
          tasks.push(logChangesOnly(
            categoryId,
            '[자동] 주문 시 동판 정보 변경 (동판 정보 미수정)',
            `고객이 주문 과정에서 동판(박 각인) 정보와 다른 설정으로 주문했습니다.\n(동판 정보 수정 거부)\n\n변경 내역:\n${changeDetails}`,
            '주문 페이지에서 자동 생성된 상담 기록 - 동판 정보 수정 거부'
          ));
        }

        // 모든 후처리 병렬 실행
        await Promise.all(tasks);
      }

      // 앨범 주문이 있으면 거래처 선호 패턴 자동 갱신 (실패해도 주문 흐름 차단하지 않음)
      const prefClientId = clientInfo?.id || user?.id;
      const albumOrders = items.filter(item => item.productType === 'album-order' && item.albumOrderInfo);
      if (albumOrders.length > 0 && prefClientId) {
        const lastAlbum = albumOrders[albumOrders.length - 1].albumOrderInfo!;
        api.put(`/clients/${prefClientId}/album-preference`, {
          preferredEditStyle: lastAlbum.pageLayout || undefined,
          preferredBinding: lastAlbum.bindingDirection || undefined,
        }).catch(() => {});
      }

      toast({
        title: '주문이 완료되었습니다',
        description: '주문내역은 마이페이지에서 확인하실 수 있습니다.',
      });

      clearCart();
      router.push('/order/complete');
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: '주문 실패',
        description: error instanceof Error ? error.message : '주문 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 모달 확인 버튼 핸들러
  const handleConfirmOrder = async () => {
    setShowChangeConfirmModal(false);
    setIsSubmitting(true);

    try {
      await executeOrder(pendingOrderData, updateMemberInfo, shippingChanges, updateCopperPlateInfo, copperPlateChanges);
    } finally {
      setIsSubmitting(false);
      setPendingOrderData(null);
      setShippingChanges([]);
      setCopperPlateChanges([]);
    }
  };

  // 모달 취소 핸들러
  const handleCancelModal = () => {
    setShowChangeConfirmModal(false);
    setPendingOrderData(null);
    setShippingChanges([]);
    setCopperPlateChanges([]);
    setIsSubmitting(false);
  };

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

  const subtotal = getTotal();
  const shippingFee = subtotal > 50000 ? 0 : 3000;
  const total = subtotal + shippingFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreeTerms) {
      toast({
        title: '약관 동의 필요',
        description: '주문을 진행하려면 약관에 동의해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!shippingInfo.recipientName || !shippingInfo.phone || !shippingInfo.address) {
      toast({
        title: '배송정보 입력 필요',
        description: '배송에 필요한 정보를 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 로그인한 회원의 clientId 사용
    const clientId = clientInfo?.id || user?.id;

    if (!clientId) {
      toast({
        title: '회원 정보 오류',
        description: '회원 정보를 불러올 수 없습니다. 다시 로그인해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 주문 데이터 준비 - 아이템별 개별 주문 생성
    const orderDataList = items.map(item => {
      let orderItem: any;

      // 앨범 주문인 경우 추가 정보 포함
      if (item.productType === 'album-order' && item.albumOrderInfo) {
        const albumInfo = item.albumOrderInfo;
        orderItem = {
          productId: item.productId || 'default-product',
          productName: item.name,
          size: albumInfo.specificationName || item.options.find(o => o.name === '규격')?.value || 'A4',
          pages: albumInfo.pageCount || parseInt(item.options.find(o => o.name === '페이지수')?.value || '20'),
          printMethod: albumInfo.printMethod === 'indigo' ? '인디고' : '잉크젯',
          paper: item.options.find(o => o.name === '용지')?.value || '스노우화이트',
          bindingType: item.options.find(o => o.name === '제본')?.value || '무선제본',
          quantity: item.quantity,
          unitPrice: item.basePrice,
          thumbnailUrl: item.thumbnailUrl || item.thumbnailUrls?.[0] || undefined,
          totalFileSize: albumInfo.totalSize || 0,
          colorMode: albumInfo.colorMode,
          pageLayout: albumInfo.pageLayout,
          bindingDirection: albumInfo.bindingDirection,
          folderName: albumInfo.folderName,
          fileCount: albumInfo.fileCount,
          ...(albumInfo.shippingInfo ? {
            shipping: {
              senderType: albumInfo.shippingInfo.senderType,
              senderName: albumInfo.shippingInfo.senderName,
              senderPhone: albumInfo.shippingInfo.senderPhone,
              senderPostalCode: albumInfo.shippingInfo.senderPostalCode,
              senderAddress: albumInfo.shippingInfo.senderAddress,
              senderAddressDetail: albumInfo.shippingInfo.senderAddressDetail,
              receiverType: albumInfo.shippingInfo.receiverType,
              recipientName: albumInfo.shippingInfo.recipientName,
              phone: albumInfo.shippingInfo.recipientPhone,
              postalCode: albumInfo.shippingInfo.recipientPostalCode,
              address: albumInfo.shippingInfo.recipientAddress,
              addressDetail: albumInfo.shippingInfo.recipientAddressDetail,
              deliveryMethod: albumInfo.shippingInfo.deliveryMethod,
              deliveryFee: albumInfo.shippingInfo.deliveryFee,
              deliveryFeeType: albumInfo.shippingInfo.deliveryFeeType,
            },
          } : {}),
        };
      } else {
        // 일반 상품
        orderItem = {
          productId: item.productId || 'default-product',
          productName: item.name,
          size: item.options.find(o => o.name === '규격')?.value || 'A4',
          pages: parseInt(item.options.find(o => o.name === '페이지')?.value || '20'),
          printMethod: item.options.find(o => o.name === '인쇄방식')?.value || '디지털인쇄',
          paper: item.options.find(o => o.name === '용지')?.value || '스노우화이트',
          bindingType: item.options.find(o => o.name === '제본')?.value || '무선제본',
          quantity: item.quantity,
          unitPrice: item.basePrice,
          thumbnailUrl: item.thumbnailUrl || item.thumbnailUrls?.[0] || undefined,
          totalFileSize: 0,
        };
      }

      // 항목별 배송비가 없는 경우 주문 단위 배송비 적용
      const itemHasShipping = !!orderItem.shipping;
      const orderShippingFee = itemHasShipping ? 0 : shippingFee;

      // 개별 주문 데이터 (1 아이템 = 1 주문)
      return {
        clientId,
        paymentMethod,
        isUrgent: false,
        customerMemo: memo || undefined,
        shippingFee: orderShippingFee,
        items: [orderItem],
        shipping: shippingInfo,
      };
    });

    // 배송정보 변경사항 확인
    const changes = detectShippingChanges();
    // 동판 정보 변경사항 확인
    const cpChanges = detectCopperPlateChanges();

    if (changes.length > 0 || cpChanges.length > 0) {
      // 변경사항이 있으면 확인 모달 표시
      setShippingChanges(changes);
      setCopperPlateChanges(cpChanges);
      setPendingOrderData(orderDataList);
      setUpdateMemberInfo(true);
      setUpdateCopperPlateInfo(true);
      setShowChangeConfirmModal(true);
      return;
    }

    // 변경사항이 없으면 바로 주문 진행
    setIsSubmitting(true);
    try {
      await executeOrder(orderDataList, false, [], false, []);
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
              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>주문 상품 ({items.length}개)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
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
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-gray-500">수량: {item.quantity}개</span>
                          <span className="font-bold">{item.totalPrice.toLocaleString()}원</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Shipping Info */}
              <Card>
                <CardHeader>
                  <CardTitle>배송 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientName">받는분 *</Label>
                      <Input
                        id="recipientName"
                        value={shippingInfo.recipientName}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, recipientName: e.target.value }))}
                        placeholder="이름"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">연락처 *</Label>
                      <PhoneInput
                        id="phone"
                        value={shippingInfo.phone}
                        onChange={(value) => setShippingInfo(prev => ({ ...prev, phone: value }))}
                        placeholder="010-0000-0000"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">우편번호</Label>
                      <div className="flex gap-2">
                        <Input
                          id="postalCode"
                          value={shippingInfo.postalCode}
                          onChange={(e) => setShippingInfo(prev => ({ ...prev, postalCode: e.target.value }))}
                          placeholder="00000"
                        />
                      </div>
                    </div>
                    <div className="md:col-span-3 space-y-2">
                      <Label htmlFor="address">주소 *</Label>
                      <Input
                        id="address"
                        value={shippingInfo.address}
                        onChange={(e) => setShippingInfo(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="기본 주소"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressDetail">상세주소</Label>
                    <Input
                      id="addressDetail"
                      value={shippingInfo.addressDetail}
                      onChange={(e) => setShippingInfo(prev => ({ ...prev, addressDetail: e.target.value }))}
                      placeholder="상세 주소"
                    />
                  </div>
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
                        예금주: (주)포토카페
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

              {/* File Upload */}
              <Card>
                <CardHeader>
                  <CardTitle>파일 업로드</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="font-medium mb-2">인쇄용 파일을 업로드해주세요</p>
                    <p className="text-sm text-gray-500 mb-4">
                      PDF, AI, PSD, JPG 파일 지원 (최대 500MB)
                    </p>
                    <Button variant="outline" type="button">
                      파일 선택
                    </Button>
                  </div>
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
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">상품금액</span>
                      <span>{subtotal.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">배송비</span>
                      <span>{shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : '무료'}</span>
                    </div>
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
                    disabled={isSubmitting || !agreeTerms}
                  >
                    {isSubmitting ? '처리중...' : `${total.toLocaleString()}원 결제하기`}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>

      {/* 정보 변경 확인 모달 */}
      <Dialog open={showChangeConfirmModal} onOpenChange={setShowChangeConfirmModal}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              정보가 변경되었습니다
            </DialogTitle>
            <DialogDescription>
              입력하신 정보가 기존 저장된 정보와 다릅니다.
              정보를 업데이트하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* 배송정보 변경 섹션 */}
            {shippingChanges.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">배송정보 변경</h4>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  {shippingChanges.map((change, index) => (
                    <div key={index} className="text-sm">
                      <span className="font-medium">{change.label}:</span>
                      <div className="ml-4 text-gray-600">
                        <span className="line-through text-red-500">{change.oldValue}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600 font-medium">{change.newValue}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shippingUpdateOption"
                      checked={updateMemberInfo}
                      onChange={() => setUpdateMemberInfo(true)}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="text-sm">
                      <p className="font-medium">회원정보 업데이트</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="shippingUpdateOption"
                      checked={!updateMemberInfo}
                      onChange={() => setUpdateMemberInfo(false)}
                      className="w-4 h-4 text-primary"
                    />
                    <div className="text-sm">
                      <p className="font-medium">이번 주문만 적용</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* 동판 정보 변경 섹션 */}
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
