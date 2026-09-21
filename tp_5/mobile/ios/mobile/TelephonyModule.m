#import <React/RCTBridgeModule.h>

/// Objective-C bridge macro to expose the Swift TelephonyModule to React Native.
/// The module name must match the @objc(TelephonyModule) annotation in the Swift file.
@interface RCT_EXTERN_MODULE(TelephonyModule, NSObject)

RCT_EXTERN_METHOD(getNetworkInfo:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
