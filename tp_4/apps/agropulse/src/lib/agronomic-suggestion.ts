/**
 * Simple agronomic suggestion based on a fixed rule:
 * if soil moisture is below the configured minimum threshold, suggest irrigation.
 * PRD §4.3 explicitly limits this to a single rule — no ML.
 */
export function getAgronomicSuggestion(
  moisture: number | null,
  thresholdMin: number,
): string | null {
  if (moisture === null) return null;
  if (moisture < thresholdMin)
    return 'Humedad bajo umbral: considerar riego.';
  return null;
}
