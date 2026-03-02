import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav aria-label="브레드크럼" className="flex items-center gap-1 text-[14px] text-black font-normal mb-4">
      <Link href="/" className="text-gray-500 hover:text-black transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          {item.href && index < items.length - 1 ? (
            <Link href={item.href} className="text-gray-500 hover:text-black transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-black font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
