import { describe, expect, it } from 'vitest';
import { getAgronomicSuggestion } from './agronomic-suggestion';

describe('agronomic suggestion (RF-22)', () => {
  it('suggests irrigation when moisture is below threshold', () => {
    expect(getAgronomicSuggestion(18, 25)).toBe(
      'Humedad bajo umbral: considerar riego.',
    );
  });

  it('returns null when moisture is at or above threshold', () => {
    expect(getAgronomicSuggestion(25, 25)).toBeNull();
    expect(getAgronomicSuggestion(40, 25)).toBeNull();
  });

  it('returns null when moisture is unavailable', () => {
    expect(getAgronomicSuggestion(null, 25)).toBeNull();
  });
});
