import { Redirect } from 'expo-router';

import { useSession } from '@/providers/session-provider';

export default function IndexRoute() {
  const { session, isLoading } = useSession();

  if (isLoading) return null;

  return <Redirect href={session ? ('/(app)' as any) : '/sign-in'} />;
}