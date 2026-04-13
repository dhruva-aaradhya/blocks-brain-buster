/**
 * AppLovin MAX Ad Configuration
 *
 * Replace all YOUR_* placeholders with real ad unit IDs from the AppLovin dashboard.
 * Android and iOS use separate ad unit IDs.
 *
 * Set USE_TEST_ADS = true during development to use AppLovin's test ad units.
 */

export const USE_TEST_ADS = false;

const TEST_AD_UNITS = {
  android: {
    banner: 'YOUR_ANDROID_TEST_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_ANDROID_TEST_INTERSTITIAL_AD_UNIT_ID',
    rewarded: 'YOUR_ANDROID_TEST_REWARDED_AD_UNIT_ID',
  },
  ios: {
    banner: 'YOUR_IOS_TEST_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_IOS_TEST_INTERSTITIAL_AD_UNIT_ID',
    rewarded: 'YOUR_IOS_TEST_REWARDED_AD_UNIT_ID',
  },
};

const PRODUCTION_AD_UNITS = {
  android: {
    banner: 'YOUR_ANDROID_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_ANDROID_INTERSTITIAL_AD_UNIT_ID',
    rewarded: 'YOUR_ANDROID_REWARDED_AD_UNIT_ID',
  },
  ios: {
    banner: 'YOUR_IOS_BANNER_AD_UNIT_ID',
    interstitial: 'YOUR_IOS_INTERSTITIAL_AD_UNIT_ID',
    rewarded: 'YOUR_IOS_REWARDED_AD_UNIT_ID',
  },
};

export const AD_UNITS = USE_TEST_ADS ? TEST_AD_UNITS : PRODUCTION_AD_UNITS;
