import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="plot/[id]" />
      <Stack.Screen name="confirm-command" options={{ presentation: 'modal' }} />
      <Stack.Screen name="manual-reading" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-plot" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
