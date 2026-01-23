"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-4 sm:mb-6 lg:mb-8">
      {/* 브레드크럼 - 태블릿 이상에서만 표시 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2 sm:mb-3 hidden sm:block">
          <ol className="flex items-center space-x-1 text-xs sm:text-sm overflow-x-auto">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center whitespace-nowrap">
                {index > 0 && (
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-1 text-gray-400 flex-shrink-0" />
                )}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-900 font-medium">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* 타이틀 + 액션 */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-0.5 sm:space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 truncate">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
