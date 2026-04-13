import Foundation
import Capacitor
import AppLovinSDK
import DTBiOSSDK
import AdjustSdk

/// Custom Capacitor plugin for AppLovin MAX ads with Amazon APS header bidding.
/// Manages banner, interstitial, and rewarded ads. Includes a pending banner queue
/// (banners deferred during fullscreen ads, flushed 1.5s after dismissal). Uses
/// separate delegate classes for interstitial/rewarded due to AppLovin's weak
/// delegate references.
@objc(MaxAdPlugin)
public class MaxAdPlugin: CAPPlugin, CAPBridgedPlugin, MAAdViewAdDelegate, MAAdRevenueDelegate {
    public let identifier = "MaxAdPlugin"
    public let jsName = "MaxAdPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showBanner", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hideBanner", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeBanner", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareInterstitial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showInterstitial", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepareRewarded", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showRewarded", returnType: CAPPluginReturnPromise),
    ]

    // TODO: Replace these with your own keys from the AppLovin and Amazon dashboards
    private let maxSdkKey = "YOUR_MAX_SDK_KEY"
    private let amazonAppKey = "YOUR_AMAZON_APP_KEY"
    private let amazonBannerSlot = "YOUR_AMAZON_BANNER_SLOT"
    private let amazonInterstitialSlot = "YOUR_AMAZON_INTERSTITIAL_SLOT"
    private let amazonRewardedSlot = "YOUR_AMAZON_REWARDED_SLOT"

    fileprivate var bannerAdView: MAAdView?
    fileprivate var interstitialAd: MAInterstitialAd?
    fileprivate var rewardedAd: MARewardedAd?
    private var isSdkInitialized = false

    fileprivate var interstitialRetryAttempt = 0
    fileprivate var rewardedRetryAttempt = 0

    fileprivate var interstitialLoadCall: CAPPluginCall?
    fileprivate var rewardedLoadCall: CAPPluginCall?

    fileprivate var isInterstitialDisplaying = false
    fileprivate var isRewardedDisplaying = false
    private var isFullscreenAdDisplaying: Bool { isInterstitialDisplaying || isRewardedDisplaying }
    private var pendingBannerCall: (adId: String, position: String)?

    private var interstitialDelegate: InterstitialDelegate?
    private var rewardedDelegate: RewardedDelegate?

    private var keyWindow: UIWindow? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow }
    }

    // MARK: - Initialization

    @objc func initialize(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            DTBAds.sharedInstance().setAppKey(self.amazonAppKey)
            DTBAds.sharedInstance().mraidPolicy = CUSTOM_MRAID
            DTBAds.sharedInstance().mraidCustomVersions = ["1.0", "2.0", "3.0"]

            let initConfig = ALSdkInitializationConfiguration(sdkKey: self.maxSdkKey) { builder in
                builder.mediationProvider = ALMediationProviderMAX
            }

            ALSdk.shared().initialize(with: initConfig) { [weak self] _ in
                self?.isSdkInitialized = true
                call.resolve(["initialized": true])
            }
        }
    }

    // MARK: - Banner

    @objc func showBanner(_ call: CAPPluginCall) {
        guard let adId = call.getString("adId"), !adId.isEmpty else {
            call.reject("adId is required")
            return
        }
        let position = call.getString("position") ?? "bottom"

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if self.isFullscreenAdDisplaying {
                self.pendingBannerCall = (adId: adId, position: position)
                call.resolve()
                return
            }

            if let existing = self.bannerAdView {
                if !existing.isHidden {
                    call.resolve()
                    return
                }
                existing.isHidden = false
                self.notifyListeners("bannerLoaded", data: [:])
                call.resolve()
                return
            }

            let config = MAAdViewConfiguration(builderBlock: { builder in
                builder.adaptiveType = .anchored
            })
            let adView = MAAdView(adUnitIdentifier: adId, configuration: config)
            self.bannerAdView = adView
            adView.delegate = self
            adView.revenueDelegate = self
            adView.backgroundColor = .clear

            let adHeight: CGFloat = MAAdFormat.banner.adaptiveSize.height
            let bannerWidth = min(UIScreen.main.bounds.width, UIScreen.main.bounds.height)

            adView.frame = CGRect(x: 0, y: 0, width: bannerWidth, height: adHeight)

            guard let window = self.keyWindow else {
                call.reject("No key window found")
                return
            }

            window.addSubview(adView)
            adView.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                adView.centerXAnchor.constraint(equalTo: window.centerXAnchor),
                adView.widthAnchor.constraint(equalToConstant: bannerWidth),
                adView.heightAnchor.constraint(equalToConstant: adHeight),
                position == "top"
                    ? adView.topAnchor.constraint(equalTo: window.safeAreaLayoutGuide.topAnchor)
                    : adView.bottomAnchor.constraint(equalTo: window.bottomAnchor)
            ])

            self.loadBannerWithAmazon(adId: adId)
            call.resolve()
        }
    }

    private func loadBannerWithAmazon(adId: String) {
        let adSize = DTBAdSize(bannerAdSizeWithWidth: 320, height: 50, andSlotUUID: amazonBannerSlot)
        let networkInfo = DTBAdNetworkInfo(networkName: DTBADNETWORK_MAX)
        let adLoader = DTBAdLoader(adNetworkInfo: networkInfo)
        adLoader.setAdSizes([adSize])
        adLoader.loadAd(BannerAmazonCallback(plugin: self, adId: adId))
    }

    @objc func hideBanner(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.bannerAdView?.isHidden = true
            call.resolve()
        }
    }

    @objc func removeBanner(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.removeBannerViewIfExists()
            call.resolve()
        }
    }

    private func removeBannerViewIfExists() {
        bannerAdView?.delegate = nil
        bannerAdView?.revenueDelegate = nil
        bannerAdView?.removeFromSuperview()
        bannerAdView = nil
    }

    fileprivate func flushPendingBanner() {
        guard let pending = pendingBannerCall else { return }
        pendingBannerCall = nil

        if let existing = bannerAdView {
            existing.isHidden = false
            notifyListeners("bannerLoaded", data: [:])
            return
        }

        let config = MAAdViewConfiguration(builderBlock: { builder in
            builder.adaptiveType = .anchored
        })
        let adView = MAAdView(adUnitIdentifier: pending.adId, configuration: config)
        bannerAdView = adView
        adView.delegate = self
        adView.revenueDelegate = self
        adView.backgroundColor = .clear

        let adHeight: CGFloat = MAAdFormat.banner.adaptiveSize.height
        let bannerWidth = min(UIScreen.main.bounds.width, UIScreen.main.bounds.height)
        adView.frame = CGRect(x: 0, y: 0, width: bannerWidth, height: adHeight)

        guard let window = keyWindow else { return }

        window.addSubview(adView)
        adView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            adView.centerXAnchor.constraint(equalTo: window.centerXAnchor),
            adView.widthAnchor.constraint(equalToConstant: bannerWidth),
            adView.heightAnchor.constraint(equalToConstant: adHeight),
            pending.position == "top"
                ? adView.topAnchor.constraint(equalTo: window.safeAreaLayoutGuide.topAnchor)
                : adView.bottomAnchor.constraint(equalTo: window.bottomAnchor)
        ])

        loadBannerWithAmazon(adId: pending.adId)
    }

    // MARK: - MAAdViewAdDelegate (Banner)

    public func didLoad(_ ad: MAAd) {
        notifyListeners("bannerLoaded", data: [:])
    }

    public func didFailToLoadAd(forAdUnitIdentifier adUnitIdentifier: String, withError error: MAError) {
        notifyListeners("bannerFailed", data: ["code": error.code.rawValue, "message": error.message])
    }

    public func didDisplay(_ ad: MAAd) {}

    public func didHide(_ ad: MAAd) {}

    public func didClick(_ ad: MAAd) {}

    public func didExpand(_ ad: MAAd) {
        notifyListeners("bannerOpened", data: [:])
    }

    public func didCollapse(_ ad: MAAd) {
        notifyListeners("bannerClosed", data: [:])
    }

    public func didFail(toDisplay ad: MAAd, withError error: MAError) {
        let format = ad.format.label.uppercased()
        let data: [String: Any] = ["code": error.code.rawValue, "message": error.message]

        if format == "INTER" {
            notifyListeners("interstitialFailed", data: data)
            interstitialAd?.load()
        } else if format == "REWARDED" {
            notifyListeners("rewardedFailed", data: data)
            rewardedAd?.load()
        }
    }

    // MARK: - Interstitial

    @objc func prepareInterstitial(_ call: CAPPluginCall) {
        guard let adId = call.getString("adId"), !adId.isEmpty else {
            call.reject("adId is required")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.interstitialAd = MAInterstitialAd(adUnitIdentifier: adId)
            self.interstitialLoadCall = call
            self.loadInterstitialWithAmazon(adId: adId)
        }
    }

    private func loadInterstitialWithAmazon(adId: String) {
        let adSize = DTBAdSize(interstitialAdSizeWithSlotUUID: amazonInterstitialSlot)
        let networkInfo = DTBAdNetworkInfo(networkName: DTBADNETWORK_MAX)
        let adLoader = DTBAdLoader(adNetworkInfo: networkInfo)
        adLoader.setAdSizes([adSize])
        adLoader.loadAd(InterstitialAmazonCallback(plugin: self))
    }

    func finishLoadingInterstitial(amazonResponse: DTBAdResponse?) {
        guard let interstitialAd = interstitialAd else { return }

        if let response = amazonResponse {
            interstitialAd.setLocalExtraParameterForKey("amazon_ad_response", value: response)
        }

        self.interstitialDelegate = InterstitialDelegate(plugin: self)
        interstitialAd.delegate = self.interstitialDelegate
        interstitialAd.revenueDelegate = self
        interstitialAd.load()
    }

    func finishLoadingInterstitial(amazonError: DTBAdError) {
        guard let interstitialAd = interstitialAd else { return }
        interstitialAd.setLocalExtraParameterForKey("amazon_ad_error", value: NSNumber(value: amazonError.rawValue))
        self.interstitialDelegate = InterstitialDelegate(plugin: self)
        interstitialAd.delegate = self.interstitialDelegate
        interstitialAd.revenueDelegate = self
        interstitialAd.load()
    }

    @objc func showInterstitial(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let ad = self.interstitialAd, ad.isReady else {
                call.reject("Interstitial ad not loaded")
                return
            }
            ad.show()
            call.resolve()
        }
    }

    // MARK: - Rewarded

    @objc func prepareRewarded(_ call: CAPPluginCall) {
        guard let adId = call.getString("adId"), !adId.isEmpty else {
            call.reject("adId is required")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.rewardedAd = MARewardedAd.shared(withAdUnitIdentifier: adId)
            self.rewardedLoadCall = call
            self.loadRewardedWithAmazon(adId: adId)
        }
    }

    private func loadRewardedWithAmazon(adId: String) {
        let adSize = DTBAdSize(videoAdSizeWithPlayerWidth: 320, height: 480, andSlotUUID: amazonRewardedSlot)
        let networkInfo = DTBAdNetworkInfo(networkName: DTBADNETWORK_MAX)
        let adLoader = DTBAdLoader(adNetworkInfo: networkInfo)
        adLoader.setAdSizes([adSize])
        adLoader.loadAd(RewardedAmazonCallback(plugin: self))
    }

    func finishLoadingRewarded(amazonResponse: DTBAdResponse?) {
        guard let rewardedAd = rewardedAd else { return }

        if let response = amazonResponse {
            rewardedAd.setLocalExtraParameterForKey("amazon_ad_response", value: response)
        }

        self.rewardedDelegate = RewardedDelegate(plugin: self)
        rewardedAd.delegate = self.rewardedDelegate
        rewardedAd.revenueDelegate = self
        rewardedAd.load()
    }

    func finishLoadingRewarded(amazonError: DTBAdError) {
        guard let rewardedAd = rewardedAd else { return }
        rewardedAd.setLocalExtraParameterForKey("amazon_ad_error", value: NSNumber(value: amazonError.rawValue))
        self.rewardedDelegate = RewardedDelegate(plugin: self)
        rewardedAd.delegate = self.rewardedDelegate
        rewardedAd.revenueDelegate = self
        rewardedAd.load()
    }

    @objc func showRewarded(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, let ad = self.rewardedAd, ad.isReady else {
                call.reject("Rewarded ad not loaded")
                return
            }
            ad.show()
            call.resolve()
        }
    }

    // MARK: - MAAdRevenueDelegate

    public func didPayRevenue(for ad: MAAd) {
        let revenue = ad.revenue
        let networkName = ad.networkName
        let adUnitId = ad.adUnitIdentifier
        let format = ad.format.label
        let placement = ad.placement ?? format.lowercased()

        trackAdRevenueToAdjust(revenue: revenue, currency: "USD", network: networkName, adUnitId: adUnitId, placement: placement)
    }

    // MARK: - Revenue Tracking

    private func trackAdRevenueToAdjust(revenue: Double, currency: String, network: String, adUnitId: String, placement: String) {
        if let adRevenue = ADJAdRevenue(source: "applovin_max_sdk") {
            adRevenue.setRevenue(revenue, currency: currency)
            adRevenue.setAdRevenueNetwork(network)
            adRevenue.setAdRevenueUnit(adUnitId)
            adRevenue.setAdRevenuePlacement(placement)
            Adjust.trackAdRevenue(adRevenue)
        }

        notifyListeners("adRevenue", data: [
            "revenue": revenue,
            "currency": currency,
            "precisionType": 0,
            "adUnitId": adUnitId,
            "placement": placement,
            "network": network,
            "adSourceId": "",
            "adSourceInstanceId": ""
        ])
    }
}

