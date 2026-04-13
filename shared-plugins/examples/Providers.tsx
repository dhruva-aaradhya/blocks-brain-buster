/**
 * Example: Provider composition showing the recommended nesting order.
 *
 * Key point: AdjustProvider must wrap AdProvider because:
 *   - AdContext uses useAdjustContext() for ad impression tracking
 *   - MAX native plugins call Adjust.trackAdRevenue() directly (no provider needed
 *     for that, but the JS-layer impression events do need the context)
 *
 * Adapt this to your app -- you likely don't need all of these providers.
 * The essential nesting for MAX + Adjust is:
 *
 *   <AdjustProvider>
 *     <AdProvider>
 *       {children}
 *     </AdProvider>
 *   </AdjustProvider>
 *
 * Update the import paths to match your project structure.
 */
'use client';

import { ReactNode } from 'react';
import { AdProvider } from '@/contexts/AdContext';
import { AdjustProvider } from '@/contexts/AdjustContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AdjustProvider>
      <AdProvider>
        {children}
      </AdProvider>
    </AdjustProvider>
  );
}
