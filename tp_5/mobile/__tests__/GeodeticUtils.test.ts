import { GeodeticUtils } from '../src/utils/GeodeticUtils';

describe('GeodeticUtils', () => {
  describe('toDMS', () => {
    test('converts southern latitude coordinate correctly', () => {
      // Buenos Aires obelisk approx -34.6037
      const result = GeodeticUtils.toDMS(-34.6037, true);
      expect(result).toMatch(/34°36'13\.[0-9]"S/);
    });

    test('converts northern latitude coordinate correctly', () => {
      // New York approx 40.7128
      const result = GeodeticUtils.toDMS(40.7128, true);
      expect(result).toMatch(/40°42'46\.[0-9]"N/);
    });

    test('converts western longitude coordinate correctly', () => {
      // Buenos Aires approx -58.3816
      const result = GeodeticUtils.toDMS(-58.3816, false);
      expect(result).toMatch(/58°22'53\.[0-9]"W/);
    });

    test('converts eastern longitude coordinate correctly', () => {
      // Tokyo approx 139.6917
      const result = GeodeticUtils.toDMS(139.6917, false);
      expect(result).toMatch(/139°41'30\.[0-9]"E/);
    });

    test('handles zero coordinate gracefully', () => {
      expect(GeodeticUtils.toDMS(0, true)).toBe('0°0\'0.0"N');
      expect(GeodeticUtils.toDMS(0, false)).toBe('0°0\'0.0"E');
    });
  });

  describe('haversineDistanceMeters', () => {
    test('calculates 0 meters for identical points', () => {
      const dist = GeodeticUtils.haversineDistanceMeters(-34.6037, -58.3816, -34.6037, -58.3816);
      expect(dist).toBeCloseTo(0, 1);
    });

    test('calculates approximate distance between Buenos Aires and Cordoba (~647 km)', () => {
      // Buenos Aires (-34.6037, -58.3816) to Cordoba (-31.4201, -64.1888)
      const dist = GeodeticUtils.haversineDistanceMeters(-34.6037, -58.3816, -31.4201, -64.1888);
      // Distance is ~647,000 meters
      expect(dist).toBeGreaterThan(640000);
      expect(dist).toBeLessThan(660000);
    });
  });
});
