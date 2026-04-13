# AppLovin MAX Ads Plugin (Capacitor)

Full-stack AppLovin MAX ads integration with Amazon APS header bidding for Capacitor apps. Supports banner, interstitial, and rewarded ad formats. Tracks ad revenue to Adjust automatically on the native side.

## File Placement

Copy these files into your project:

| Source File | Destination |
|-------------|-------------|
| `typescript/maxAdsPlugin.ts` | `src/lib/ads/maxAdsPlugin.ts` |
| `typescript/adConfig.ts` | `src/lib/ads/adConfig.ts` |
| `typescript/useMaxAds.ts` | `src/hooks/useMaxAds.ts` |
| `ios/MaxAdPlugin.swift` | `ios/App/App/MaxAdPlugin.swift` |
| `ios/MaxAdPlugin.m` | `ios/App/App/MaxAdPlugin.m` |
| `android/MaxAdPlugin.java` | `android/app/src/main/java/<your-package>/MaxAdPlugin.java` |

## Configuration Checklist

After copying, search all files for `YOUR_` and replace with your real values:

| Placeholder | Where to get it |
|-------------|-----------------|
| `YOUR_MAX_SDK_KEY` | AppLovin Dashboard > Account > Keys |
| `YOUR_AMAZON_APP_KEY` | Amazon APS Console > App Settings |
| `YOUR_AMAZON_BANNER_SLOT` | Amazon APS Console > Ad Slots |
| `YOUR_AMAZON_INTERSTITIAL_SLOT` | Amazon APS Console > Ad Slots |
| `YOUR_AMAZON_REWARDED_SLOT` | Amazon APS Console > Ad Slots |
| `YOUR_ANDROID_BANNER_AD_UNIT_ID` | AppLovin Dashboard > Manage > Ad Units |
| `YOUR_ANDROID_INTERSTITIAL_AD_UNIT_ID` | AppLovin Dashboard > Manage > Ad Units |
| `YOUR_ANDROID_REWARDED_AD_UNIT_ID` | AppLovin Dashboard > Manage > Ad Units |
| `YOUR_IOS_BANNER_AD_UNIT_ID` | AppLovin Dashboard > Manage > Ad Units |
| `YOUR_IOS_INTERSTITIAL_AD_UNIT_ID` | AppLovin Dashboard > Manage > Ad Units |
| `YOUR_IOS_REWARDED_AD_UNIT_ID` | AppLovin Dashboard > Manage > Ad Units |

**Android only**: Change the `package` declaration at the top of `MaxAdPlugin.java` to match your project's package name.

## Native Dependencies

### iOS (add to `ios/App/Podfile`)

```ruby
pod 'AppLovinSDK'
pod 'AmazonPublisherServicesSDK'  # Optional: for Amazon APS header bidding

# Mediation Adapters -- add the ones you need
pod 'AppLovinMediationGoogleAdapter'
pod 'AppLovinMediationGoogleAdManagerAdapter'
pod 'AppLovinMediationFacebookAdapter'
pod 'AppLovinMediationUnityAdsAdapter'
pod 'AppLovinMediationVungleAdapter'
pod 'AppLovinMediationIronSourceAdapter'
pod 'AppLovinMediationInMobiAdapter'
pod 'AppLovinMediationChartboostAdapter'
pod 'AppLovinMediationMintegralAdapter'
pod 'AppLovinMediationBidMachineAdapter'
pod 'AppLovinMediationFyberAdapter'
pod 'AppLovinMediationLineAdapter'
pod 'AppLovinMediationMolocoAdapter'
pod 'AppLovinMediationOguryPresageAdapter'
pod 'AppLovinMediationByteDanceAdapter'
pod 'AppLovinMediationSmaatoAdapter'
pod 'AppLovinMediationVerveAdapter'
pod 'AppLovinMediationMobileFuseAdapter'
pod 'AppLovinMediationBigoAdsAdapter'
pod 'AppLovinMediationPubMaticAdapter'
```

Then run `cd ios/App && pod install`.

### Android (add to `android/app/build.gradle`)

```groovy
// AppLovin MAX SDK
implementation 'com.applovin:applovin-sdk:+'

// Amazon APS (header bidding) -- optional
implementation 'com.applovin.mediation:amazon-tam-adapter:+'
implementation 'com.amazon.android:aps-sdk:+'

// Adjust SDK (required for ad revenue tracking in MaxAdPlugin)
implementation 'com.adjust.sdk:adjust-android:5.0.0'

// Mediation Adapters -- add the ones you need
implementation 'com.applovin.mediation:bidmachine-adapter:+'
implementation 'com.applovin.mediation:bigoads-adapter:+'
implementation 'com.applovin.mediation:chartboost-adapter:+'
implementation 'com.applovin.mediation:fyber-adapter:+'
implementation 'com.applovin.mediation:google-adapter:+'
implementation 'com.applovin.mediation:google-ad-manager-adapter:+'
implementation 'com.applovin.mediation:inmobi-adapter:+'
implementation 'com.applovin.mediation:ironsource-adapter:+'
implementation 'com.applovin.mediation:vungle-adapter:+'
implementation 'com.applovin.mediation:line-adapter:+'
implementation 'com.applovin.mediation:facebook-adapter:+'
implementation 'com.applovin.mediation:mintegral-adapter:+'
implementation 'com.applovin.mediation:mobilefuse-adapter:+'
implementation 'com.applovin.mediation:moloco-adapter:+'
implementation 'com.applovin.mediation:ogury-presage-adapter:+'
implementation 'com.applovin.mediation:bytedance-adapter:+'
implementation 'com.applovin.mediation:pubmatic-adapter:+'
implementation 'com.applovin.mediation:smaato-adapter:+'
implementation 'com.applovin.mediation:unityads-adapter:+'
implementation 'com.applovin.mediation:verve-adapter:+'
```

