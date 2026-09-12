export type ThresholdValidation = {
  minimum: number | null;
  maximum: number | null;
  minimumError: string | null;
  maximumError: string | null;
  rangeError: string | null;
  valid: boolean;
};

function parsePercentage(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
}

export function validateThresholds(minimumInput: string, maximumInput: string): ThresholdValidation {
  const minimum = parsePercentage(minimumInput);
  const maximum = parsePercentage(maximumInput);
  const minimumError = minimum === null ? 'Enter a minimum between 0 and 100.' : null;
  const maximumError = maximum === null ? 'Enter a maximum between 0 and 100.' : null;
  const rangeError = minimum !== null && maximum !== null && minimum >= maximum
    ? 'Minimum must be lower than maximum.'
    : null;

  return { minimum, maximum, minimumError, maximumError, rangeError, valid: !minimumError && !maximumError && !rangeError };
}
