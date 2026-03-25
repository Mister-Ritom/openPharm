import { Stack } from 'expo-router';
import { theme } from '../../src/theme/designSystem';

export default function LegalLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.colors.surface },
      headerTintColor: theme.colors.onSurface,
      headerTitleStyle: {
        fontFamily: theme.typography.fontFamily.headline,
        fontWeight: '700',
      },
      headerBackTitleVisible: false,
    }}>
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="tos" options={{ title: 'Terms of Service' }} />
    </Stack>
  );
}