// MARK: - Amazon APS Callbacks

private class BannerAmazonCallback: NSObject, DTBAdCallback {
    weak var plugin: MaxAdPlugin?
    let adId: String

    init(plugin: MaxAdPlugin, adId: String) {
        self.plugin = plugin
        self.adId = adId
    }

    func onSuccess(_ adResponse: DTBAdResponse!) {
        plugin?.bannerAdView?.setLocalExtraParameterForKey("amazon_ad_response", value: adResponse as Any)
        plugin?.bannerAdView?.loadAd()
    }

    func onFailure(_ error: DTBAdError) {
        plugin?.bannerAdView?.setLocalExtraParameterForKey("amazon_ad_error", value: NSNumber(value: error.rawValue))
        plugin?.bannerAdView?.loadAd()
    }
}

private class InterstitialAmazonCallback: NSObject, DTBAdCallback {
    weak var plugin: MaxAdPlugin?

    init(plugin: MaxAdPlugin) {
        self.plugin = plugin
    }

    func onSuccess(_ adResponse: DTBAdResponse!) {
        plugin?.finishLoadingInterstitial(amazonResponse: adResponse)
    }

    func onFailure(_ error: DTBAdError) {
        plugin?.finishLoadingInterstitial(amazonError: error)
    }
}

private class RewardedAmazonCallback: NSObject, DTBAdCallback {
    weak var plugin: MaxAdPlugin?

