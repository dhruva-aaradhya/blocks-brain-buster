# Capacitor Native Plugin Kit: AppLovin MAX + Adjust

Drop-in AppLovin MAX (ads) and Adjust (attribution) plugins for **Capacitor + React** apps. Includes full native implementations for both iOS and Android, TypeScript interfaces, React hooks, and example context providers.

## Architecture

Every native SDK follows a 6-layer bridge pattern:

```
React Component
  -> Context Provider (SSR-safe defaults, cross-SDK coordination)
    -> Custom Hook (lifecycle management, event listeners)
      -> JS Plugin Interface (TypeScript types + registerPlugin)
        -> Capacitor Bridge (message passing)
          -> Native Plugin (Java on Android, Swift on iOS)
            -> Native SDK
```

### Data Flow

```
                        +-----------------+
                        | React Component |
                        +--------+--------+
                                 |
                  +--------------+--------------+
                  |                              |
          +-------v--------+          +---------v--------+
          |   AdContext     |          | AdjustContext     |
          | (level gating,  |          | (SSR-safe wrapper)|
          |  analytics)     |          +--------+---------+
          +-------+--------+                   |
                  |                             |
          +-------v--------+          +---------v--------+
          |  useMaxAds()   |          |   useAdjust()    |
          | (state, events)|          | (init, tracking) |
          +-------+--------+          +--------+---------+
                  |                             |
          +-------v--------+          +---------v--------+
          |  MaxAds plugin |          | AdjustPlugin     |
          | (registerPlugin)|         | (registerPlugin) |
          +-------+--------+          +--------+---------+
                  |                             |
          +-------v----------------------------v---------+
          |            Capacitor Bridge                   |
          +-------+----------------------------+---------+
                  |                             |
      +-----------+----------+      +-----------+---------+
      |                      |      |                     |
+-----v------+   +-----------v+   +-v-----------+  +-----v------+
| MaxAdPlugin|   | MaxAdPlugin|   | AdjustPlugin|  | AdjustPlugin|
| .swift     |   | .java      |   | .swift      |  | .java       |
+-----+------+   +------+-----+   +------+------+  +------+------+
      |                  |                |                |
+-----v------+   +-------v----+   +-------v-----+  +------v------+
| AppLovin   |   | AppLovin   |   | Adjust SDK  |  | Adjust SDK  |
| MAX SDK    |   | MAX SDK    |   | (iOS)       |  | (Android)   |
| + Amazon   |   | + Amazon   |   +-------------+  +-------------+
| APS (iOS)  |   | APS (Droid)|
+------------+   +------------+
```

### Cross-Plugin Integration

MAX tracks ad revenue directly to Adjust on both platforms. When an ad generates revenue, the native MAX plugin creates an `AdjustAdRevenue` object and calls `Adjust.trackAdRevenue()` -- no JS round-trip needed.

## What's Included

```
shared-plugins/
├── README.md                          <-- You are here
├── max-ads/
│   ├── README.md                      # Full MAX integration guide
│   ├── typescript/
│   │   ├── maxAdsPlugin.ts            # Capacitor plugin interface
│   │   ├── adConfig.ts                # Ad unit ID config (template)
│   │   └── useMaxAds.ts              # React hook
│   ├── ios/
│   │   ├── MaxAdPlugin.swift          # Native iOS plugin
│   │   └── MaxAdPlugin.m             # Obj-C bridge
│   └── android/
│       └── MaxAdPlugin.java           # Native Android plugin
├── adjust/
│   ├── README.md                      # Full Adjust integration guide
│   ├── typescript/
│   │   ├── adjustConfig.ts            # App tokens + event tokens (template)
│   │   └── useAdjust.ts              # React hook (includes plugin interface)
│   ├── ios/
│   │   ├── AdjustPlugin.swift         # Native iOS plugin
│   │   └── AdjustPlugin.m            # Obj-C bridge
│   └── android/
│       └── AdjustPlugin.java          # Native Android plugin
└── examples/
    ├── Providers.tsx                   # Example provider composition
    ├── AdContext.tsx                   # Example context with level gating + analytics
    └── AdjustContext.tsx              # Example SSR-safe context wrapper
```

