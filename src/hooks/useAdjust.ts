/**
 * Adjust attribution SDK hook. Initializes the SDK with environment-aware
 * config, tracks typed events (session, game, ad impression), and listens for
 * attribution changes. Debug logging enabled in sandbox mode.
 *
 * Update the import paths below to match your project structure.
 */
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import {
  ADJUST_APP_TOKEN_ANDROID,
  ADJUST_APP_TOKEN_IOS,
  ADJUST_ENVIRONMENT,
  ADJUST_LOG_LEVEL,
  ADJUST_EVENT_TOKENS,
  AdjustEventType,
} from '@/lib/adjust/adjustConfig';

const isDebugMode = ADJUST_ENVIRONMENT === 'sandbox';
const debugLog = (...args: unknown[]) => {
  if (isDebugMode) {
    console.log(...args);
  }
};
const debugWarn = (...args: unknown[]) => {
  if (isDebugMode) {
    console.warn(...args);
  }
};
const debugError = (...args: unknown[]) => {
  if (isDebugMode) {
    console.error(...args);
  }
};

interface AdjustPluginInterface {
  initialize(options: {
    appToken: string;
    environment: 'sandbox' | 'production';
    logLevel: string;
    attConsentWaitingInterval?: number;
  }): Promise<{ initialized: boolean }>;
  
  trackEvent(options: {
    eventToken: string;
    callbackParameters?: Record<string, string>;
    partnerParameters?: Record<string, string>;
    revenue?: number;
    currency?: string;
  }): Promise<void>;
  
  trackAdRevenue(options: {
    source?: string;
    revenue: number;
    currency?: string;
    adImpressionsCount?: number;
    adRevenueNetwork?: string;
    adRevenueUnit?: string;
    adRevenuePlacement?: string;
  }): Promise<void>;
  
  isEnabled(): Promise<{ enabled: boolean }>;
  setEnabled(options: { enabled: boolean }): Promise<void>;
  gdprForgetMe(): Promise<void>;
  
  addListener(
    eventName: 'attributionChanged',
    listenerFunc: (attribution: AdjustAttribution) => void
  ): Promise<{ remove: () => void }>;
}

export interface AdjustAttribution {
  trackerToken?: string;
  trackerName?: string;
  network?: string;
  campaign?: string;
  adgroup?: string;
  creative?: string;
  clickLabel?: string;
}

const AdjustPlugin = registerPlugin<AdjustPluginInterface>('AdjustPlugin');

export interface UseAdjustReturn {
  isInitialized: boolean;
  attribution: AdjustAttribution | null;
  trackEvent: (eventType: AdjustEventType, params?: {
    callbackParameters?: Record<string, string>;
    revenue?: number;
    currency?: string;
  }) => Promise<void>;
  trackAdRevenue: (revenue: number, options?: {
    source?: string;
    currency?: string;
    adRevenueNetwork?: string;
    adRevenueUnit?: string;
    adRevenuePlacement?: string;
  }) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  gdprForgetMe: () => Promise<void>;
}

export function useAdjust(): UseAdjustReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [attribution, setAttribution] = useState<AdjustAttribution | null>(null);
  const initializingRef = useRef(false);

  useEffect(() => {
    const initAdjust = async () => {
      if (!Capacitor.isNativePlatform()) {
        debugLog('[Adjust] Skipping initialization - not on native platform');
        return;
      }

      if (initializingRef.current || isInitialized) return;
      initializingRef.current = true;

      try {
        await AdjustPlugin.addListener('attributionChanged', (attr) => {
          debugLog('[Adjust] Attribution changed');
          setAttribution(attr);
        });

        const isIOS = Capacitor.getPlatform() === 'ios';
        const appToken = isIOS ? ADJUST_APP_TOKEN_IOS : ADJUST_APP_TOKEN_ANDROID;

        await AdjustPlugin.initialize({
          appToken,
          environment: ADJUST_ENVIRONMENT,
          logLevel: ADJUST_LOG_LEVEL,
          ...(isIOS && { attConsentWaitingInterval: 120 }),
        });
        
        setIsInitialized(true);
        debugLog('[Adjust] Initialized successfully');
        
        await AdjustPlugin.trackEvent({ eventToken: typeof ADJUST_EVENT_TOKENS.sessionStart === 'string' ? ADJUST_EVENT_TOKENS.sessionStart : (isIOS ? ADJUST_EVENT_TOKENS.sessionStart.ios : ADJUST_EVENT_TOKENS.sessionStart.android) });
        debugLog('[Adjust] Session start tracked');
      } catch (error) {
        debugError('[Adjust] Initialization error:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    initAdjust();
  }, [isInitialized]);

  const trackEvent = useCallback(async (
    eventType: AdjustEventType,
    params?: {
      callbackParameters?: Record<string, string>;
      revenue?: number;
      currency?: string;
    }
  ) => {
    if (!Capacitor.isNativePlatform() || !isInitialized) {
      debugLog('[Adjust] Skipping event tracking - not initialized or not native');
      return;
    }

    const tokenEntry = ADJUST_EVENT_TOKENS[eventType];
    if (!tokenEntry) {
      debugWarn(`[Adjust] Event token not configured for: ${eventType}`);
      return;
    }

    const eventToken = typeof tokenEntry === 'string'
      ? tokenEntry
      : Capacitor.getPlatform() === 'ios' ? tokenEntry.ios : tokenEntry.android;

    try {
      await AdjustPlugin.trackEvent({
        eventToken,
        callbackParameters: params?.callbackParameters,
        revenue: params?.revenue,
        currency: params?.currency,
      });
      debugLog(`[Adjust] Event tracked: ${eventType}`);
    } catch (error) {
      debugError(`[Adjust] Failed to track event:`, error);
    }
  }, [isInitialized]);

  const trackAdRevenue = useCallback(async (
    revenue: number,
    options?: {
      source?: string;
      currency?: string;
      adRevenueNetwork?: string;
      adRevenueUnit?: string;
      adRevenuePlacement?: string;
    }
  ) => {
    if (!Capacitor.isNativePlatform() || !isInitialized) {
      debugLog('[Adjust] Skipping ad revenue tracking - not initialized or not native');
      return;
    }

    try {
      await AdjustPlugin.trackAdRevenue({
        source: options?.source ?? 'admob_sdk',
        revenue,
        currency: options?.currency ?? 'USD',
        adRevenueNetwork: options?.adRevenueNetwork,
        adRevenueUnit: options?.adRevenueUnit,
        adRevenuePlacement: options?.adRevenuePlacement,
      });
      debugLog('[Adjust] Ad revenue tracked');
    } catch (error) {
      debugError('[Adjust] Failed to track ad revenue:', error);
    }
  }, [isInitialized]);

  const setEnabled = useCallback(async (enabled: boolean) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await AdjustPlugin.setEnabled({ enabled });
      debugLog(`[Adjust] Tracking ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      debugError('[Adjust] Failed to set enabled state:', error);
    }
  }, []);

  const gdprForgetMe = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await AdjustPlugin.gdprForgetMe();
      debugLog('[Adjust] GDPR forget me request sent');
    } catch (error) {
      debugError('[Adjust] Failed to send GDPR forget me:', error);
    }
  }, []);

  return {
    isInitialized,
    attribution,
    trackEvent,
    trackAdRevenue,
    setEnabled,
    gdprForgetMe,
  };
}
