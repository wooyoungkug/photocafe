import { Loader2 } from 'lucide-react';

export default function ShopLoading() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">로딩 중...</p>
    </div>
  );
}
