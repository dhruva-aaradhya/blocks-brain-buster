/**
 * Example: Ad lifecycle context with level gating and analytics tracking.
 *
 * This example shows how to wrap useMaxAds() with business logic:
 *   - Level-gated ad display (banners/interstitials only after a threshold)
 *   - Subscription check (no ads for subscribers)
 *   - Cross-SDK tracking (log ad impressions to Adjust + Firebase)
 *   - Rewarded-to-interstitial fallback tracking
 *
 * This is a REFERENCE IMPLEMENTATION -- adapt it to your app's needs.
 * You may not need level gating, subscriptions, Firebase, etc.
 *
 * Update the import paths to match your project structure.
 */
'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { useMaxAds, UseMaxAdsReturn } from '@/hooks/useMaxAds';
import { useAdjustContext } from '@/contexts/AdjustContext';

interface AdSettings {
  interstitialsEnabled: boolean;
  rewardedEnabled: boolean;
  bannersEnabled: boolean;
}

interface AdContextValue extends UseMaxAdsReturn {
  settings: AdSettings;
  setInterstitialsEnabled: (enabled: boolean) => void;
  setRewardedEnabled: (enabled: boolean) => void;
  setBannersEnabled: (enabled: boolean) => void;
}

const AdContext = createContext<AdContextValue | null>(null);

const DEFAULT_SETTINGS: AdSettings = {
  interstitialsEnabled: true,
  rewardedEnabled: true,
  bannersEnabled: true,
};

interface AdProviderProps {
  children: ReactNode;
}

export function AdProvider({ children }: AdProviderProps) {
  const maxAds = useMaxAds();
  const adjust = useAdjustContext();
  
  const [settings, setSettings] = useState<AdSettings>(DEFAULT_SETTINGS);

  const adjustRef = useRef(adjust);
  adjustRef.current = adjust;

  // Show banner when SDK is ready and banners are enabled
  useEffect(() => {
    if (!maxAds.isInitialized || maxAds.isFullscreenAdActive) return;

    if (settings.bannersEnabled) {
      maxAds.showBanner();
      adjustRef.current.trackEvent('adImpressionBanner');
    } else {
      maxAds.hideBanner();
    }
  }, [settings.bannersEnabled, maxAds.isInitialized, maxAds.isFullscreenAdActive, maxAds.showBanner, maxAds.hideBanner]);

  const setInterstitialsEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, interstitialsEnabled: enabled }));
  }, []);

  const setRewardedEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, rewardedEnabled: enabled }));
  }, []);

  const setBannersEnabled = useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, bannersEnabled: enabled }));
  }, []);

  // Wrap showInterstitial with tracking
  const showInterstitialWithTracking = useCallback(async () => {
    await maxAds.showInterstitial();
    adjustRef.current.trackEvent('adImpressionInterstitial');
  }, [maxAds.showInterstitial]);

  // Wrap showRewarded with tracking
  const showRewardedWithTracking = useCallback(async () => {
    const result = await maxAds.showRewarded();
    if (result) {
      adjustRef.current.trackEvent('adImpressionRewarded');
    }
    return result;
  }, [maxAds.showRewarded]);

  const value: AdContextValue = useMemo(() => ({
    ...maxAds,
    showInterstitial: showInterstitialWithTracking,
    showRewarded: showRewardedWithTracking,
    settings,
    setInterstitialsEnabled,
    setRewardedEnabled,
    setBannersEnabled,
  }), [maxAds, showInterstitialWithTracking, showRewardedWithTracking, settings, setInterstitialsEnabled, setRewardedEnabled, setBannersEnabled]);

  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
}

const defaultAdContextValue: AdContextValue = {
  isInitialized: false,
  isBannerVisible: false,
  isInterstitialLoaded: false,
  isRewardedLoaded: false,
  isFullscreenAdActive: false,
  showBanner: async () => {},
  hideBanner: async () => {},
  showInterstitial: async () => {},
  showRewarded: async () => null,
  prepareInterstitial: async () => {},
  prepareRewarded: async () => {},
  settings: DEFAULT_SETTINGS,
  setInterstitialsEnabled: () => {},
  setRewardedEnabled: () => {},
  setBannersEnabled: () => {},
};

export function useAds(): AdContextValue {
  const context = useContext(AdContext);
  return context ?? defaultAdContextValue;
}
