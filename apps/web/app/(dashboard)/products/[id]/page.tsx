'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useProduct, useUpdateProduct, useDeleteProduct } from '@/hooks/use-products';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';
import { SpecificationList } from '@/components/forms/specification-list';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { company } = useAuthStore();
  
  const { data: product, isLoading } = useProduct(productId);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    sku: '',
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'specifications'>('info');

  // Update form data when product loads
  if (product && formData.name !== product.name) {
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price?.toString() || '',
      cost: product.cost?.toString() || '',
      sku: product.sku || '',
    });
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await updateProduct.mutateAsync({
        productId,
        data: {
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price) || 0,
          cost: parseFloat(formData.cost) || 0,
          sku: formData.sku,
        },
      });
    } catch (error) {
      console.error('제품 업데이트 실패:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(productId);
      router.push('/dashboard/products');
    } catch (error) {
      console.error('제품 삭제 실패:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>로딩 중...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>제품을 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateProduct.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateProduct.isPending ? '저장 중...' : '저장'}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            삭제
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            제품 정보
          </button>
          <button
            onClick={() => setActiveTab('specifications')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'specifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            규격
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'info' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">기본 정보</h3>

            <div className="space-y-2">
              <Label htmlFor="name">제품명</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="제품명을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="SKU를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="제품 설명을 입력하세요"
                rows={4}
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">가격 정보</h3>

            <div className="space-y-2">
              <Label htmlFor="price">판매가 (₩)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleChange}
                placeholder="판매가를 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">원가 (₩)</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                value={formData.cost}
                onChange={handleChange}
                placeholder="원가를 입력하세요"
              />
            </div>

            {formData.price && formData.cost && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <span className="text-gray-600">마진율: </span>
                  <span className="font-semibold text-gray-900">
                    {(
                      ((parseFloat(formData.price) - parseFloat(formData.cost)) /
                        parseFloat(formData.price)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'specifications' && (
        <Card className="p-6">
          <SpecificationList productId={productId} />
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{product.name}" 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수
              없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProduct.isPending}
            >
              {deleteProduct.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
