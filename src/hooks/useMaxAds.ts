/**
 * AppLovin MAX ad lifecycle hook. Initializes the MAX SDK, loads
 * banner/interstitial/rewarded ads, listens for 14 event types from native,
 * and exposes show/prepare methods. Includes rewarded-to-interstitial fallback.
 *
 * Update the import paths below to match your project structure.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { MaxAds, RewardEvent } from '@/lib/ads/maxAdsPlugin';
import { AD_UNITS, USE_TEST_ADS } from '@/lib/ads/adConfig';

type Platform = 'android' | 'ios';

function getPlatform(): Platform {
  const platform = Capacitor.getPlatform();
  return platform === 'ios' ? 'ios' : 'android';
}

export interface UseMaxAdsReturn {
  isInitialized: boolean;
  isBannerVisible: boolean;
  isInterstitialLoaded: boolean;
  isRewardedLoaded: boolean;
  isFullscreenAdActive: boolean;
  showBanner: () => Promise<void>;
  hideBanner: () => Promise<void>;
  showInterstitial: () => Promise<void>;
  showRewarded: () => Promise<RewardEvent | null>;
  prepareInterstitial: () => Promise<void>;
  prepareRewarded: () => Promise<void>;
}

export function useMaxAds(): UseMaxAdsReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isInterstitialLoaded, setIsInterstitialLoaded] = useState(false);
  const [isRewardedLoaded, setIsRewardedLoaded] = useState(false);
  const [isFullscreenAdActive, setIsFullscreenAdActive] = useState(false);

  const initializingRef = useRef(false);
  const bannerHasLoadedRef = useRef(false);
  const rewardCallbackRef = useRef<((reward: RewardEvent | null) => void) | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listeners: Array<{ remove: () => void }> = [];

    const setupListeners = async () => {
      listeners.push(
        await MaxAds.addListener('bannerLoaded', () => {
          bannerHasLoadedRef.current = true;
          setIsBannerVisible(true);
        }),
        await MaxAds.addListener('bannerFailed', (data) => {
          if (!bannerHasLoadedRef.current) {
            setIsBannerVisible(false);
          }
          console.warn('[MaxAds] Banner failed:', data.message);
        }),
        await MaxAds.addListener('interstitialLoaded', () => {
          setIsInterstitialLoaded(true);
        }),
        await MaxAds.addListener('interstitialShowed', () => {
          setIsFullscreenAdActive(true);
        }),
        await MaxAds.addListener('interstitialDismissed', () => {
          setIsInterstitialLoaded(false);
          setIsFullscreenAdActive(false);
        }),
        await MaxAds.addListener('interstitialFailed', (data) => {
          setIsInterstitialLoaded(false);
          setIsFullscreenAdActive(false);
          console.warn('[MaxAds] Interstitial failed:', data.message);
        }),
        await MaxAds.addListener('rewardedLoaded', () => {
          setIsRewardedLoaded(true);
        }),
        await MaxAds.addListener('rewardedShowed', () => {
          setIsFullscreenAdActive(true);
        }),
        await MaxAds.addListener('rewardedDismissed', () => {
          setIsRewardedLoaded(false);
          setIsFullscreenAdActive(false);
          if (rewardCallbackRef.current) {
            rewardCallbackRef.current(null);
            rewardCallbackRef.current = null;
          }
        }),
        await MaxAds.addListener('rewardedFailed', (data) => {
          setIsRewardedLoaded(false);
          setIsFullscreenAdActive(false);
          if (rewardCallbackRef.current) {
            rewardCallbackRef.current(null);
            rewardCallbackRef.current = null;
          }
          console.warn('[MaxAds] Rewarded failed:', data.message);
        }),
        await MaxAds.addListener('rewardedEarned', (data) => {
          if (rewardCallbackRef.current) {
            rewardCallbackRef.current(data);
            rewardCallbackRef.current = null;
          }
        }),
        await MaxAds.addListener('adRevenue', () => {}),
      );
    };

    setupListeners();

    return () => {
      listeners.forEach(l => l.remove());
    };
  }, []);

  useEffect(() => {
    const initMaxAds = async () => {
      if (!Capacitor.isNativePlatform()) return;

      if (initializingRef.current || isInitialized) return;
      initializingRef.current = true;

      try {
        await MaxAds.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('[MaxAds] Initialization error:', error);
      } finally {
        initializingRef.current = false;
      }
    };

    initMaxAds();
  }, [isInitialized]);

  const prepareInterstitial = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !isInitialized) return;

    try {
      const platform = getPlatform();
      await MaxAds.prepareInterstitial({ adId: AD_UNITS[platform].interstitial });
    } catch (error) {
      console.error('[MaxAds] Prepare interstitial error:', error);
      setIsInterstitialLoaded(false);
    }
  }, [isInitialized]);

  const prepareRewarded = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !isInitialized) return;

    try {
      const platform = getPlatform();
      await MaxAds.prepareRewarded({ adId: AD_UNITS[platform].rewarded });
    } catch (error) {
      console.error('[MaxAds] Prepare rewarded error:', error);
      setIsRewardedLoaded(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      prepareInterstitial();
      prepareRewarded();
    }
  }, [isInitialized, prepareInterstitial, prepareRewarded]);

  const showBanner = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !isInitialized) return;

    try {
      const platform = getPlatform();
      await MaxAds.showBanner({
        adId: AD_UNITS[platform].banner,
        position: 'bottom',
      });
      
    } catch (error) {
      console.error('[MaxAds] Show banner error:', error);
    }
  }, [isInitialized]);

  const hideBanner = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await MaxAds.hideBanner();
      bannerHasLoadedRef.current = false;
      setIsBannerVisible(false);
    } catch (error) {
      console.error('[MaxAds] Hide banner error:', error);
    }
  }, []);

  const showInterstitial = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || !isInitialized) return;

    try {
      if (!isInterstitialLoaded) {
        await prepareInterstitial();
      }
      await MaxAds.showInterstitial();
      setIsInterstitialLoaded(false);
    } catch (error) {
      console.error('[MaxAds] Show interstitial error:', error);
    }
  }, [isInitialized, isInterstitialLoaded, prepareInterstitial]);

  const showRewarded = useCallback(async (): Promise<RewardEvent | null> => {
    if (!Capacitor.isNativePlatform() || !isInitialized) return null;

    if (isRewardedLoaded) {
      try {
        return new Promise<RewardEvent | null>((resolve) => {
          rewardCallbackRef.current = resolve;
          MaxAds.showRewarded().catch((error) => {
            console.error('[MaxAds] Show rewarded error:', error);
            rewardCallbackRef.current = null;
            resolve(null);
          });
        });
      } catch (error) {
        console.error('[MaxAds] Show rewarded error:', error);
      }
    }

    // Fallback: show interstitial if rewarded is not loaded
    if (isInterstitialLoaded) {
      try {
        return new Promise<RewardEvent | null>((resolve) => {
          const onDismiss = MaxAds.addListener('interstitialDismissed', () => {
            onDismiss.then(l => l.remove());
            setIsInterstitialLoaded(false);
            resolve({ type: 'interstitial_fallback', amount: 1 });
          });

          MaxAds.showInterstitial().catch((error) => {
            console.error('[MaxAds] Interstitial fallback error:', error);
            onDismiss.then(l => l.remove());
            resolve(null);
          });
        });
      } catch (error) {
        console.error('[MaxAds] Interstitial fallback error:', error);
      }
    }

    return null;
  }, [isInitialized, isRewardedLoaded, isInterstitialLoaded]);

  return useMemo(() => ({
    isInitialized,
    isBannerVisible,
    isInterstitialLoaded,
    isRewardedLoaded,
    isFullscreenAdActive,
    showBanner,
    hideBanner,
    showInterstitial,
    showRewarded,
    prepareInterstitial,
    prepareRewarded,
  }), [isInitialized, isBannerVisible, isInterstitialLoaded, isRewardedLoaded, isFullscreenAdActive,
       showBanner, hideBanner, showInterstitial, showRewarded, prepareInterstitial, prepareRewarded]);
}
