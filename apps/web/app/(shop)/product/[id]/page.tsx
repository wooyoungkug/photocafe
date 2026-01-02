'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Minus, Plus, ShoppingCart, Heart, Share2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useProduct } from '@/hooks/use-products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useCartStore, type CartItemOption } from '@/stores/cart-store';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Product, ProductSpecification, ProductBinding, ProductPaper, ProductCover, ProductFoil, ProductFinishing } from '@/lib/types';

interface SelectedOptions {
  specification?: ProductSpecification;
  binding?: ProductBinding;
  paper?: ProductPaper;
  cover?: ProductCover;
  foil?: ProductFoil;
  finishings: ProductFinishing[];
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { toast } = useToast();

  const { data: product, isLoading, error } = useProduct(productId);
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({
    finishings: [],
  });

  // Set default options when product loads
  useEffect(() => {
    if (product) {
      setSelectedOptions({
        specification: product.specifications?.find(s => s.isDefault) || product.specifications?.[0],
        binding: product.bindings?.find(b => b.isDefault) || product.bindings?.[0],
        paper: product.papers?.find(p => p.isDefault) || product.papers?.[0],
        cover: product.covers?.find(c => c.isDefault) || product.covers?.[0],
        foil: product.foils?.find(f => f.isDefault) || product.foils?.[0],
        finishings: product.finishings?.filter(f => f.isDefault) || [],
      });
    }
  }, [product]);

