import { describe, expect, it } from 'vitest';

import { resolveOrganizationSelection, type Organization } from './organization-selection';

describe('resolveOrganizationSelection', () => {
  const orgA: Organization = { id: 'org-a', name: 'Estancia Didáctica Concordia' };
  const orgB: Organization = { id: 'org-b', name: 'Granja de Pruebas Aislada' };

  it('returns null when there are no available organizations', () => {
    expect(resolveOrganizationSelection([], null)).toBeNull();
    expect(resolveOrganizationSelection([], 'some-id')).toBeNull();
  });

  it('auto-selects the only organization when single org and no stored selection', () => {
    expect(resolveOrganizationSelection([orgA], null)).toBe('org-a');
  });

  it('returns stored selection if it exists in available organizations', () => {
    expect(resolveOrganizationSelection([orgA, orgB], 'org-b')).toBe('org-b');
    expect(resolveOrganizationSelection([orgA, orgB], 'org-a')).toBe('org-a');
  });

  it('falls back to null when multiple organizations exist and stored ID is not found', () => {
    expect(resolveOrganizationSelection([orgA, orgB], 'unrelated-id')).toBeNull();
    expect(resolveOrganizationSelection([orgA, orgB], null)).toBeNull();
  });
});
