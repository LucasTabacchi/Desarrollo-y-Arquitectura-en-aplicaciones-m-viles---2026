import { describe, expect, it } from 'vitest';

import { validateThresholds } from './threshold-validation';

describe('threshold validation', () => {
  it('parses valid percentage values', () => {
    expect(validateThresholds('25', '45')).toEqual({
      minimum: 25,
      maximum: 45,
      minimumError: null,
      maximumError: null,
      rangeError: null,
      valid: true,
    });
  });

  it('rejects missing, non-numeric, and out-of-range values', () => {
    expect(validateThresholds('', '101')).toMatchObject({
      minimum: null,
      maximum: null,
      minimumError: 'Enter a minimum between 0 and 100.',
      maximumError: 'Enter a maximum between 0 and 100.',
      valid: false,
    });
  });

  it('requires the minimum to be strictly lower than the maximum', () => {
    expect(validateThresholds('45', '45')).toMatchObject({
      rangeError: 'Minimum must be lower than maximum.',
      valid: false,
    });
  });
});
