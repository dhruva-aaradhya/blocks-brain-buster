import Foundation
import Capacitor
import AdjustSdk

/// Custom Capacitor plugin for Adjust attribution SDK. Initializes with
/// environment-aware config, tracks typed events, and provides an attribution
/// change delegate.
@objc(AdjustPlugin)
public class AdjustPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AdjustPlugin"
    public let jsName = "AdjustPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trackEvent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "trackAdRevenue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "gdprForgetMe", returnType: CAPPluginReturnPromise),
    ]
    private var isInitialized = false

    @objc func initialize(_ call: CAPPluginCall) {
        guard let appToken = call.getString("appToken"), !appToken.isEmpty else {
            call.reject("App token is required")
            return
        }

        let environment = call.getString("environment") ?? "sandbox"
        let logLevel = call.getString("logLevel") ?? "verbose"

        let adjustEnvironment = environment == "production"
            ? ADJEnvironmentProduction
            : ADJEnvironmentSandbox

        guard let config = ADJConfig(appToken: appToken, environment: adjustEnvironment) else {
            call.reject("Failed to create Adjust config")
            return
        }

        switch logLevel {
        case "verbose": config.logLevel = .verbose
        case "debug":   config.logLevel = .debug
        case "info":    config.logLevel = .info
        case "warn":    config.logLevel = .warn
        case "error":   config.logLevel = .error
        case "suppress": config.logLevel = .suppress
        default: config.logLevel = .verbose
        }

        if let waitInterval = call.getInt("attConsentWaitingInterval"), waitInterval > 0 {
            config.attConsentWaitingInterval = UInt(waitInterval)
        }

        config.delegate = self

        Adjust.initSdk(config)
        isInitialized = true

        call.resolve(["initialized": true])
    }

    @objc func trackEvent(_ call: CAPPluginCall) {
        guard isInitialized else {
            call.reject("Adjust SDK not initialized")
            return
        }

        guard let eventToken = call.getString("eventToken"), !eventToken.isEmpty else {
            call.reject("Event token is required")
            return
        }

        guard let event = ADJEvent(eventToken: eventToken) else {
            call.reject("Failed to create event")
            return
        }

        if let callbackParams = call.getObject("callbackParameters") {
            for (key, value) in callbackParams {
                if let stringValue = value as? String {
                    event.addCallbackParameter(key, value: stringValue)
                }
            }
        }

        if let partnerParams = call.getObject("partnerParameters") {
            for (key, value) in partnerParams {
                if let stringValue = value as? String {
                    event.addPartnerParameter(key, value: stringValue)
                }
            }
        }

        if let revenue = call.getDouble("revenue"), let currency = call.getString("currency") {
            event.setRevenue(revenue, currency: currency)
        }

        Adjust.trackEvent(event)
        call.resolve()
    }

    @objc func trackAdRevenue(_ call: CAPPluginCall) {
        guard isInitialized else {
            call.reject("Adjust SDK not initialized")
            return
        }

        guard let revenue = call.getDouble("revenue") else {
            call.reject("Revenue is required")
            return
        }

        let source = call.getString("source") ?? "admob_sdk"
        let currency = call.getString("currency") ?? "USD"

        guard let adRevenue = ADJAdRevenue(source: source) else {
            call.reject("Failed to create ad revenue object")
            return
        }
        adRevenue.setRevenue(revenue, currency: currency)

        if let count = call.getInt("adImpressionsCount") {
            adRevenue.setAdImpressionsCount(Int32(count))
        }
        if let network = call.getString("adRevenueNetwork") {
            adRevenue.setAdRevenueNetwork(network)
        }
        if let unit = call.getString("adRevenueUnit") {
            adRevenue.setAdRevenueUnit(unit)
        }
        if let placement = call.getString("adRevenuePlacement") {
            adRevenue.setAdRevenuePlacement(placement)
        }

        Adjust.trackAdRevenue(adRevenue)
        call.resolve()
    }

    @objc func isEnabled(_ call: CAPPluginCall) {
        call.resolve(["enabled": isInitialized])
    }

    @objc func setEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? true
        if enabled {
            Adjust.enable()
        } else {
            Adjust.disable()
        }
        call.resolve()
    }

    @objc func gdprForgetMe(_ call: CAPPluginCall) {
        Adjust.gdprForgetMe()
        call.resolve()
    }
}

extension AdjustPlugin: AdjustDelegate {
    public func adjustAttributionChanged(_ attribution: ADJAttribution?) {
        guard let attribution = attribution else { return }
        notifyListeners("attributionChanged", data: [
            "trackerToken": attribution.trackerToken ?? "",
            "trackerName": attribution.trackerName ?? "",
            "network": attribution.network ?? "",
            "campaign": attribution.campaign ?? "",
            "adgroup": attribution.adgroup ?? "",
            "creative": attribution.creative ?? "",
            "clickLabel": attribution.clickLabel ?? ""
        ])
    }
}