## Prerequisites

- A Capacitor project (v5+) with iOS and/or Android targets
- `@capacitor/core` installed
- React (for the hooks and contexts)
- An AppLovin MAX account with ad units created
- An Adjust account with app tokens and event tokens created
- (Optional) An Amazon APS account for header bidding

## Quick Start

1. **Copy files** into your project following the placement guides in each plugin's README
2. **Replace placeholders** -- search for `YOUR_` to find all values that need your real keys
3. **Add native dependencies** (Podfile / build.gradle)
4. **Register plugins** in `MainActivity.java` and `CustomBridgeViewController.swift`
5. **Wrap your app** in context providers (see `examples/Providers.tsx`)

Detailed instructions are in each plugin's README:
- [MAX Ads Integration Guide](max-ads/README.md)
- [Adjust Integration Guide](adjust/README.md)

## Dependencies

### iOS (Podfile)

```ruby
# AppLovin MAX SDK
pod 'AppLovinSDK'

# Amazon APS (header bidding) -- optional
pod 'AmazonPublisherServicesSDK'

# Adjust SDK (attribution)
pod 'Adjust', '~> 5.0'

# Mediation Adapters (add the ones you need)
pod 'AppLovinMediationGoogleAdapter'
pod 'AppLovinMediationFacebookAdapter'
pod 'AppLovinMediationUnityAdsAdapter'
pod 'AppLovinMediationVungleAdapter'
pod 'AppLovinMediationIronSourceAdapter'
pod 'AppLovinMediationInMobiAdapter'
pod 'AppLovinMediationChartboostAdapter'
pod 'AppLovinMediationMintegralAdapter'
# ... see max-ads/README.md for the full list
```

### Android (build.gradle)

```groovy
// Adjust SDK
implementation 'com.adjust.sdk:adjust-android:5.0.0'
implementation 'com.android.installreferrer:installreferrer:2.2'
implementation 'com.google.android.gms:play-services-ads-identifier:18.0.1'

// AppLovin MAX SDK
implementation 'com.applovin:applovin-sdk:+'

// Amazon APS (header bidding) -- optional
implementation 'com.applovin.mediation:amazon-tam-adapter:+'
implementation 'com.amazon.android:aps-sdk:+'

// Mediation Adapters (add the ones you need)
implementation 'com.applovin.mediation:google-adapter:+'
implementation 'com.applovin.mediation:facebook-adapter:+'
implementation 'com.applovin.mediation:unityads-adapter:+'
implementation 'com.applovin.mediation:vungle-adapter:+'
implementation 'com.applovin.mediation:ironsource-adapter:+'
// ... see max-ads/README.md for the full list
```

### Android ProGuard Rules

If you use ProGuard/R8, add these rules to `proguard-rules.pro`:

```
# Adjust SDK
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

Both plugins must be manually registered in the native entry points.

### Android (`MainActivity.java`)

```java
import com.yourpackage.MaxAdPlugin;
import com.yourpackage.AdjustPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(MaxAdPlugin.class);
        registerPlugin(AdjustPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

### iOS (`CustomBridgeViewController.swift`)

Create this file if it doesn't exist, and set it as your app's root view controller in `AppDelegate.swift`:

```swift
import Capacitor

class CustomBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MaxAdPlugin())
        bridge?.registerPluginInstance(AdjustPlugin())
    }
}
```

## Integration Order

Adjust should be initialized **before** MAX, because MAX's native ad revenue callbacks call into the Adjust SDK directly. The recommended provider nesting order is:

```
<AdjustProvider>
  <AdProvider>    {/* wraps useMaxAds */}
    {children}
  </AdProvider>
</AdjustProvider>
```

See `examples/Providers.tsx` for a complete example.
