'use client';

import { useCallback, useState } from 'react';
import { autoPrintLabel } from '@/lib/auto-print';

export type LabelFormat = 'a5' | 'thermal_100x150';

export interface PrinterPreferences {
  labelFormat: LabelFormat;
  autoPrint: boolean;
}

const STORAGE_KEY = 'printer-preferences';

const DEFAULT_PREFS: PrinterPreferences = {
  labelFormat: 'thermal_100x150',
  autoPrint: true,
};

export function getPrinterPreferences(): PrinterPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

export function savePrinterPreferences(
  prefs: Partial<PrinterPreferences>,
): PrinterPreferences {
  const current = getPrinterPreferences();
  const updated = { ...current, ...prefs };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function usePrinter() {
  const [isPrinting, setIsPrinting] = useState(false);
  const [preferences, setPreferences] = useState<PrinterPreferences>(
    getPrinterPreferences,
  );

  const updatePreferences = useCallback(
    (prefs: Partial<PrinterPreferences>) => {
      const updated = savePrinterPreferences(prefs);
      setPreferences(updated);
    },
    [],
  );

  const printLabel = useCallback(
    (orderId: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        setIsPrinting(true);
        autoPrintLabel({
          orderId,
          onPrintStart: () => {},
          onPrintEnd: () => {
            setIsPrinting(false);
            resolve();
          },
          onError: (err) => {
            setIsPrinting(false);
            reject(err);
          },
        });
      });
    },
    [],
  );

  return {
    isPrinting,
    preferences,
    updatePreferences,
    printLabel,
  };
}
