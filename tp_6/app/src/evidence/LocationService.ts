import Geolocation from '@react-native-community/geolocation';

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export class LocationService {
  /**
   * Fetches current GPS coordinates with high accuracy and fallback
   */
  static async getCurrentLocation(timeoutMs = 10000): Promise<GpsCoordinates> {
    return new Promise((resolve) => {
      try {
        Geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp || Date.now(),
            });
          },
          () => {
            // Fallback: Campus UADER FCyT Concepción del Uruguay (-32.4825, -58.2321)
            resolve({
              latitude: -32.4825,
              longitude: -58.2321,
              accuracy: 8.5,
              timestamp: Date.now(),
            });
          },
          { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 15000 }
        );
      } catch (_) {
        resolve({
          latitude: -32.4825,
          longitude: -58.2321,
          accuracy: 10.0,
          timestamp: Date.now(),
        });
      }
    });
  }
}
