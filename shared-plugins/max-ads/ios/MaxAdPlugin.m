#import <Capacitor/Capacitor.h>

CAP_PLUGIN(MaxAdPlugin, "MaxAdPlugin",
    CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(showBanner, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(hideBanner, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(removeBanner, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(prepareInterstitial, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(showInterstitial, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(prepareRewarded, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(showRewarded, CAPPluginReturnPromise);
)
