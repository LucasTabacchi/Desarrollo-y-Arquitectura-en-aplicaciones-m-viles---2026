/**
 * Geodetic and geospatial calculation utilities for QoS RF mapping
 */

export class GeodeticUtils {
  /**
   * Converts decimal coordinates to DMS (Degrees, Minutes, Seconds) notation
   * e.g. -34.6037 -> 34°36'13.3"S
   */
  public static toDMS(coord: number, isLat: boolean): string {
    const abs = Math.abs(coord);
    const deg = Math.floor(abs);
    const minFull = (abs - deg) * 60;
    const min = Math.floor(minFull);
    const sec = ((minFull - min) * 60).toFixed(1);
    const dir = isLat ? (coord >= 0 ? 'N' : 'S') : coord >= 0 ? 'E' : 'W';
    return `${deg}°${min}'${sec}"${dir}`;
  }

  /**
   * Computes great-circle distance between two coordinates using Haversine formula in meters
   */
  public static haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
