import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { getSetting, setSetting } from '@/db';
import { I18nProvider, type LanguagePreference } from '@/i18n';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [initialPreference] = useState<LanguagePreference>(() => {
    const value = getSetting('language');
    return value === 'en' || value === 'ms' ? value : 'auto';
  });

  return (
    <I18nProvider
      initialPreference={initialPreference}
      onPreferenceChange={(preference) => setSetting('language', preference)}
    >
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors[colorScheme === 'dark' ? 'dark' : 'light'].background },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="apps" />
          <Stack.Screen name="announcement" />
          <Stack.Screen name="capture/[id]" />
          <Stack.Screen name="parser-edit" />
          <Stack.Screen name="parser-create" />
          <Stack.Screen name="dev-capture" />
        </Stack>
      </ThemeProvider>
    </I18nProvider>
  );
}
