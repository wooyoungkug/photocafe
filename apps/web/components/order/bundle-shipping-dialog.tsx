'use client';

import { useState, useEffect } from 'react';
import { Link2, Unlink2, Loader2, Truck, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  useDetectBundles,
  useCreateBundle,
  useDeleteBundle,
  useUpdateBundleTracking,
  type BundleCandidate,
  type ShippingBundle,
} from '@/hooks/use-shipping-mgmt';
import { useCourierList } from '@/hooks/use-delivery-tracking';
import { toast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BundleShippingDialog({ open, onOpenChange }: Props) {
  const [candidates, setCandidates] = useState<BundleCandidate[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Record<string, Set<string>>>({});
  const [createdBundles, setCreatedBundles] = useState<ShippingBundle[]>([]);

  // 묶음별 송장 입력
  const [bundleTracking, setBundleTracking] = useState<
    Record<string, { courierCode: string; trackingNumber: string }>
  >({});

  const { data: couriers = [] } = useCourierList();
  const detectBundles = useDetectBundles();
  const createBundle = useCreateBundle();
  const deleteBundle = useDeleteBundle();
  const updateBundleTracking = useUpdateBundleTracking();

  // 다이얼로그 열릴 때 묶음 후보 감지
  useEffect(() => {
    if (open) {
      detectBundles.mutate(undefined, {
        onSuccess: (result) => {
          setCandidates(result.candidates ?? []);
          setSelectedOrders({});
          setCreatedBundles([]);
          setBundleTracking({});
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '묶음 후보 감지에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 체크박스 토글
  const toggleOrderSelection = (groupKey: string, orderId: string) => {
    setSelectedOrders((prev) => {
      const group = new Set(prev[groupKey] ?? []);
      if (group.has(orderId)) {
        group.delete(orderId);
      } else {
        group.add(orderId);
      }
      return { ...prev, [groupKey]: group };
    });
  };

  // 그룹 전체 선택/해제
  const toggleGroupAll = (groupKey: string, orderIds: string[]) => {
    setSelectedOrders((prev) => {
      const group = prev[groupKey] ?? new Set<string>();
      const allSelected = orderIds.every((id) => group.has(id));
      if (allSelected) {
        return { ...prev, [groupKey]: new Set<string>() };
      } else {
        return { ...prev, [groupKey]: new Set(orderIds) };
      }
    });
  };

  // 묶음 생성
  const handleCreateBundle = (groupKey: string) => {
    const orderIds = Array.from(selectedOrders[groupKey] ?? []);
    if (orderIds.length < 2) {
      toast({ title: '묶음배송은 2건 이상 선택해야 합니다.', variant: 'destructive' });
      return;
    }

    createBundle.mutate(
      { orderIds },
      {
        onSuccess: (bundle) => {
          setCreatedBundles((prev) => [...prev, bundle]);
          // 생성된 주문들을 후보에서 제거
          setCandidates((prev) =>
            prev.map((c) => {
              const key = `${c.recipientName}-${c.address}`;
              if (key === groupKey) {
                return {
                  ...c,
                  orders: c.orders.filter((o) => !orderIds.includes(o.id)),
                };
              }
              return c;
            }).filter((c) => c.orders.length > 0)
          );
          setSelectedOrders((prev) => {
            const next = { ...prev };
            delete next[groupKey];
            return next;
          });
          toast({ title: `${orderIds.length}건이 묶음배송으로 생성되었습니다.` });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '묶음 생성에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      }
    );
  };

  // 묶음 해제
  const handleDeleteBundle = (bundleId: string) => {
    deleteBundle.mutate(bundleId, {
      onSuccess: () => {
        setCreatedBundles((prev) => prev.filter((b) => b.id !== bundleId));
        toast({ title: '묶음배송이 해제되었습니다.' });
        // 후보 재감지
        detectBundles.mutate(undefined, {
          onSuccess: (result) => {
            setCandidates(result.candidates ?? []);
          },
        });
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : '묶음 해제에 실패했습니다.';
        toast({ title: msg, variant: 'destructive' });
      },
    });
  };

  // 묶음 송장 저장
  const handleSaveBundleTracking = (bundleId: string) => {
    const tracking = bundleTracking[bundleId];
    if (!tracking?.courierCode || !tracking?.trackingNumber?.trim()) {
      toast({ title: '택배사와 운송장 번호를 모두 입력해주세요.', variant: 'destructive' });
      return;
    }

    updateBundleTracking.mutate(
      {
        bundleId,
        courierCode: tracking.courierCode,
        trackingNumber: tracking.trackingNumber.trim(),
      },
      {
        onSuccess: () => {
          toast({ title: '묶음 송장이 저장되었습니다.' });
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : '묶음 송장 저장에 실패했습니다.';
          toast({ title: msg, variant: 'destructive' });
        },
      }
    );
  };

  const isLoading = detectBundles.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            묶음배송 관리
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 로딩 중 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              묶음배송 후보를 감지하고 있습니다...
            </div>
          )}

          {/* 후보 없음 */}
          {!isLoading && candidates.length === 0 && createdBundles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>묶음배송 가능한 주문이 없습니다.</p>
              <p className="text-sm mt-1">
                동일 수령인/주소의 배송준비 주문이 2건 이상일 때 묶음이 가능합니다.
              </p>
            </div>
          )}

          {/* 묶음 후보 그룹 */}
          {candidates.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                묶음배송 후보 ({candidates.length}그룹)
              </h3>
              <Accordion type="multiple" className="space-y-2">
                {candidates.map((candidate, idx) => {
                  const groupKey = `${candidate.recipientName}-${candidate.address}`;
                  const orderIds = candidate.orders.map((o) => o.id);
                  const selected = selectedOrders[groupKey] ?? new Set<string>();
                  const allSelected = orderIds.length > 0 && orderIds.every((id) => selected.has(id));

                  return (
                    <AccordionItem
                      key={groupKey}
                      value={groupKey}
                      className="border rounded-lg"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700 shrink-0">
                            {candidate.orders.length}건
                          </Badge>
                          <div>
                            <p className="font-medium text-sm">{candidate.recipientName}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[380px]">
                              {candidate.address}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3">
                          {/* 전체 선택 */}
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => toggleGroupAll(groupKey, orderIds)}
                              />
                              전체 선택
                            </label>
                            <Button
                              size="sm"
                              onClick={() => handleCreateBundle(groupKey)}
                              disabled={selected.size < 2 || createBundle.isPending}
                            >
                              {createBundle.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Link2 className="h-3 w-3 mr-1" />
                              )}
                              묶음 생성 ({selected.size}건)
                            </Button>
                          </div>

                          {/* 주문 목록 */}
                          <div className="space-y-1.5">
                            {candidate.orders.map((order) => (
                              <label
                                key={order.id}
                                className="flex items-center gap-3 p-2.5 rounded-md border hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <Checkbox
                                  checked={selected.has(order.id)}
                                  onCheckedChange={() => toggleOrderSelection(groupKey, order.id)}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {order.orderNumber}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {order.client?.clientName}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {order.items?.map((i) => i.productName).join(', ')}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          )}

          {/* 생성된 묶음 */}
          {createdBundles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                생성된 묶음 ({createdBundles.length}건)
              </h3>
              <div className="space-y-3">
                {createdBundles.map((bundle) => {
                  const tracking = bundleTracking[bundle.id] ?? {
                    courierCode: bundle.courierCode ?? '',
                    trackingNumber: bundle.trackingNumber ?? '',
                  };

                  return (
                    <div
                      key={bundle.id}
                      className="border rounded-lg p-4 space-y-3 bg-green-50/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-sm">
                            {bundle.recipientName}
                          </span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            {bundle.orders.length}건 묶음
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteBundle(bundle.id)}
                          disabled={deleteBundle.isPending}
                        >
                          <Unlink2 className="h-3.5 w-3.5 mr-1" />
                          해제
                        </Button>
                      </div>

                      {/* 포함된 주문 */}
                      <div className="text-xs text-muted-foreground">
                        {bundle.orders.map((o) => o.orderNumber).join(', ')}
                      </div>

                      {/* 묶음 송장 입력 */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">택배사</Label>
                          <Select
                            value={tracking.courierCode}
                            onValueChange={(val) =>
                              setBundleTracking((prev) => ({
                                ...prev,
                                [bundle.id]: { ...tracking, courierCode: val },
                              }))
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="택배사" />
                            </SelectTrigger>
                            <SelectContent>
                              {couriers.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">운송장 번호</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="운송장 번호"
                            value={tracking.trackingNumber}
                            onChange={(e) =>
                              setBundleTracking((prev) => ({
                                ...prev,
                                [bundle.id]: { ...tracking, trackingNumber: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleSaveBundleTracking(bundle.id)}
                          disabled={updateBundleTracking.isPending}
                        >
                          <Truck className="h-3 w-3 mr-1" />
                          저장
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
