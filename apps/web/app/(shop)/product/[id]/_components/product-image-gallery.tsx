'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  images: string[];
  productName: string;
}

export function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="aspect-square bg-white rounded-lg border overflow-hidden shadow-sm">
        {images.length > 0 ? (
          <img
            src={images[selectedImage]}
            alt={productName}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-400">
              <div className="text-5xl mb-2">📦</div>
              <p className="text-sm">No Image</p>
            </div>
          </div>
        )}
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedImage(idx)}
              className={cn(
                'w-16 h-16 md:w-[72px] md:h-[72px] flex-shrink-0 rounded-lg border-2 overflow-hidden transition-all',
                selectedImage === idx
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
