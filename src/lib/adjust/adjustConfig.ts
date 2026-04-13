/**
 * Adjust SDK Configuration
 *
 * Get your app token from the Adjust dashboard:
 * https://dash.adjust.com/
 *
 * Replace all YOUR_* placeholders with real values.
 */

// TODO: Replace with your Adjust app tokens (one per platform)
export const ADJUST_APP_TOKEN_ANDROID = 'YOUR_ADJUST_APP_TOKEN_ANDROID';
export const ADJUST_APP_TOKEN_IOS = 'YOUR_ADJUST_APP_TOKEN_IOS';

export const ADJUST_ENVIRONMENT: 'sandbox' | 'production' = 
  process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';

export const ADJUST_LOG_LEVEL: 'verbose' | 'debug' | 'info' | 'warn' | 'error' | 'suppress' = 
  ADJUST_ENVIRONMENT === 'sandbox' ? 'verbose' : 'warn';

/**
 * Event tokens for tracking in-app events.
 * Create these in the Adjust dashboard -- each event gets a unique token per platform.
 *
 * TODO: Replace all YOUR_* values with your real event tokens.
 */
export const ADJUST_EVENT_TOKENS = {
  sessionStart: { android: 'YOUR_SESSION_START_TOKEN_ANDROID', ios: 'YOUR_SESSION_START_TOKEN_IOS' },
  gameStart: { android: 'YOUR_GAME_START_TOKEN_ANDROID', ios: 'YOUR_GAME_START_TOKEN_IOS' },
  
  gameWon: { android: 'YOUR_GAME_WON_TOKEN_ANDROID', ios: 'YOUR_GAME_WON_TOKEN_IOS' },
  gameLost: { android: 'YOUR_GAME_LOST_TOKEN_ANDROID', ios: 'YOUR_GAME_LOST_TOKEN_IOS' },
  
  adImpressionBanner: { android: 'YOUR_AD_BANNER_TOKEN_ANDROID', ios: 'YOUR_AD_BANNER_TOKEN_IOS' },
  adImpressionInterstitial: { android: 'YOUR_AD_INTERSTITIAL_TOKEN_ANDROID', ios: 'YOUR_AD_INTERSTITIAL_TOKEN_IOS' },
  adImpressionRewarded: { android: 'YOUR_AD_REWARDED_TOKEN_ANDROID', ios: 'YOUR_AD_REWARDED_TOKEN_IOS' },

  iapPurchase: { android: 'YOUR_IAP_TOKEN_ANDROID', ios: 'YOUR_IAP_TOKEN_IOS' },
} as const;

export type AdjustEventToken = string | { android: string; ios: string };
export type AdjustEventType = keyof typeof ADJUST_EVENT_TOKENS;
