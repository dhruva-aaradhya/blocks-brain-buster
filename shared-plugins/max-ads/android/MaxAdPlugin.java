// TODO: Change this package to match your project
package com.yourpackage;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.adjust.sdk.Adjust;
import com.adjust.sdk.AdjustAdRevenue;
import com.amazon.device.ads.AdRegistration;
import com.amazon.device.ads.DTBAdCallback;
import com.amazon.device.ads.DTBAdNetwork;
import com.amazon.device.ads.DTBAdNetworkInfo;
import com.amazon.device.ads.DTBAdRequest;
import com.amazon.device.ads.DTBAdResponse;
import com.amazon.device.ads.DTBAdSize;
import com.amazon.device.ads.AdError;
import com.applovin.communicator.AppLovinCommunicator;
import com.applovin.communicator.AppLovinCommunicatorMessage;
import com.applovin.communicator.AppLovinCommunicatorSubscriber;
import com.applovin.mediation.MaxAd;
import com.applovin.mediation.MaxAdFormat;
import com.applovin.mediation.MaxAdListener;
import com.applovin.mediation.MaxAdRevenueListener;
import com.applovin.mediation.MaxAdViewAdListener;
import com.applovin.mediation.MaxError;
import com.applovin.mediation.MaxReward;
import com.applovin.mediation.MaxRewardedAdListener;
import com.applovin.mediation.ads.MaxAdView;
import com.applovin.mediation.ads.MaxInterstitialAd;
import com.applovin.mediation.ads.MaxRewardedAd;
import com.applovin.sdk.AppLovinMediationProvider;
import com.applovin.sdk.AppLovinSdk;
import com.applovin.sdk.AppLovinSdkInitializationConfiguration;
import com.applovin.sdk.AppLovinSdkUtils;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.TimeUnit;

import androidx.annotation.NonNull;

/**
 * Custom Capacitor plugin for AppLovin MAX ads with Amazon APS header bidding.
 * Manages banner, interstitial, and rewarded ad lifecycles. Uses exponential
 * backoff retry (up to 64s) on load failures. Tracks ad revenue to Adjust via
 * AdjustAdRevenue. Emits 14 event types to the JS layer via notifyListeners().
 */
@CapacitorPlugin(name = "MaxAdPlugin")
public class MaxAdPlugin extends Plugin implements MaxAdViewAdListener, MaxAdRevenueListener {
    private static final String TAG = "MaxAdPlugin";

    // TODO: Replace these with your own keys from the AppLovin and Amazon dashboards
    private static final String MAX_SDK_KEY = "YOUR_MAX_SDK_KEY";
    private static final String AMAZON_APP_ID = "YOUR_AMAZON_APP_KEY";
    private static final String AMAZON_BANNER_SLOT = "YOUR_AMAZON_BANNER_SLOT";
    private static final String AMAZON_INTERSTITIAL_SLOT = "YOUR_AMAZON_INTERSTITIAL_SLOT";
    private static final String AMAZON_REWARDED_SLOT = "YOUR_AMAZON_REWARDED_SLOT";

    private MaxAdView bannerAdView;
    private MaxInterstitialAd interstitialAd;
    private MaxRewardedAd rewardedAd;
    private FrameLayout bannerContainer;
    private boolean isSdkInitialized = false;

    private String bannerAdUnitId;
    private String interstitialAdUnitId;
    private String rewardedAdUnitId;

    private int interstitialRetryAttempt;
    private int rewardedRetryAttempt;

    // ── Initialization ──────────────────────────────────────────────────

