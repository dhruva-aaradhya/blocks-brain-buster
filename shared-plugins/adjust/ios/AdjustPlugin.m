#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AdjustPlugin, "AdjustPlugin",
    CAP_PLUGIN_METHOD(initialize, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(trackEvent, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(trackAdRevenue, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isEnabled, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setEnabled, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(gdprForgetMe, CAPPluginReturnPromise);
)