    init(plugin: MaxAdPlugin) {
        self.plugin = plugin
    }

    func onSuccess(_ adResponse: DTBAdResponse!) {
        plugin?.finishLoadingRewarded(amazonResponse: adResponse)
    }

    func onFailure(_ error: DTBAdError) {
        plugin?.finishLoadingRewarded(amazonError: error)
    }
}

// MARK: - Interstitial Delegate

private class InterstitialDelegate: NSObject, MAAdDelegate {
    weak var plugin: MaxAdPlugin?

    init(plugin: MaxAdPlugin) {
        self.plugin = plugin
    }

    func didLoad(_ ad: MAAd) {
        plugin?.interstitialRetryAttempt = 0
        plugin?.notifyListeners("interstitialLoaded", data: [:])
        plugin?.interstitialLoadCall?.resolve()
        plugin?.interstitialLoadCall = nil
    }

    func didFailToLoadAd(forAdUnitIdentifier adUnitIdentifier: String, withError error: MAError) {
        guard let plugin = plugin else { return }
        plugin.interstitialRetryAttempt += 1
        let delay = pow(2.0, min(6, Double(plugin.interstitialRetryAttempt)))
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            plugin.interstitialAd?.load()
        }
        plugin.notifyListeners("interstitialFailed", data: ["code": error.code.rawValue, "message": error.message])
        plugin.interstitialLoadCall?.reject("Failed to load interstitial: \(error.message)")
        plugin.interstitialLoadCall = nil
    }

    func didDisplay(_ ad: MAAd) {
        plugin?.isInterstitialDisplaying = true
        plugin?.notifyListeners("interstitialShowed", data: [:])
    }

    func didHide(_ ad: MAAd) {
        plugin?.isInterstitialDisplaying = false
        plugin?.notifyListeners("interstitialDismissed", data: [:])
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.plugin?.interstitialAd?.load()
            self?.plugin?.flushPendingBanner()
        }
    }

    func didClick(_ ad: MAAd) {}

    func didFail(toDisplay ad: MAAd, withError error: MAError) {
        plugin?.isInterstitialDisplaying = false
        plugin?.notifyListeners("interstitialFailed", data: ["code": error.code.rawValue, "message": error.message])
        plugin?.interstitialAd?.load()
        plugin?.flushPendingBanner()
    }
}

