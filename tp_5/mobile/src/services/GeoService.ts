import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { GeoCoordinates } from '../types';

export class GeoService {
  /**
   * Requests runtime location permission on Android
   */
  public static async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Permiso de Ubicación QoS',
          message: 'Se requiere acceso GPS para georreferenciar las mediciones de calidad de red.',
          buttonPositive: 'Aceptar',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    return true;
  }

  /**
   * Obtains current device GPS coordinates
   */
  public static async getCurrentLocation(): Promise<GeoCoordinates> {
    const hasPermission = await this.requestPermission();

    if (!hasPermission) {
      return this.getFallbackLocation();
    }

    return new Promise<GeoCoordinates>((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
        },
        (_error) => {
          resolve(this.getFallbackLocation());
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }

  private static getFallbackLocation(): GeoCoordinates {
    // Default reference coordinates (Buenos Aires Obelisco / Center)
    return {
      latitude: -34.603722,
      longitude: -58.381592,
      altitude: 28.2,
      accuracy: 2.4,
      timestamp: Date.now(),
    };
  }
}
