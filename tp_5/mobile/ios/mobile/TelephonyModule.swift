import Foundation
import CoreTelephony
import React

/// Native iOS module that exposes CoreTelephony data to React Native.
/// Mirrors the Android TelephonyModule.kt interface for cross-platform parity.
@objc(TelephonyModule)
class TelephonyModule: NSObject {

  private let networkInfo = CTTelephonyNetworkInfo()

  /// React Native requires modules to be initialized on the main queue.
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// Returns current telephony state as a dictionary matching the Android module shape:
  /// { operatorName, plmn, networkType, isRoaming, signalLevel, signalDbm }
  @objc
  func getNetworkInfo(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    var result: [String: Any] = [:]

    // Carrier info (deprecated in iOS 16.4 but still functional for basic data)
    if let carrier = networkInfo.serviceSubscriberCellularProviders?.values.first {
      result["operatorName"] = carrier.carrierName ?? "Unknown Carrier"
      let mcc = carrier.mobileCountryCode ?? "000"
      let mnc = carrier.mobileNetworkCode ?? "00"
      result["plmn"] = "\(mcc)-\(mnc)"
      result["isRoaming"] = false // CTCarrier doesn't expose roaming directly
    } else {
      result["operatorName"] = "No SIM"
      result["plmn"] = "000-00"
      result["isRoaming"] = false
    }

    // Radio Access Technology (RAT) mapping
    if let currentRadio = networkInfo.serviceCurrentRadioAccessTechnology?.values.first {
      result["networkType"] = mapRadioToNetworkType(currentRadio)
    } else {
      result["networkType"] = "UNKNOWN"
    }

    // Signal strength (iOS doesn't expose dBm directly via public APIs)
    // We provide estimated values based on the radio technology
    result["signalLevel"] = estimateSignalLevel()
    result["signalDbm"] = estimateSignalDbm()

    resolve(result)
  }

  /// Maps CTRadioAccessTechnology constants to human-readable network types
  /// matching the Android module's output format.
  private func mapRadioToNetworkType(_ radio: String) -> String {
    switch radio {
    case CTRadioAccessTechnologyGPRS,
         CTRadioAccessTechnologyEdge:
      return "2G EDGE"
    case CTRadioAccessTechnologyWCDMA,
         CTRadioAccessTechnologyHSDPA,
         CTRadioAccessTechnologyHSUPA,
         CTRadioAccessTechnologyCDMA1x,
         CTRadioAccessTechnologyCDMAEVDORev0,
         CTRadioAccessTechnologyCDMAEVDORevA,
         CTRadioAccessTechnologyCDMAEVDORevB,
         CTRadioAccessTechnologyeHRPD:
      return "3G HSPA"
    case CTRadioAccessTechnologyLTE:
      return "4G LTE"
    default:
      // iOS 14.1+ includes CTRadioAccessTechnologyNRNSA and CTRadioAccessTechnologyNR
      if #available(iOS 14.1, *) {
        if radio == CTRadioAccessTechnologyNRNSA || radio == CTRadioAccessTechnologyNR {
          return "5G NR"
        }
      }
      return "UNKNOWN"
    }
  }

  /// Estimates signal bars (0-4) using a heuristic since iOS doesn't expose this.
  /// Returns a reasonable default for demonstration purposes.
  private func estimateSignalLevel() -> Int {
    // Without private APIs, we estimate based on radio type
    if let radio = networkInfo.serviceCurrentRadioAccessTechnology?.values.first {
      if radio == CTRadioAccessTechnologyLTE {
        return 3 // LTE typically shows good signal
      }
      if #available(iOS 14.1, *) {
        if radio == CTRadioAccessTechnologyNRNSA || radio == CTRadioAccessTechnologyNR {
          return 4 // 5G typically shows strong signal
        }
      }
      return 2 // 3G/2G shows moderate
    }
    return 0
  }

  /// Estimates signal dBm. Real values would require private APIs or carrier-specific entitlements.
  private func estimateSignalDbm() -> Int {
    if let radio = networkInfo.serviceCurrentRadioAccessTechnology?.values.first {
      if radio == CTRadioAccessTechnologyLTE {
        return -85 // Typical LTE RSRP
      }
      if #available(iOS 14.1, *) {
        if radio == CTRadioAccessTechnologyNRNSA || radio == CTRadioAccessTechnologyNR {
          return -78 // Typical NR SS-RSRP
        }
      }
      return -95 // Typical 3G RSCP
    }
    return -110
  }
}
