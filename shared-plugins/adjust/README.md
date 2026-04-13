# Adjust Attribution Plugin (Capacitor)

Full-stack Adjust SDK integration for Capacitor apps. Supports event tracking with callback/partner parameters, ad revenue tracking, attribution change listeners, GDPR compliance, and environment-aware initialization.

## File Placement

Copy these files into your project:

| Source File | Destination |
|-------------|-------------|
| `typescript/adjustConfig.ts` | `src/lib/adjust/adjustConfig.ts` |
| `typescript/useAdjust.ts` | `src/hooks/useAdjust.ts` |
| `ios/AdjustPlugin.swift` | `ios/App/App/AdjustPlugin.swift` |
| `ios/AdjustPlugin.m` | `ios/App/App/AdjustPlugin.m` |
| `android/AdjustPlugin.java` | `android/app/src/main/java/<your-package>/AdjustPlugin.java` |

## Configuration Checklist

After copying, search all files for `YOUR_` and replace with your real values:

| Placeholder | Where to get it |
|-------------|-----------------|
| `YOUR_ADJUST_APP_TOKEN_ANDROID` | Adjust Dashboard > App Settings |
| `YOUR_ADJUST_APP_TOKEN_IOS` | Adjust Dashboard > App Settings |
| `YOUR_SESSION_START_TOKEN_ANDROID` | Adjust Dashboard > Events |
| `YOUR_SESSION_START_TOKEN_IOS` | Adjust Dashboard > Events |
| `YOUR_GAME_START_TOKEN_ANDROID` | Adjust Dashboard > Events |
| `YOUR_GAME_START_TOKEN_IOS` | Adjust Dashboard > Events |
| (etc. for each event token) | Adjust Dashboard > Events |

**Android only**: Change the `package` declaration at the top of `AdjustPlugin.java` to match your project's package name.

## Native Dependencies

### iOS (add to `ios/App/Podfile`)

```ruby
pod 'Adjust', '~> 5.0'
```

Then run `cd ios/App && pod install`.

### Android (add to `android/app/build.gradle`)

```groovy
// Adjust SDK
implementation 'com.adjust.sdk:adjust-android:5.0.0'
implementation 'com.android.installreferrer:installreferrer:2.2'

// Google Play Services for Advertising ID (required by Adjust)
implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'
```

### Android ProGuard Rules (add to `proguard-rules.pro`)

```
-keep class com.adjust.sdk.** { *; }
-keep class com.google.android.gms.common.ConnectionResult {
    int SUCCESS;
}
-keep class com.google.android.gms.ads.identifier.AdvertisingIdClient {
    com.google.android.gms.ads.identifier.AdvertisingIdClient$Info getAdvertisingIdInfo(android.content.Context);
}
-keep class com.google.android.gms.ads.identifier.AdvertisingIdClient$Info {
    java.lang.String getId();
    boolean isLimitAdTrackingEnabled();
}
-keep public class com.android.installreferrer.** { *; }
```

## Plugin Registration

### Android (`MainActivity.java`)

```java
import com.yourpackage.AdjustPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AdjustPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### iOS (`CustomBridgeViewController.swift`)

```swift
import Capacitor

class CustomBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AdjustPlugin())
    }
}
```

## API Reference

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `initialize(options)` | `{ appToken, environment, logLevel, attConsentWaitingInterval? }` | Initializes the Adjust SDK. Call once on app start. |
| `trackEvent(options)` | `{ eventToken, callbackParameters?, partnerParameters?, revenue?, currency? }` | Tracks an event with optional parameters and revenue. |
| `trackAdRevenue(options)` | `{ source?, revenue, currency?, adImpressionsCount?, adRevenueNetwork?, adRevenueUnit?, adRevenuePlacement? }` | Tracks ad revenue from any source. |
| `isEnabled()` | -- | Returns `{ enabled: boolean }`. |
| `setEnabled(options)` | `{ enabled: boolean }` | Enables or disables tracking. |
| `gdprForgetMe()` | -- | Sends a GDPR "forget me" request to Adjust servers. |

### Events

Subscribe via `AdjustPlugin.addListener(eventName, callback)`:

| Event | Callback Data | When |
|-------|---------------|------|
| `attributionChanged` | `{ trackerToken, trackerName, network, campaign, adgroup, creative, clickLabel }` | When Adjust determines or updates the user's attribution |

## useAdjust Hook

The `useAdjust()` hook manages the full lifecycle. It returns:

```typescript
{
  isInitialized: boolean;
  attribution: AdjustAttribution | null;
  trackEvent: (eventType: AdjustEventType, params?) => Promise<void>;
  trackAdRevenue: (revenue: number, options?) => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
  gdprForgetMe: () => Promise<void>;
}
```

Key behaviors:
- Automatically initializes on mount (native only, skipped on web)
- Uses platform-specific app tokens (iOS vs Android)
- Sets up attribution listener before initialization
- Automatically tracks a `sessionStart` event after init
- Debug logging only in sandbox environment
- Double-init protection via `initializingRef`

## How It Works

### Initialization Flow

1. `useAdjust` registers the `attributionChanged` listener
2. Selects the platform-specific app token
3. Calls `AdjustPlugin.initialize()` with token, environment, and log level
4. On iOS: sets `attConsentWaitingInterval: 120` to wait for ATT consent
5. Tracks `sessionStart` event

### Event Tracking Flow

1. Call `trackEvent('gameStart', { callbackParameters: { level: '5' } })`
2. Hook resolves the platform-specific event token from `adjustConfig.ts`
3. Calls native `trackEvent` with the resolved token and parameters
4. Native plugin creates an `AdjustEvent` object with optional callback/partner parameters and revenue

### Environment Modes

| Environment | Log Level | Debug Logging |
|-------------|-----------|---------------|
| `sandbox` (development) | `verbose` | Enabled |
| `production` (release) | `warn` | Disabled |

The environment is determined by `process.env.NODE_ENV` in `adjustConfig.ts`.

## Adding New Event Tokens

1. Create the event in the Adjust Dashboard (one per platform)
2. Add the tokens to `adjustConfig.ts`:

```typescript
export const ADJUST_EVENT_TOKENS = {
  // ...existing tokens...
  myNewEvent: { android: 'abc123', ios: 'def456' },
} as const;
```

3. The `AdjustEventType` union type updates automatically (`keyof typeof ADJUST_EVENT_TOKENS`)
4. Track it: `trackEvent('myNewEvent')`

## Deep Link Support (iOS)

If you use Adjust deep links, add this to your `AppDelegate.swift`:

```swift
import AdjustSdk

// In application(_:open:options:)
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    if let deeplink = ADJDeeplink(deeplink: url) {
        Adjust.processDeeplink(deeplink)
    }
    return true
}

// In application(_:continue:restorationHandler:)
func application(_ application: UIApplication, continue userActivity: NSUserActivity,
                 restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
       let url = userActivity.webpageURL,
       let deeplink = ADJDeeplink(deeplink: url) {
        Adjust.processDeeplink(deeplink)
    }
    return true
}
```

## Integration with MAX Ads

The MAX ad plugin tracks ad revenue to Adjust automatically on the native side. No additional setup is needed beyond having both plugins installed. See `max-ads/README.md` for details on the revenue tracking flow.

If you also want to track ad impressions as Adjust events (in addition to native revenue tracking), use the context layer:

```typescript
const adjust = useAdjustContext();
// After showing an interstitial:
adjust.trackEvent('adImpressionInterstitial');
```