## Plugin Registration

### Android (`MainActivity.java`)

```java
import com.yourpackage.MaxAdPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MaxAdPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### iOS (`CustomBridgeViewController.swift`)

```swift
import Capacitor

class CustomBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MaxAdPlugin())
    }
}
```

## API Reference

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `initialize()` | -- | Initializes Amazon APS and AppLovin MAX SDKs. Must be called before any ad operations. |
| `showBanner(options)` | `{ adId: string, position: 'top' \| 'bottom' }` | Creates and displays a banner ad at the specified position. |
| `hideBanner()` | -- | Hides the banner (can be shown again later). |
| `removeBanner()` | -- | Destroys the banner completely. |
| `prepareInterstitial(options)` | `{ adId: string }` | Pre-loads an interstitial ad. |
| `showInterstitial()` | -- | Displays a previously prepared interstitial. |
| `prepareRewarded(options)` | `{ adId: string }` | Pre-loads a rewarded ad. |
| `showRewarded()` | -- | Displays a previously prepared rewarded ad. |

### Events

Subscribe via `MaxAds.addListener(eventName, callback)`:

| Event | Callback Data | When |
|-------|---------------|------|
| `bannerLoaded` | -- | Banner ad loaded and displayed |
| `bannerFailed` | `{ code, message }` | Banner failed to load |
| `bannerOpened` | -- | Banner expanded to fullscreen |
| `bannerClosed` | -- | Expanded banner collapsed |
| `interstitialLoaded` | -- | Interstitial ready to display |
| `interstitialFailed` | `{ code, message }` | Interstitial failed to load or display |
| `interstitialShowed` | -- | Interstitial is now on screen |
| `interstitialDismissed` | -- | User closed the interstitial |
| `rewardedLoaded` | -- | Rewarded ad ready to display |
| `rewardedFailed` | `{ code, message }` | Rewarded ad failed to load or display |
| `rewardedShowed` | -- | Rewarded ad is now on screen |
| `rewardedDismissed` | -- | User closed the rewarded ad (may not have earned reward) |
| `rewardedEarned` | `{ type, amount }` | User earned the reward |
| `adRevenue` | `{ revenue, currency, network, adUnitId, placement, ... }` | Revenue event from any ad format |

### useMaxAds Hook

The `useMaxAds()` hook manages the full lifecycle. It returns:

```typescript
{
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
```

Key behaviors:
- Automatically initializes on mount (native only)
- Auto-prepares interstitial and rewarded after initialization
- `showRewarded()` returns a `Promise<RewardEvent | null>` -- resolves with the reward if earned, or `null` if dismissed/failed
- Falls back to interstitial if rewarded is not loaded (returns `{ type: 'interstitial_fallback', amount: 1 }`)

## How It Works

### Initialization Flow

1. `useMaxAds` calls `MaxAds.initialize()`
2. Native plugin initializes Amazon APS SDK first
3. Then initializes AppLovin MAX SDK
4. Resolves with `{ initialized: true }`
5. Hook auto-prepares interstitial and rewarded ads

### Amazon APS Header Bidding Flow

For each ad format, the native plugin:

1. Creates an Amazon `DTBAdRequest` with the appropriate slot UUID
2. Fires the Amazon bid request
3. On Amazon success: sets `amazon_ad_response` as a local extra parameter on the MAX ad
4. On Amazon failure: sets `amazon_ad_error` as a local extra parameter
5. Loads the MAX ad (which picks up the Amazon bid for its auction)

### Retry with Exponential Backoff

On load failures, the native plugin retries with exponential backoff:
- Delay = `2^attempt` seconds, capped at `2^6 = 64` seconds
- Retry counter resets on successful load

### Ad Revenue to Adjust

Both native plugins (iOS and Android) track ad revenue directly to Adjust when the `didPayRevenue` / `onAdRevenuePaid` callback fires:

```
MAX SDK revenue callback
  -> Create AdjustAdRevenue(source: "applovin_max_sdk")
  -> Set revenue, currency, network, unit, placement
  -> Adjust.trackAdRevenue(adRevenue)
  -> Also emit "adRevenue" event to JS layer
```

## Platform Differences

| Aspect | iOS | Android |
|--------|-----|---------|
| Banner during fullscreen | Queued, shown 1.5s after dismissal | Shown immediately |
| Interstitial/Rewarded delegates | Separate delegate classes (SDK uses weak refs) | Inline anonymous listeners |
| Revenue events | `MAAdRevenueDelegate` only | `MaxAdRevenueListener` + `AppLovinCommunicator` subscription |
| Auto-reload after dismiss | 1.5s delay then reload + flush pending banner | Immediate reload in `onAdHidden` |

## Removing Amazon APS (Optional)

If you don't use Amazon APS header bidding:

1. Remove the Amazon SDK dependencies from Podfile / build.gradle
2. In `MaxAdPlugin.swift`: Remove `import DTBiOSSDK`, the Amazon key/slot constants, all `DTB*` classes, and the `*AmazonCallback` classes. Load MAX ads directly with `adView.loadAd()` / `interstitialAd.load()` / `rewardedAd.load()`
3. In `MaxAdPlugin.java`: Remove the Amazon imports, constants, and `DTBAdCallback` blocks. Call `bannerAdView.loadAd()` / `interstitialAd.loadAd()` / `rewardedAd.loadAd()` directly
