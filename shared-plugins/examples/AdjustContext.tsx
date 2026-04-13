/**
 * Example: Adjust attribution context provider.
 *
 * Wraps useAdjust() in a React Context with SSR-safe no-op defaults.
 * This pattern ensures components outside the provider (or during SSR)
 * get safe fallback values instead of crashing.
 *
 * Usage:
 *   1. Wrap your app in <AdjustProvider>
 *   2. Use useAdjustContext() in any child component to access Adjust
 *
 * Update the import paths to match your project structure.
 */
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAdjust, UseAdjustReturn, AdjustAttribution } from '@/hooks/useAdjust';
import { AdjustEventType } from '@/lib/adjust/adjustConfig';

interface AdjustContextValue extends UseAdjustReturn {}

const AdjustContext = createContext<AdjustContextValue | null>(null);

interface AdjustProviderProps {
  children: ReactNode;
}

export function AdjustProvider({ children }: AdjustProviderProps) {
  const adjust = useAdjust();

  return (
    <AdjustContext.Provider value={adjust}>
      {children}
    </AdjustContext.Provider>
  );
}

const defaultAdjustContextValue: AdjustContextValue = {
  isInitialized: false,
  attribution: null,
  trackEvent: async () => {},
  trackAdRevenue: async () => {},
  setEnabled: async () => {},
  gdprForgetMe: async () => {},
};

export function useAdjustContext(): AdjustContextValue {
  const context = useContext(AdjustContext);
  return context ?? defaultAdjustContextValue;
}

export type { AdjustAttribution, AdjustEventType };