// MARK: - Rewarded Delegate

private class RewardedDelegate: NSObject, MARewardedAdDelegate {
    weak var plugin: MaxAdPlugin?

    init(plugin: MaxAdPlugin) {
        self.plugin = plugin
    }

    func didLoad(_ ad: MAAd) {
        plugin?.rewardedRetryAttempt = 0
        plugin?.notifyListeners("rewardedLoaded", data: [:])
        plugin?.rewardedLoadCall?.resolve()
        plugin?.rewardedLoadCall = nil
    }

    func didFailToLoadAd(forAdUnitIdentifier adUnitIdentifier: String, withError error: MAError) {
        guard let plugin = plugin else { return }
        plugin.rewardedRetryAttempt += 1
        let delay = pow(2.0, min(6, Double(plugin.rewardedRetryAttempt)))
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            plugin.rewardedAd?.load()
        }
        plugin.notifyListeners("rewardedFailed", data: ["code": error.code.rawValue, "message": error.message])
        plugin.rewardedLoadCall?.reject("Failed to load rewarded ad: \(error.message)")
        plugin.rewardedLoadCall = nil
    }

    func didDisplay(_ ad: MAAd) {
        plugin?.isRewardedDisplaying = true
        plugin?.notifyListeners("rewardedShowed", data: [:])
    }

    func didHide(_ ad: MAAd) {
        plugin?.isRewardedDisplaying = false
        plugin?.notifyListeners("rewardedDismissed", data: [:])
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.plugin?.rewardedAd?.load()
            self?.plugin?.flushPendingBanner()
        }
    }

    func didClick(_ ad: MAAd) {}

    func didFail(toDisplay ad: MAAd, withError error: MAError) {
        plugin?.isRewardedDisplaying = false
        plugin?.notifyListeners("rewardedFailed", data: ["code": error.code.rawValue, "message": error.message])
        plugin?.rewardedAd?.load()
        plugin?.flushPendingBanner()
    }

    func didRewardUser(for ad: MAAd, with reward: MAReward) {
        plugin?.notifyListeners("rewardedEarned", data: [
            "type": reward.label,
            "amount": reward.amount
        ])
    }

    func didStartRewardedVideo(for ad: MAAd) {}
    func didCompleteRewardedVideo(for ad: MAAd) {}
}
