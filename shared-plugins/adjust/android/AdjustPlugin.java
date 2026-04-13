// TODO: Change this package to match your project
package com.yourpackage;

import android.util.Log;

import com.adjust.sdk.Adjust;
import com.adjust.sdk.AdjustAdRevenue;
import com.adjust.sdk.AdjustConfig;
import com.adjust.sdk.AdjustEvent;
import com.adjust.sdk.LogLevel;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Iterator;

/**
 * Custom Capacitor plugin for Adjust attribution SDK. Initializes with
 * environment-aware config, tracks typed events with optional callback
 * parameters and revenue, and emits attribution changes to JS.
 */
@CapacitorPlugin(name = "AdjustPlugin")
public class AdjustPlugin extends Plugin {
    private static final String TAG = "AdjustPlugin";
    private boolean isInitialized = false;
    private boolean isDebugMode = false;

    @PluginMethod
    public void initialize(PluginCall call) {
        String appToken = call.getString("appToken");
        String environment = call.getString("environment", "sandbox");
        String logLevel = call.getString("logLevel", "verbose");

        if (appToken == null || appToken.isEmpty()) {
            call.reject("App token is required");
            return;
        }

        try {
            String adjustEnvironment = environment.equals("production") 
                ? AdjustConfig.ENVIRONMENT_PRODUCTION 
                : AdjustConfig.ENVIRONMENT_SANDBOX;

            AdjustConfig config = new AdjustConfig(getContext(), appToken, adjustEnvironment);
            
            isDebugMode = environment.equals("sandbox");
            switch (logLevel) {
                case "verbose":
                    config.setLogLevel(LogLevel.VERBOSE);
                    break;
                case "debug":
                    config.setLogLevel(LogLevel.DEBUG);
                    break;
                case "info":
                    config.setLogLevel(LogLevel.INFO);
                    break;
                case "warn":
                    config.setLogLevel(LogLevel.WARN);
                    break;
                case "error":
                    config.setLogLevel(LogLevel.ERROR);
                    break;
                case "suppress":
                    config.setLogLevel(LogLevel.SUPRESS);
                    isDebugMode = false;
                    break;
                default:
                    config.setLogLevel(LogLevel.VERBOSE);
            }

            config.setOnAttributionChangedListener(attribution -> {
                if (isDebugMode) {
                    Log.d(TAG, "Attribution changed");
                }
                JSObject data = new JSObject();
                data.put("trackerToken", attribution.trackerToken);
                data.put("trackerName", attribution.trackerName);
                data.put("network", attribution.network);
                data.put("campaign", attribution.campaign);
                data.put("adgroup", attribution.adgroup);
                data.put("creative", attribution.creative);
                data.put("clickLabel", attribution.clickLabel);
                notifyListeners("attributionChanged", data);
            });

            Adjust.initSdk(config);
            isInitialized = true;

            if (isDebugMode) {
                Log.d(TAG, "Adjust SDK initialized successfully");
            }
            
            JSObject result = new JSObject();
            result.put("initialized", true);
            call.resolve(result);
        } catch (Exception e) {
            if (isDebugMode) {
                Log.e(TAG, "Failed to initialize Adjust SDK", e);
            }
            call.reject("Failed to initialize Adjust SDK");
        }
    }

    @PluginMethod
    public void trackEvent(PluginCall call) {
        if (!isInitialized) {
            call.reject("Adjust SDK not initialized");
            return;
        }

        String eventToken = call.getString("eventToken");
        if (eventToken == null || eventToken.isEmpty()) {
            call.reject("Event token is required");
            return;
        }

        try {
            AdjustEvent event = new AdjustEvent(eventToken);

            JSObject callbackParams = call.getObject("callbackParameters");
            if (callbackParams != null) {
                Iterator<String> callbackKeys = callbackParams.keys();
                while (callbackKeys.hasNext()) {
                    String key = callbackKeys.next();
                    event.addCallbackParameter(key, callbackParams.getString(key));
                }
            }

            JSObject partnerParams = call.getObject("partnerParameters");
            if (partnerParams != null) {
                Iterator<String> partnerKeys = partnerParams.keys();
                while (partnerKeys.hasNext()) {
                    String key = partnerKeys.next();
                    event.addPartnerParameter(key, partnerParams.getString(key));
                }
            }

            Double revenue = call.getDouble("revenue");
            String currency = call.getString("currency");
            if (revenue != null && currency != null) {
                event.setRevenue(revenue, currency);
            }

            Adjust.trackEvent(event);
            
            if (isDebugMode) {
                Log.d(TAG, "Event tracked");
            }
            call.resolve();
        } catch (Exception e) {
            if (isDebugMode) {
                Log.e(TAG, "Failed to track event", e);
            }
            call.reject("Failed to track event");
        }
    }

    @PluginMethod
    public void trackAdRevenue(PluginCall call) {
        if (!isInitialized) {
            call.reject("Adjust SDK not initialized");
            return;
        }

        String source = call.getString("source", "admob_sdk");
        Double revenue = call.getDouble("revenue");
        String currency = call.getString("currency", "USD");

        if (revenue == null) {
            call.reject("Revenue is required");
            return;
        }

        try {
            AdjustAdRevenue adRevenue = new AdjustAdRevenue(source);
            adRevenue.setRevenue(revenue, currency);

            Integer adImpressionsCount = call.getInt("adImpressionsCount");
            if (adImpressionsCount != null) {
                adRevenue.setAdImpressionsCount(adImpressionsCount);
            }

            String adRevenueNetwork = call.getString("adRevenueNetwork");
            if (adRevenueNetwork != null) {
                adRevenue.setAdRevenueNetwork(adRevenueNetwork);
            }

            String adRevenueUnit = call.getString("adRevenueUnit");
            if (adRevenueUnit != null) {
                adRevenue.setAdRevenueUnit(adRevenueUnit);
            }

            String adRevenuePlacement = call.getString("adRevenuePlacement");
            if (adRevenuePlacement != null) {
                adRevenue.setAdRevenuePlacement(adRevenuePlacement);
            }

            Adjust.trackAdRevenue(adRevenue);
            
            if (isDebugMode) {
                Log.d(TAG, "Ad revenue tracked");
            }
            call.resolve();
        } catch (Exception e) {
            if (isDebugMode) {
                Log.e(TAG, "Failed to track ad revenue", e);
            }
            call.reject("Failed to track ad revenue");
        }
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", isInitialized);
        call.resolve(result);
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);
        
        if (enabled) {
            Adjust.enable();
        } else {
            Adjust.disable();
        }
        
        call.resolve();
    }

    @PluginMethod
    public void gdprForgetMe(PluginCall call) {
        Adjust.gdprForgetMe(getContext());
        call.resolve();
    }
}