    @PluginMethod
    public void initialize(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                AdRegistration.getInstance(AMAZON_APP_ID, getActivity());
                AdRegistration.enableTesting(false);
                AdRegistration.enableLogging(false);
                Log.d(TAG, "Amazon APS SDK initialized");

                AppLovinSdkInitializationConfiguration initConfig =
                        AppLovinSdkInitializationConfiguration.builder(MAX_SDK_KEY, getContext())
                                .setMediationProvider(AppLovinMediationProvider.MAX)
                                .build();

                AppLovinSdk.getInstance(getContext()).initialize(initConfig, sdkConfig -> {
                    isSdkInitialized = true;
                    Log.d(TAG, "AppLovin MAX SDK initialized");

                    subscribeToRevenueEvents();

                    JSObject result = new JSObject();
                    result.put("initialized", true);
                    call.resolve(result);
                });
            } catch (Exception e) {
                Log.e(TAG, "Failed to initialize MAX SDK", e);
                call.reject("Failed to initialize MAX SDK");
            }
        });
    }

    private void subscribeToRevenueEvents() {
        try {
            AppLovinCommunicator.getInstance(getContext()).subscribe(
                    new AppLovinCommunicatorSubscriber() {
                        @Override
                        public void onMessageReceived(AppLovinCommunicatorMessage message) {
                            if ("max_revenue_events".equals(message.getTopic())) {
                                Bundle data = message.getMessageData();
                                double revenue = data.getDouble("revenue", 0);
                                String networkName = data.getString("network_name", "unknown");
                                String adUnitId = data.getString("max_ad_unit_id", "");
                                String adFormat = data.getString("ad_format", "");

                                trackAdRevenueToAdjust(revenue, "USD", networkName, adUnitId, adFormat.toLowerCase());
                            }
                        }

                        @Override
                        public String getCommunicatorId() {
                            // TODO: Change to a unique ID for your app
                            return "your_app_revenue";
                        }
                    },
                    "max_revenue_events"
            );
            Log.d(TAG, "Subscribed to max_revenue_events");
        } catch (Exception e) {
            Log.e(TAG, "Failed to subscribe to revenue events", e);
        }
    }

    // ── Banner ──────────────────────────────────────────────────────────

    @PluginMethod
    public void showBanner(PluginCall call) {
        String adId = call.getString("adId");
        String position = call.getString("position", "bottom");

        if (adId == null || adId.isEmpty()) {
            call.reject("adId is required");
            return;
        }

        bannerAdUnitId = adId;

        getActivity().runOnUiThread(() -> {
            try {
                if (bannerContainer != null && bannerAdView != null) {
                    if (bannerContainer.getVisibility() == View.VISIBLE) {
                        call.resolve();
                        return;
                    }
                    bannerContainer.setVisibility(View.VISIBLE);
                    notifyListeners("bannerLoaded", new JSObject());
                    call.resolve();
                    return;
                }

                removeBannerViewIfExists();

                Activity activity = getActivity();

                DisplayMetrics dm = activity.getResources().getDisplayMetrics();
                int screenWidthDp = (int) (dm.widthPixels / dm.density);
                int screenHeightDp = (int) (dm.heightPixels / dm.density);
                int bannerWidthDp = Math.min(screenWidthDp, screenHeightDp);

                int heightDp = MaxAdFormat.BANNER.getAdaptiveSize(bannerWidthDp, activity).getHeight();
                int heightPx = AppLovinSdkUtils.dpToPx(activity, heightDp);
                int bannerWidthPx = AppLovinSdkUtils.dpToPx(activity, bannerWidthDp);

                bannerAdView = new MaxAdView(adId, activity);
                bannerAdView.setListener(this);
                bannerAdView.setRevenueListener(this);

                bannerContainer = new FrameLayout(activity);
                FrameLayout.LayoutParams containerParams = new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                );
                containerParams.gravity = position.equals("top") ? Gravity.TOP : Gravity.BOTTOM;
                bannerContainer.setLayoutParams(containerParams);

                FrameLayout.LayoutParams adParams = new FrameLayout.LayoutParams(
                        bannerWidthPx,
                        heightPx
                );
                adParams.gravity = Gravity.CENTER_HORIZONTAL;
                bannerAdView.setLayoutParams(adParams);
                bannerAdView.setBackgroundColor(Color.TRANSPARENT);
                bannerContainer.addView(bannerAdView);

                ((ViewGroup) activity.findViewById(android.R.id.content)).addView(bannerContainer);

                loadBannerWithAmazon(adId);

                call.resolve();
            } catch (Exception e) {
                Log.e(TAG, "Failed to show banner", e);
                call.reject("Failed to show banner");
            }
        });
    }

    private void loadBannerWithAmazon(String maxAdUnitId) {
        DTBAdSize adSize = new DTBAdSize(320, 50, AMAZON_BANNER_SLOT);
        DTBAdNetworkInfo networkInfo = new DTBAdNetworkInfo(DTBAdNetwork.MAX);
        DTBAdRequest adLoader = new DTBAdRequest(networkInfo);
        adLoader.setSizes(adSize);
        adLoader.loadAd(new DTBAdCallback() {
            @Override
            public void onSuccess(@NonNull DTBAdResponse dtbAdResponse) {
                if (bannerAdView != null) {
                    bannerAdView.setLocalExtraParameter("amazon_ad_response", dtbAdResponse);
                    bannerAdView.loadAd();
                }
            }

            @Override
            public void onFailure(@NonNull AdError adError) {
                if (bannerAdView != null) {
                    bannerAdView.setLocalExtraParameter("amazon_ad_error", adError);
                    bannerAdView.loadAd();
                }
            }
        });
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (bannerContainer != null) {
                bannerContainer.setVisibility(View.GONE);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void removeBanner(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            removeBannerViewIfExists();
            call.resolve();
        });
    }

    private void removeBannerViewIfExists() {
        if (bannerAdView != null) {
            bannerAdView.setListener(null);
            bannerAdView.setRevenueListener(null);
            bannerAdView.destroy();
            bannerAdView = null;
        }
        if (bannerContainer != null) {
            ViewGroup parent = (ViewGroup) bannerContainer.getParent();
            if (parent != null) {
                parent.removeView(bannerContainer);
            }
            bannerContainer = null;
        }
    }

    // ── MaxAdViewAdListener (Banner) ────────────────────────────────────

    @Override
    public void onAdLoaded(@NonNull MaxAd maxAd) {
        notifyListeners("bannerLoaded", new JSObject());
    }

    @Override
    public void onAdLoadFailed(@NonNull String adUnitId, @NonNull MaxError error) {
        JSObject data = new JSObject();
        data.put("code", error.getCode());
        data.put("message", error.getMessage());
        notifyListeners("bannerFailed", data);
    }

    @Override
    public void onAdDisplayFailed(@NonNull MaxAd maxAd, @NonNull MaxError error) {
        String format = maxAd.getFormat().getLabel();
        JSObject data = new JSObject();
        data.put("code", error.getCode());
        data.put("message", error.getMessage());

        if ("INTER".equalsIgnoreCase(format)) {
            notifyListeners("interstitialFailed", data);
            if (interstitialAd != null) interstitialAd.loadAd();
        } else if ("REWARDED".equalsIgnoreCase(format)) {
            notifyListeners("rewardedFailed", data);
            if (rewardedAd != null) rewardedAd.loadAd();
        }
    }

    @Override
    public void onAdClicked(@NonNull MaxAd maxAd) {}

    @Override
    public void onAdExpanded(@NonNull MaxAd maxAd) {
        notifyListeners("bannerOpened", new JSObject());
    }

    @Override
    public void onAdCollapsed(@NonNull MaxAd maxAd) {
        notifyListeners("bannerClosed", new JSObject());
    }

    // ── Interstitial ────────────────────────────────────────────────────

    @PluginMethod
    public void prepareInterstitial(PluginCall call) {
        String adId = call.getString("adId");
        if (adId == null || adId.isEmpty()) {
            call.reject("adId is required");
            return;
        }

        interstitialAdUnitId = adId;

        getActivity().runOnUiThread(() -> {
            try {
                if (interstitialAd != null) {
                    interstitialAd.destroy();
                }

                interstitialAd = new MaxInterstitialAd(adId, getActivity());

                loadInterstitialWithAmazon(adId, call);
            } catch (Exception e) {
                Log.e(TAG, "Failed to prepare interstitial", e);
                call.reject("Failed to prepare interstitial");
            }
        });
    }

    private void loadInterstitialWithAmazon(String maxAdUnitId, PluginCall call) {
        DTBAdSize adSize = new DTBAdSize.DTBInterstitialAdSize(AMAZON_INTERSTITIAL_SLOT);
        DTBAdNetworkInfo networkInfo = new DTBAdNetworkInfo(DTBAdNetwork.MAX);
        DTBAdRequest adLoader = new DTBAdRequest(networkInfo);
        adLoader.setSizes(adSize);
        adLoader.loadAd(new DTBAdCallback() {
            @Override
            public void onSuccess(@NonNull DTBAdResponse dtbAdResponse) {
                if (interstitialAd != null) {
                    interstitialAd.setLocalExtraParameter("amazon_ad_response", dtbAdResponse);
                }
                loadInterstitialAd(call);
            }

            @Override
            public void onFailure(@NonNull AdError adError) {
                if (interstitialAd != null) {
                    interstitialAd.setLocalExtraParameter("amazon_ad_error", adError);
                }
                loadInterstitialAd(call);
            }
        });
    }

    private void loadInterstitialAd(PluginCall call) {
        if (interstitialAd == null) return;

        interstitialAd.setListener(new MaxAdListener() {
            @Override
            public void onAdLoaded(@NonNull MaxAd maxAd) {
                interstitialRetryAttempt = 0;
                notifyListeners("interstitialLoaded", new JSObject());
                if (call != null) call.resolve();
            }

            @Override
            public void onAdLoadFailed(@NonNull String adUnitId, @NonNull MaxError error) {
                interstitialRetryAttempt++;
                long delayMs = TimeUnit.SECONDS.toMillis((long) Math.pow(2, Math.min(6, interstitialRetryAttempt)));
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    if (interstitialAd != null) interstitialAd.loadAd();
                }, delayMs);

                JSObject data = new JSObject();
                data.put("code", error.getCode());
                data.put("message", error.getMessage());
                notifyListeners("interstitialFailed", data);
                if (call != null) call.reject("Failed to load interstitial: " + error.getMessage());
            }

            @Override
            public void onAdDisplayed(@NonNull MaxAd maxAd) {
                notifyListeners("interstitialShowed", new JSObject());
            }

            @Override
            public void onAdHidden(@NonNull MaxAd maxAd) {
                notifyListeners("interstitialDismissed", new JSObject());
                if (interstitialAd != null) interstitialAd.loadAd();
            }

            @Override
            public void onAdClicked(@NonNull MaxAd maxAd) {}

            @Override
            public void onAdDisplayFailed(@NonNull MaxAd maxAd, @NonNull MaxError error) {
                JSObject data = new JSObject();
                data.put("code", error.getCode());
                data.put("message", error.getMessage());
                notifyListeners("interstitialFailed", data);
                if (interstitialAd != null) interstitialAd.loadAd();
            }
        });

        interstitialAd.setRevenueListener(this);
        interstitialAd.loadAd();
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (interstitialAd == null || !interstitialAd.isReady()) {
                call.reject("Interstitial ad not loaded");
                return;
            }

            interstitialAd.showAd(getActivity());
            call.resolve();
        });
    }

    // ── Rewarded ────────────────────────────────────────────────────────

    @PluginMethod
    public void prepareRewarded(PluginCall call) {
        String adId = call.getString("adId");
        if (adId == null || adId.isEmpty()) {
            call.reject("adId is required");
            return;
        }

        rewardedAdUnitId = adId;

        getActivity().runOnUiThread(() -> {
            try {
                if (rewardedAd != null) {
                    rewardedAd.destroy();
                }

                rewardedAd = MaxRewardedAd.getInstance(adId, getActivity());

                loadRewardedWithAmazon(adId, call);
            } catch (Exception e) {
                Log.e(TAG, "Failed to prepare rewarded", e);
                call.reject("Failed to prepare rewarded");
            }
        });
    }

    private void loadRewardedWithAmazon(String maxAdUnitId, PluginCall call) {
        DTBAdSize adSize = new DTBAdSize.DTBVideo(320, 480, AMAZON_REWARDED_SLOT);
        DTBAdNetworkInfo networkInfo = new DTBAdNetworkInfo(DTBAdNetwork.MAX);
        DTBAdRequest adLoader = new DTBAdRequest(networkInfo);
        adLoader.setSizes(adSize);
        adLoader.loadAd(new DTBAdCallback() {
            @Override
            public void onSuccess(@NonNull DTBAdResponse dtbAdResponse) {
                if (rewardedAd != null) {
                    rewardedAd.setLocalExtraParameter("amazon_ad_response", dtbAdResponse);
                }
                loadRewardedAd(call);
            }

            @Override
            public void onFailure(@NonNull AdError adError) {
                if (rewardedAd != null) {
                    rewardedAd.setLocalExtraParameter("amazon_ad_error", adError);
                }
                loadRewardedAd(call);
            }
        });
    }

    private void loadRewardedAd(PluginCall call) {
        if (rewardedAd == null) return;

        rewardedAd.setListener(new MaxRewardedAdListener() {
            @Override
            public void onAdLoaded(@NonNull MaxAd maxAd) {
                rewardedRetryAttempt = 0;
                notifyListeners("rewardedLoaded", new JSObject());
                if (call != null) call.resolve();
            }

            @Override
            public void onAdLoadFailed(@NonNull String adUnitId, @NonNull MaxError error) {
                rewardedRetryAttempt++;
                long delayMs = TimeUnit.SECONDS.toMillis((long) Math.pow(2, Math.min(6, rewardedRetryAttempt)));
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    if (rewardedAd != null) rewardedAd.loadAd();
                }, delayMs);

                JSObject data = new JSObject();
                data.put("code", error.getCode());
                data.put("message", error.getMessage());
                notifyListeners("rewardedFailed", data);
                if (call != null) call.reject("Failed to load rewarded ad: " + error.getMessage());
            }

            @Override
            public void onAdDisplayed(@NonNull MaxAd maxAd) {
                notifyListeners("rewardedShowed", new JSObject());
            }

            @Override
            public void onAdHidden(@NonNull MaxAd maxAd) {
                notifyListeners("rewardedDismissed", new JSObject());
                if (rewardedAd != null) rewardedAd.loadAd();
            }

            @Override
            public void onAdClicked(@NonNull MaxAd maxAd) {}

            @Override
            public void onAdDisplayFailed(@NonNull MaxAd maxAd, @NonNull MaxError error) {
                JSObject data = new JSObject();
                data.put("code", error.getCode());
                data.put("message", error.getMessage());
                notifyListeners("rewardedFailed", data);
                if (rewardedAd != null) rewardedAd.loadAd();
            }

            @Override
            public void onUserRewarded(@NonNull MaxAd maxAd, @NonNull MaxReward maxReward) {
                JSObject data = new JSObject();
                data.put("type", maxReward.getLabel());
                data.put("amount", maxReward.getAmount());
                notifyListeners("rewardedEarned", data);
            }
        });

        rewardedAd.setRevenueListener(this);
        rewardedAd.loadAd();
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (rewardedAd == null || !rewardedAd.isReady()) {
                call.reject("Rewarded ad not loaded");
                return;
            }

            rewardedAd.showAd(getActivity());
            call.resolve();
        });
    }

    // ── MaxAdRevenueListener ────────────────────────────────────────────

    @Override
    public void onAdRevenuePaid(@NonNull MaxAd maxAd) {
        double revenue = maxAd.getRevenue();
        String networkName = maxAd.getNetworkName();
        String adUnitId = maxAd.getAdUnitId();
        String format = maxAd.getFormat().getLabel();
        String placement = maxAd.getPlacement() != null ? maxAd.getPlacement() : format.toLowerCase();

        trackAdRevenueToAdjust(revenue, "USD", networkName, adUnitId, placement);
    }

    // ── Revenue Tracking ────────────────────────────────────────────────

    private void trackAdRevenueToAdjust(double revenue, String currency, String network, String adUnitId, String placement) {
        Log.d(TAG, String.format("AdRevenue: %.6f %s [%s] network=%s", revenue, currency, placement, network));

        try {
            AdjustAdRevenue adRevenue = new AdjustAdRevenue("applovin_max_sdk");
            adRevenue.setRevenue(revenue, currency);
            adRevenue.setAdRevenueNetwork(network);
            adRevenue.setAdRevenueUnit(adUnitId);
            adRevenue.setAdRevenuePlacement(placement);
            Adjust.trackAdRevenue(adRevenue);
        } catch (Exception e) {
            Log.e(TAG, "Failed to track ad revenue with Adjust", e);
        }

        JSObject data = new JSObject();
        data.put("revenue", revenue);
        data.put("currency", currency);
        data.put("precisionType", 0);
        data.put("adUnitId", adUnitId);
        data.put("placement", placement);
        data.put("network", network);
        data.put("adSourceId", "");
        data.put("adSourceInstanceId", "");
        notifyListeners("adRevenue", data);
    }

    // ── Unused interface methods (required by MaxAdViewAdListener) ──────

    @Override
    public void onAdDisplayed(@NonNull MaxAd maxAd) {}

    @Override
    public void onAdHidden(@NonNull MaxAd maxAd) {}
}
