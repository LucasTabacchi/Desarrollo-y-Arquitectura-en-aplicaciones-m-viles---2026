import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import {
  resolveOrganizationSelection,
  type Organization,
} from '@/lib/organization-selection';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session-provider';

type OrganizationContextValue = {
  organizations: Organization[];
  selectedOrgId: string | null;
  selectedOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  selectOrganization: (id: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
};

const OrganizationContext = createContext<OrganizationContextValue | undefined>(
  undefined,
);

const storageKey = (userId: string) =>
  `agropulse.selected-organization.${userId}`;

export function OrganizationProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [session?.user?.id]);

  const loadOrganizations = useCallback(async () => {
    if (!session?.user?.id) {
      setOrganizations([]);
      setSelectedOrgId(null);
      setIsLoading(false);
      hasLoadedRef.current = false;
      return;
    }

    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const key = storageKey(session.user.id);
      const [storedId, result] = await Promise.all([
        AsyncStorage.getItem(key),
        supabase.from('organizations').select('id, name').order('name'),
      ]);

      if (result.error) {
        setError('No se pudieron cargar los establecimientos.');
        setIsLoading(false);
        return;
      }

      const available = (result.data ?? []) as Organization[];
      const resolved = resolveOrganizationSelection(available, storedId);

      setOrganizations(available);
      setSelectedOrgId(resolved);

      if (resolved && resolved !== storedId) {
        await AsyncStorage.setItem(key, resolved);
      }
    } catch {
      setError('Error al sincronizar los establecimientos.');
    } finally {
      setIsLoading(false);
      hasLoadedRef.current = true;
    }
  }, [session?.user?.id]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  // Realtime subscription for user membership changes
  useEffect(() => {
    if (!session?.user?.id) return;
    let active = true;
    const channel = supabase
      .channel(`memberships-org-sync-${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'memberships',
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          if (active) void loadOrganizations();
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [session?.user?.id, loadOrganizations]);

  const selectOrganization = useCallback(
    async (id: string) => {
      if (!session?.user?.id) return;
      if (!organizations.some((org) => org.id === id)) return;

      setSelectedOrgId(id);
      try {
        await AsyncStorage.setItem(storageKey(session.user.id), id);
      } catch (err) {
        console.warn('Failed to persist organization selection:', err);
      }
    },
    [session?.user?.id, organizations],
  );

  const selectedOrganization = useMemo(
    () => organizations.find((org) => org.id === selectedOrgId) ?? null,
    [organizations, selectedOrgId],
  );

  const value = useMemo(
    () => ({
      organizations,
      selectedOrgId,
      selectedOrganization,
      isLoading,
      error,
      selectOrganization,
      refreshOrganizations: loadOrganizations,
    }),
    [
      organizations,
      selectedOrgId,
      selectedOrganization,
      isLoading,
      error,
      selectOrganization,
      loadOrganizations,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider',
    );
  }
  return context;
}
