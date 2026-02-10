'use client';

import { ImageIcon } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useTranslations } from 'next-intl';

interface CartThumbnailGalleryProps {
  thumbnailUrls: string[];
  pageLayout?: 'single' | 'spread';
}

export function CartThumbnailGallery({ thumbnailUrls, pageLayout }: CartThumbnailGalleryProps) {
  const t = useTranslations('cart');

  if (!thumbnailUrls || thumbnailUrls.length <= 1) return null;

  return (
    <div className="border-t border-gray-100">
      <Accordion type="single" collapsible>
        <AccordionItem value="thumbnails" className="border-0">
          <AccordionTrigger className="px-4 py-2 hover:bg-gray-50/50 hover:no-underline text-xs">
            <span className="flex items-center gap-1.5 text-gray-600">
              <ImageIcon className="h-3.5 w-3.5" />
              {t('thumbnailPreview')} ({thumbnailUrls.length})
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-3 pt-0">
            <div
              className={`grid gap-1.5 p-2 bg-gray-50 rounded-lg border ${
                pageLayout === 'spread' ? 'grid-cols-4' : 'grid-cols-6 sm:grid-cols-8'
              }`}
            >
              {thumbnailUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="relative aspect-[3/4] rounded overflow-hidden border border-gray-200 bg-white"
                >
                  <img
                    src={url}
                    alt={`${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center text-white text-[8px] font-medium">
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
