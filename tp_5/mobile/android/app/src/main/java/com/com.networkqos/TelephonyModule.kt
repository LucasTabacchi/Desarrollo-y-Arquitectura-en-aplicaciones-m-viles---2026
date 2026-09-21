package com.networkqos

import android.content.Context
import android.os.Build
import android.telephony.CellInfo
import android.telephony.CellInfoGsm
import android.telephony.CellInfoLte
import android.telephony.CellInfoNr
import android.telephony.CellInfoWcdma
import android.telephony.CellSignalStrength
import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap

class TelephonyModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "TelephonyModule"
    }

    @ReactMethod
    fun getNetworkInfo(promise: Promise) {
        try {
            val telephonyManager =
                reactContext.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

            if (telephonyManager == null) {
                promise.reject("TELEPHONY_ERROR", "TelephonyManager is not available on this device")
                return
            }

            val result: WritableMap = Arguments.createMap()

            // 1. Operator Name
            var operatorName = telephonyManager.networkOperatorName
            if (operatorName.isNullOrEmpty()) {
                operatorName = telephonyManager.simOperatorName
            }
            if (operatorName.isNullOrEmpty()) {
                operatorName = "Unknown Carrier"
            }
            result.putString("operatorName", operatorName)

            // 2. PLMN (MCC + MNC)
            val plmn = telephonyManager.networkOperator ?: ""
            result.putString("plmn", plmn)

            // 3. Network Type (Mobile RAT)
            val networkType = resolveNetworkType(telephonyManager)
            result.putString("networkType", networkType)

            // 4. Roaming
            result.putBoolean("isRoaming", telephonyManager.isNetworkRoaming)

            // 5. Signal Level & RSSI / RSRP in dBm
            var signalLevel = 0
            var signalDbm = -999

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val signalStrength: SignalStrength? = telephonyManager.signalStrength
                if (signalStrength != null) {
                    signalLevel = signalStrength.level // 0..4
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        for (cellSignal in signalStrength.cellSignalStrengths) {
                            if (cellSignal.dbm != CellInfo.UNAVAILABLE) {
                                signalDbm = cellSignal.dbm
                                break
                            }
                        }
                    }
                }
            }

            result.putInt("signalLevel", signalLevel) // 0 to 4
            result.putInt("signalDbm", signalDbm)     // in dBm (e.g. -85)

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("TELEPHONY_EXCEPTION", e.message, e)
        }
    }

    private fun resolveNetworkType(telephonyManager: TelephonyManager): String {
        val type = try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                telephonyManager.dataNetworkType
            } else {
                telephonyManager.networkType
            }
        } catch (e: SecurityException) {
            TelephonyManager.NETWORK_TYPE_UNKNOWN
        }

        return when (type) {
            TelephonyManager.NETWORK_TYPE_NR -> "5G NR"
            TelephonyManager.NETWORK_TYPE_LTE -> "4G LTE"
            TelephonyManager.NETWORK_TYPE_HSPAP,
            TelephonyManager.NETWORK_TYPE_HSPA,
            TelephonyManager.NETWORK_TYPE_HSUPA,
            TelephonyManager.NETWORK_TYPE_HSDPA,
            TelephonyManager.NETWORK_TYPE_UMTS -> "3G HSPA"
            TelephonyManager.NETWORK_TYPE_EDGE -> "2G EDGE"
            TelephonyManager.NETWORK_TYPE_GPRS -> "2G GPRS"
            TelephonyManager.NETWORK_TYPE_UNKNOWN -> "Cellular (Standby)"
            else -> "Cellular ($type)"
        }
    }
}