  if (isLoading) {
    return <ProductPageSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">상품을 찾을 수 없습니다</h1>
        <p className="text-gray-500 mb-8">요청하신 상품이 존재하지 않거나 삭제되었습니다.</p>
        <Link href="/">
          <Button>홈으로 돌아가기</Button>
        </Link>
      </div>
    );
  }

  const calculatePrice = () => {
    let price = product.basePrice;

    if (selectedOptions.specification) {
      price += selectedOptions.specification.price;
    }
    if (selectedOptions.binding) {
      price += selectedOptions.binding.price;
    }
    if (selectedOptions.paper) {
      price += selectedOptions.paper.price;
    }
    if (selectedOptions.cover) {
      price += selectedOptions.cover.price;
    }
    if (selectedOptions.foil) {
      price += selectedOptions.foil.price;
    }
    for (const finishing of selectedOptions.finishings) {
      price += finishing.price;
    }

    return price * quantity;
  };

  const handleAddToCart = () => {
    const options: CartItemOption[] = [];

    if (selectedOptions.specification) {
      options.push({
        name: '규격',
        value: selectedOptions.specification.name,
        price: selectedOptions.specification.price,
      });
    }
    if (selectedOptions.binding) {
      options.push({
        name: '제본',
        value: selectedOptions.binding.name,
        price: selectedOptions.binding.price,
      });
    }
    if (selectedOptions.paper) {
      options.push({
        name: '용지',
        value: selectedOptions.paper.name,
        price: selectedOptions.paper.price,
      });
    }
    if (selectedOptions.cover) {
      options.push({
        name: '커버',
        value: selectedOptions.cover.name,
        price: selectedOptions.cover.price,
      });
    }
    if (selectedOptions.foil) {
      options.push({
        name: '박',
        value: selectedOptions.foil.name,
        price: selectedOptions.foil.price,
      });
    }
    for (const finishing of selectedOptions.finishings) {
      options.push({
        name: '후가공',
        value: finishing.name,
        price: finishing.price,
      });
    }

    addItem({
      productId: product.id,
      productType: 'product',
      name: product.productName,
      thumbnailUrl: product.thumbnailUrl,
      basePrice: product.basePrice,
      quantity,
      options,
      totalPrice: calculatePrice(),
    });

    toast({
      title: '장바구니에 담았습니다',
      description: `${product.productName} ${quantity}개가 장바구니에 추가되었습니다.`,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart');
  };

  const images = product.thumbnailUrl
    ? [product.thumbnailUrl, ...product.detailImages]
    : product.detailImages.length > 0
    ? product.detailImages
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-primary">홈</Link>
            <ChevronRight className="h-4 w-4" />
            {product.category && (
              <>
                <Link href={`/category/${product.category.id}`} className="hover:text-primary">
                  {product.category.name}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="text-gray-900 font-medium truncate max-w-[200px]">
              {product.productName}
            </span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="aspect-square bg-white rounded-lg border overflow-hidden">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.productName}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
                  📦
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={cn(
                      "w-20 h-20 flex-shrink-0 rounded-lg border-2 overflow-hidden",
                      selectedImage === idx ? "border-primary" : "border-transparent"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.isNew && <Badge className="bg-green-500">NEW</Badge>}
                {product.isBest && <Badge className="bg-red-500">BEST</Badge>}
                <span className="text-sm text-gray-500">{product.productCode}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.productName}</h1>
              {product.description && (
                <p className="text-gray-600">{product.description}</p>
              )}
            </div>

            {/* Price */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {calculatePrice().toLocaleString()}
                </span>
                <span className="text-lg">원</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                기본가 {product.basePrice.toLocaleString()}원 + 옵션가
              </p>
            </div>

            {/* Options */}
            <div className="space-y-6">
              {/* Specification */}
              {product.specifications && product.specifications.length > 0 && (
                <OptionSection title="규격">
                  <RadioGroup
                    value={selectedOptions.specification?.id}
                    onValueChange={(value) => {
                      const spec = product.specifications?.find(s => s.id === value);
                      setSelectedOptions(prev => ({ ...prev, specification: spec }));
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {product.specifications.map((spec) => (
                      <Label
                        key={spec.id}
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedOptions.specification?.id === spec.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <RadioGroupItem value={spec.id} />
                        <span className="flex-1">{spec.name}</span>
                        {spec.price > 0 && (
                          <span className="text-sm text-primary">+{spec.price.toLocaleString()}</span>
                        )}
                      </Label>
                    ))}
                  </RadioGroup>
                </OptionSection>
              )}

              {/* Binding */}
              {product.bindings && product.bindings.length > 0 && (
                <OptionSection title="제본방법">
                  <RadioGroup
                    value={selectedOptions.binding?.id}
                    onValueChange={(value) => {
                      const binding = product.bindings?.find(b => b.id === value);
                      setSelectedOptions(prev => ({ ...prev, binding }));
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {product.bindings.map((binding) => (
                      <Label
                        key={binding.id}
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedOptions.binding?.id === binding.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <RadioGroupItem value={binding.id} />
                        <span className="flex-1">{binding.name}</span>
                        {binding.price > 0 && (
                          <span className="text-sm text-primary">+{binding.price.toLocaleString()}</span>
                        )}
                      </Label>
                    ))}
                  </RadioGroup>
                </OptionSection>
              )}

              {/* Paper */}
              {product.papers && product.papers.length > 0 && (
                <OptionSection title="용지">
                  <RadioGroup
                    value={selectedOptions.paper?.id}
                    onValueChange={(value) => {
                      const paper = product.papers?.find(p => p.id === value);
                      setSelectedOptions(prev => ({ ...prev, paper }));
                    }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {product.papers.map((paper) => (
                      <Label
                        key={paper.id}
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedOptions.paper?.id === paper.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <RadioGroupItem value={paper.id} />
                        <span className="flex-1">
                          {paper.name}
                          {paper.type !== 'normal' && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {paper.type === 'premium' ? '프리미엄' : '수입지'}
                            </Badge>
                          )}
                        </span>
                        {paper.price > 0 && (
                          <span className="text-sm text-primary">+{paper.price.toLocaleString()}</span>
                        )}
                      </Label>
                    ))}
                  </RadioGroup>
                </OptionSection>
              )}

              {/* Finishings */}
              {product.finishings && product.finishings.length > 0 && (
                <OptionSection title="후가공">
                  <div className="grid grid-cols-2 gap-2">
                    {product.finishings.map((finishing) => (
                      <Label
                        key={finishing.id}
                        className={cn(
                          "flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedOptions.finishings.some(f => f.id === finishing.id)
                            ? "border-primary bg-primary/5"
                            : "hover:border-gray-400"
                        )}
                      >
                        <Checkbox
                          checked={selectedOptions.finishings.some(f => f.id === finishing.id)}
                          onCheckedChange={(checked) => {
                            setSelectedOptions(prev => ({
                              ...prev,
                              finishings: checked
                                ? [...prev.finishings, finishing]
                                : prev.finishings.filter(f => f.id !== finishing.id),
                            }));
                          }}
                        />
                        <span className="flex-1">{finishing.name}</span>
                        {finishing.price > 0 && (
                          <span className="text-sm text-primary">+{finishing.price.toLocaleString()}</span>
                        )}
                      </Label>
                    ))}
                  </div>
                </OptionSection>
              )}

              {/* Quantity */}
              <OptionSection title="수량">
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center border-x py-2"
                      min="1"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="p-3 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </OptionSection>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" size="lg" className="flex-1" onClick={handleAddToCart}>
                <ShoppingCart className="h-5 w-5 mr-2" />
                장바구니
              </Button>
              <Button size="lg" className="flex-1" onClick={handleBuyNow}>
                바로 주문
              </Button>
            </div>

            {/* Share & Wishlist */}
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" size="sm" className="text-gray-500">
                <Heart className="h-4 w-4 mr-1" />
                찜하기
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-500">
                <Share2 className="h-4 w-4 mr-1" />
                공유하기
              </Button>
            </div>
          </div>
        </div>

        {/* Product Detail Tabs */}
        <div className="mt-12">
          <Card>
            <CardHeader>
              <CardTitle>상품 상세정보</CardTitle>
            </CardHeader>
            <CardContent>
              {product.description ? (
                <div className="prose max-w-none">
                  {product.description}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  상세 정보가 등록되지 않았습니다.
                </p>
              )}

              {product.detailImages.length > 0 && (
                <div className="mt-8 space-y-4">
                  {product.detailImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${product.productName} 상세 ${idx + 1}`}
                      className="w-full rounded-lg"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OptionSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-medium mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-3">
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-6">
            <div>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-8 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-24 rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 flex-1 rounded-lg" />
              <Skeleton className="h-12 flex-1 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
