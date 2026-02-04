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

  // 회원정보 업데이트 및 상담이력 기록
  const updateClientInfoAndLog = async (changes: ShippingChanges[]) => {
    if (!clientInfo) return;

    try {
      // 1. 회원정보 업데이트
      const updateData: Record<string, string> = {};
      changes.forEach((change) => {
        if (change.field === 'phone') {
          updateData.mobile = change.newValue;
        } else {
          updateData[change.field] = change.newValue;
        }
      });

      await api.put(`/clients/${clientInfo.id}`, updateData);

      // 2. 상담이력에 변경 내용 기록
      const changeDetails = changes
        .map((c) => `• ${c.label}: ${c.oldValue} → ${c.newValue}`)
        .join('\n');

      // 상담 분류 조회 (시스템/정보변경 카테고리)
      let categoryId: string | null = null;
      try {
        const categories = await api.get<{ data: { id: string; name: string }[] }>('/consultation-categories');
        const systemCategory = categories.data?.find(
          (cat) => cat.name.includes('시스템') || cat.name.includes('정보변경') || cat.name.includes('기타')
        );
        categoryId = systemCategory?.id || null;
      } catch {
        // 카테고리 조회 실패 시 무시
      }

      // 상담이력 생성 (카테고리가 있는 경우에만)
      if (categoryId) {
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
      // 회원정보 업데이트 실패해도 주문은 진행
    }
  };

  // 주문 실행 (모달 확인 후)
  const executeOrder = async (orderData: any, shouldUpdateMemberInfo: boolean, changes: ShippingChanges[]) => {
    try {
      await api.post('/orders', orderData);

      // 회원정보 업데이트가 선택된 경우
      if (shouldUpdateMemberInfo && changes.length > 0) {
        await updateClientInfoAndLog(changes);
      } else if (changes.length > 0 && clientInfo) {
        // 회원정보 업데이트 거부한 경우에도 상담이력에 기록
        const changeDetails = changes
          .map((c) => `• ${c.label}: ${c.oldValue} → ${c.newValue}`)
          .join('\n');

        try {
          const categories = await api.get<{ data: { id: string; name: string }[] }>('/consultation-categories');
          const systemCategory = categories.data?.find(
            (cat) => cat.name.includes('시스템') || cat.name.includes('정보변경') || cat.name.includes('기타')
          );

          if (systemCategory?.id) {
            await api.post('/consultations', {
              clientId: clientInfo.id,
              categoryId: systemCategory.id,
              title: '[자동] 주문 시 배송정보 변경 (회원정보 미수정)',
              content: `고객이 주문 과정에서 회원정보와 다른 배송정보로 주문했습니다.\n(회원정보 수정 거부)\n\n배송정보 변경 내역:\n${changeDetails}`,
              counselorId: 'SYSTEM',
              counselorName: '시스템',
              status: 'closed',
              priority: 'low',
              internalMemo: '주문 페이지에서 자동 생성된 상담 기록 - 회원정보 수정 거부',
            });
          }
        } catch {
          // 상담이력 기록 실패 시 무시
        }
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
      await executeOrder(pendingOrderData, updateMemberInfo, shippingChanges);
    } finally {
      setIsSubmitting(false);
      setPendingOrderData(null);
      setShippingChanges([]);
    }
  };

  // 모달 취소 핸들러
  const handleCancelModal = () => {
    setShowChangeConfirmModal(false);
    setPendingOrderData(null);
    setShippingChanges([]);
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

    // 주문 데이터 준비
    const orderData = {
      clientId,
      paymentMethod,
      isUrgent: false,
      customerMemo: memo || undefined,
      items: items.map(item => ({
        productId: item.productId || 'default-product',
        productName: item.name,
        size: item.options.find(o => o.name === '규격')?.value || 'A4',
        pages: parseInt(item.options.find(o => o.name === '페이지')?.value || '20'),
        printMethod: item.options.find(o => o.name === '인쇄방식')?.value || '디지털인쇄',
        paper: item.options.find(o => o.name === '용지')?.value || '스노우화이트',
        bindingType: item.options.find(o => o.name === '제본')?.value || '무선제본',
        quantity: item.quantity,
        unitPrice: item.basePrice,
      })),
      shipping: shippingInfo,
    };

    // 배송정보 변경사항 확인
    const changes = detectShippingChanges();

    if (changes.length > 0) {
      // 변경사항이 있으면 확인 모달 표시
      setShippingChanges(changes);
      setPendingOrderData(orderData);
      setUpdateMemberInfo(true);
      setShowChangeConfirmModal(true);
      return;
    }

    // 변경사항이 없으면 바로 주문 진행
    setIsSubmitting(true);
    try {
      await executeOrder(orderData, false, []);
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

      {/* 배송정보 변경 확인 모달 */}
      <Dialog open={showChangeConfirmModal} onOpenChange={setShowChangeConfirmModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              배송정보가 변경되었습니다
            </DialogTitle>
            <DialogDescription>
              입력하신 배송정보가 기존 회원정보와 다릅니다.
              회원정보를 업데이트하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-700">변경 내역:</p>
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

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="updateOption"
                  checked={updateMemberInfo}
                  onChange={() => setUpdateMemberInfo(true)}
                  className="w-4 h-4 text-primary"
                />
                <div>
                  <p className="font-medium">회원정보 업데이트</p>
                  <p className="text-sm text-gray-500">변경된 배송정보를 회원정보에 저장합니다</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="updateOption"
                  checked={!updateMemberInfo}
                  onChange={() => setUpdateMemberInfo(false)}
                  className="w-4 h-4 text-primary"
                />
                <div>
                  <p className="font-medium">이번 주문만 적용</p>
                  <p className="text-sm text-gray-500">회원정보는 변경하지 않고 이번 주문에만 적용합니다</p>
                </div>
              </label>
            </div>
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
    </div>
  );
}
