import { NativeModules } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { TelephonyInfo, NetworkStateInfo } from '../types';

const { TelephonyModule } = NativeModules;

export class NativeTelephonyService {
  /**
   * Fetches native telephony metrics from Kotlin/Swift native module
   */
  static async getTelephonyInfo(): Promise<TelephonyInfo> {
    if (TelephonyModule?.getNetworkInfo) {
      try {
        const info = await TelephonyModule.getNetworkInfo();
        return {
          operatorName: info.operatorName || 'Unknown Carrier',
          plmn: info.plmn || '',
          networkType: info.networkType || 'Cellular',
          isRoaming: !!info.isRoaming,
          signalLevel: typeof info.signalLevel === 'number' ? info.signalLevel : 3,
          signalDbm: typeof info.signalDbm === 'number' ? info.signalDbm : -85,
        };
      } catch (err) {
        console.warn('[NativeTelephonyService] Failed to query TelephonyModule:', err);
      }
    }

    // Fallback when native module is unavailable (e.g. simulator)
    return {
      operatorName: 'Mobile Network',
      plmn: '722-310',
      networkType: '4G LTE',
      isRoaming: false,
      signalLevel: 4,
      signalDbm: -82,
    };
  }

  /**
   * Combines NetInfo and native telephony into a unified NetworkStateInfo
   */
  static async getCurrentNetworkState(): Promise<NetworkStateInfo> {
    const netState: NetInfoState = await NetInfo.fetch();
    let telephony: TelephonyInfo | undefined;

    if (netState.type === 'cellular') {
      telephony = await this.getTelephonyInfo();
    }

    return {
      isConnected: !!netState.isConnected,
      isInternetReachable: netState.isInternetReachable,
      type: netState.type,
      details: {
        isConnectionExpensive: netState.details ? (netState.details as any).isConnectionExpensive : false,
        cellularGeneration: netState.details ? (netState.details as any).cellularGeneration : null,
        carrier: netState.details ? (netState.details as any).carrier : null,
        ssid: netState.details ? (netState.details as any).ssid : null,
      },
      telephony,
    };
  }

  /**
   * Resolves a human-readable network label / operator.
   * E.g. "Claro AR", "Wi-Fi: Fibertel_5G", or fallback "WLAN / Wi-Fi".
   */
  static resolveNetworkLabel(networkState?: NetworkStateInfo | null): string {
    if (!networkState) return 'WLAN / Wi-Fi';

    if (networkState.type === 'wifi') {
      const rawSsid = networkState.details?.ssid;
      if (rawSsid && rawSsid !== '<unknown ssid>' && rawSsid.trim().length > 0) {
        const cleanSsid = rawSsid.replace(/^"|"$/g, '').trim();
        if (cleanSsid.length > 0 && cleanSsid !== '<unknown ssid>') {
          return cleanSsid;
        }
      }
      return 'WLAN / Wi-Fi';
    }

    return networkState.telephony?.operatorName || 'Cellular';
  }
}
