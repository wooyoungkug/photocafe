'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center bg-gray-50', className)}>
      <div className="text-center text-gray-400">
        <div className="text-5xl mb-2">📦</div>
        <p className="text-sm">No Image</p>
      </div>
    </div>
  );
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [mainError, setMainError] = useState(false);
  const [thumbErrors, setThumbErrors] = useState<Record<number, boolean>>({});

  const handleThumbError = (idx: number) => {
    setThumbErrors(prev => ({ ...prev, [idx]: true }));
  };

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="aspect-square bg-white rounded-lg border overflow-hidden shadow-sm">
        {images.length > 0 && !mainError ? (
          <img
            src={images[selectedImage]}
            alt={productName}
            className="w-full h-full object-contain"
            onError={() => setMainError(true)}
          />
        ) : (
          <ImagePlaceholder className="w-full h-full" />
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => { setSelectedImage(idx); setMainError(false); }}
              className={cn(
                'w-16 h-16 md:w-[72px] md:h-[72px] flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all',
                selectedImage === idx
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              {thumbErrors[idx] ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300 text-xl">📦</div>
              ) : (
                <img src={img} alt="" className="w-full h-full object-cover" onError={() => handleThumbError(idx)} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
