/**
 * Capacitor plugin interface for the custom MaxAdPlugin. Registers the plugin
 * bridge and defines the TypeScript call signatures and event listener types.
 */
import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface AdRevenueEvent {
  revenue: number;
  currency: string;
  precisionType: number;
  adUnitId: string;
  placement: string;
  network: string;
  adSourceId: string;
  adSourceInstanceId: string;
}

export interface AdErrorEvent {
  code: number;
  message: string;
}

export interface RewardEvent {
  type: string;
  amount: number;
}

export interface MaxAdsPluginInterface {
  initialize(): Promise<{ initialized: boolean }>;

  showBanner(options: { adId: string; position: 'top' | 'bottom' }): Promise<void>;
  hideBanner(): Promise<void>;
  removeBanner(): Promise<void>;

  prepareInterstitial(options: { adId: string }): Promise<void>;
  showInterstitial(): Promise<void>;

  prepareRewarded(options: { adId: string }): Promise<void>;
  showRewarded(): Promise<void>;

  addListener(event: 'bannerLoaded', callback: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'bannerFailed', callback: (data: AdErrorEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'bannerOpened', callback: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'bannerClosed', callback: () => void): Promise<PluginListenerHandle>;

  addListener(event: 'interstitialLoaded', callback: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'interstitialFailed', callback: (data: AdErrorEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'interstitialShowed', callback: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'interstitialDismissed', callback: () => void): Promise<PluginListenerHandle>;

  addListener(event: 'rewardedLoaded', callback: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'rewardedFailed', callback: (data: AdErrorEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'rewardedShowed', callback: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'rewardedDismissed', callback: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'rewardedEarned', callback: (data: RewardEvent) => void): Promise<PluginListenerHandle>;

  addListener(event: 'adRevenue', callback: (data: AdRevenueEvent) => void): Promise<PluginListenerHandle>;

  removeAllListeners(): Promise<void>;
}

export const MaxAds = registerPlugin<MaxAdsPluginInterface>('MaxAdPlugin');
