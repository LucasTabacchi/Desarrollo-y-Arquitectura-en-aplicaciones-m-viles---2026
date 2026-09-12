export type Organization = { id: string; name: string };

export function resolveOrganizationSelection(
  organizations: Organization[],
  storedId: string | null,
): string | null {
  if (organizations.length === 0) return null;
  if (storedId && organizations.some((organization) => organization.id === storedId)) {
    return storedId;
  }
  return organizations.length === 1 ? organizations[0].id : null;
}
