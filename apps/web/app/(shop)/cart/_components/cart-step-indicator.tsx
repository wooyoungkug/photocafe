'use client';

import { Fragment } from 'react';
import { ShoppingCart, FileText, CreditCard, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const STEPS = [
  { key: 'cart', icon: ShoppingCart },
  { key: 'order', icon: FileText },
  { key: 'payment', icon: CreditCard },
  { key: 'complete', icon: CheckCircle },
] as const;

interface CartStepIndicatorProps {
  currentStep?: number;
}

export function CartStepIndicator({ currentStep = 0 }: CartStepIndicatorProps) {
  const t = useTranslations('cart.steps');

  return (
    <div className="hidden sm:flex items-center gap-0">
      {STEPS.map((step, i) => (
        <Fragment key={step.key}>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              i === currentStep
                ? 'bg-primary text-primary-foreground'
                : i < currentStep
                  ? 'text-primary'
                  : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center',
                i === currentStep
                  ? 'bg-white/20'
                  : i < currentStep
                    ? 'bg-primary/10'
                    : 'bg-muted'
              )}
            >
              <step.icon className="w-3 h-3" />
            </div>
            <span>{t(step.key)}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                'w-6 lg:w-10 h-0.5 mx-0.5',
                i < currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}
