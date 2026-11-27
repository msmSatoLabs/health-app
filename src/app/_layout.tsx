import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../lib/auth';
import { loadThemePreference } from '../theme/appearance';
import { useTheme } from '../theme/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { c, isDark, font } = useTheme();
  const { loading } = useAuth();
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  // Load the saved light/dark choice before showing anything, so the app doesn't flash the wrong colors.
  const [themeLoaded, setThemeLoaded] = useState(false);
  useEffect(() => {
    loadThemePreference().finally(() => setThemeLoaded(true));
  }, []);
  const ready = fontsLoaded && !loading && themeLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.accent,
          headerTitleStyle: { fontFamily: font.bold, color: c.ink },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="community/[id]" options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="member/[id]" options={{ headerShown: true, title: '', headerBackTitle: 'Back' }} />
        <Stack.Screen name="join" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
